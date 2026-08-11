/**
 * The Safe to Spend engine.
 *
 * This is the heart of Money Runway and the one file where we are allowed to be
 * slow and careful. An app that says "$200 is safe" when the truth is $20 causes
 * a real overdraft fee for a real person who cannot afford it.
 *
 * It is a PURE FUNCTION: plain object in, plain object out. It never touches a
 * database, never reads the system clock, never throws on ordinary input, and
 * never returns Infinity or NaN. That is what makes it testable.
 *
 * The full written spec lives in docs/CALCULATIONS.md. The steps below are
 * numbered to match it.
 */

import { addDays, daysBetween, formatShortDate, isInWindow } from './dates';
import { applyBps, ceilCents, floorToDollarCents, toCents } from './money';
import type {
  BillInstance,
  BreakdownLine,
  CalcInput,
  CalcResult,
  CalcStatus,
  Cents,
  Envelope,
  IncomeEvent,
  ISODate,
  SinkingFund,
  TimelineEvent,
  TimelinePoint,
} from './types';

export const ENGINE_VERSION = '0.1.0';

/** Used when the user has not told us about any future income yet. */
const FALLBACK_WINDOW_DAYS = 30;
const DEFAULT_HORIZON_DAYS = 90;

// ---------------------------------------------------------------------------
// Small shared pieces
// ---------------------------------------------------------------------------

function countsTowardRunway(income: IncomeEvent, countExpected: boolean): boolean {
  if (income.status === 'received') return false; // already sitting in the balance
  if (income.status === 'scheduled') return true;
  return countExpected; // 'expected' is uncertain, off by default
}

/**
 * The next payday. Strictly after today: money landing today is assumed to be
 * in the balance already, and a zero-day window would divide by zero.
 */
function findNextIncome(input: CalcInput): IncomeEvent | null {
  const future = input.incomeEvents
    .filter((e) => daysBetween(input.today, e.date) > 0)
    .filter((e) => countsTowardRunway(e, input.countExpectedIncome))
    .sort((a, b) => daysBetween(b.date, a.date));
  return future[0] ?? null;
}

function billCountsAgainstUs(bill: BillInstance): boolean {
  // Autopay bills count too. The money leaves whether she remembers or not.
  return bill.isRequired && bill.status === 'unpaid';
}

/**
 * Step 5 — sinking funds are reserved by ACCRUAL, not as a lump sum.
 * Christmas is $600 four months out; we hold back this window's share, not $600.
 */
function fundDailyAccrualCents(fund: SinkingFund, today: ISODate): number {
  if (fund.isPaused) return 0;
  const remaining = fund.goalCents - fund.currentCents;
  if (remaining <= 0) return 0;

  if (fund.targetDate === null) {
    // No deadline: fall back to the user's chosen monthly contribution.
    return (fund.contributionCents ?? 0) / 30;
  }

  const daysToTarget = daysBetween(today, fund.targetDate);
  if (daysToTarget <= 0) {
    // The target date has passed and the fund is short. Reserve it all, and let
    // the Next Best Action engine raise it rather than swallowing it silently.
    return remaining;
  }
  return remaining / daysToTarget;
}

/**
 * Step 7 — how much of the essentials budget is still needed inside the window.
 * This is what stops the app saying "$400 is free" on a Monday when groceries
 * and gas still have to happen before Friday.
 */
function envelopeNeedInWindow(env: Envelope, today: ISODate, windowDays: number): Cents {
  const remainingInPeriod = Math.max(0, env.limitCents - env.spentCents);
  const daysLeftInPeriod = Math.max(1, daysBetween(today, env.periodEnd) + 1);
  const periodLength = Math.max(1, daysBetween(env.periodStart, env.periodEnd) + 1);

  const daysCounted = Math.min(windowDays, daysLeftInPeriod);
  let need = (remainingInPeriod / daysLeftInPeriod) * daysCounted;

  // If the window runs past the end of this envelope period, add a prorated
  // share of the next period(s) at the full limit.
  const spillDays = windowDays - daysCounted;
  if (spillDays > 0) {
    need += (env.limitCents / periodLength) * spillDays;
  }

  return toCents(need);
}

function envelopeDailyBurnCents(env: Envelope): number {
  const periodLength = Math.max(1, daysBetween(env.periodStart, env.periodEnd) + 1);
  return env.limitCents / periodLength;
}

// ---------------------------------------------------------------------------
// The main entry point
// ---------------------------------------------------------------------------

export function calculateSafeToSpend(input: CalcInput): CalcResult {
  const { today } = input;
  const horizonDays = input.horizonDays > 0 ? input.horizonDays : DEFAULT_HORIZON_DAYS;

  // --- Step 1: find the window -------------------------------------------
  const nextIncome = findNextIncome(input);
  const hasNextIncome = nextIncome !== null;
  const windowEnd = nextIncome ? nextIncome.date : addDays(today, FALLBACK_WINDOW_DAYS);
  const daysInWindow = Math.max(1, daysBetween(today, windowEnd));

  const breakdown: BreakdownLine[] = [];

  // --- Step 2: start with what is actually available ----------------------
  const cashCents = input.cashCents;
  breakdown.push({
    label: 'In checking',
    amountCents: cashCents,
    kind: 'cash',
  });

  // --- Step 3: required bills inside the window ---------------------------
  const billsBeforeIncome = input.billInstances
    .filter((b) => billCountsAgainstUs(b) && isInWindow(b.dueDate, today, windowEnd))
    .sort((a, b) => daysBetween(b.dueDate, a.dueDate));

  let requiredBillsCents = 0;
  for (const bill of billsBeforeIncome) {
    requiredBillsCents += bill.amountCents;
    breakdown.push({
      label: bill.name,
      detail: `due ${formatShortDate(bill.dueDate)}${bill.isAutopay ? ' · autopay' : ''}`,
      amountCents: -bill.amountCents,
      kind: 'bill',
      refId: bill.id,
    });
  }

  // --- Step 4: debt minimums inside the window ----------------------------
  const debtsBeforeIncome = input.debtDues
    .filter((d) => isInWindow(d.dueDate, today, windowEnd))
    .sort((a, b) => daysBetween(b.dueDate, a.dueDate));

  let debtMinimumsCents = 0;
  for (const debt of debtsBeforeIncome) {
    debtMinimumsCents += debt.minPaymentCents;
    breakdown.push({
      label: `${debt.name} minimum`,
      detail: `due ${formatShortDate(debt.dueDate)}`,
      amountCents: -debt.minPaymentCents,
      kind: 'debt',
      refId: debt.id,
    });
  }

  // --- Step 5: reserve sinking funds by accrual ---------------------------
  let sinkingReserveCents = 0;
  for (const fund of input.sinkingFunds) {
    const daily = fundDailyAccrualCents(fund, today);
    if (daily <= 0) continue;
    const reserve = ceilCents(Math.min(daily * daysInWindow, fund.goalCents - fund.currentCents));
    if (reserve <= 0) continue;
    sinkingReserveCents += reserve;
    breakdown.push({
      label: fund.name,
      detail: `set aside for ${daysInWindow} ${daysInWindow === 1 ? 'day' : 'days'}`,
      amountCents: -reserve,
      kind: 'sinking',
      refId: fund.id,
    });
  }

  // --- Step 6: tax reserve on business income already received ------------
  // Savings is NOT subtracted here: it comes out of the next paycheck in the
  // Payday Plan, and taking it from today's cash too would double-count it.
  let taxReserveCents = 0;
  if (input.taxReserveBps > 0) {
    for (const income of input.incomeEvents) {
      if (income.status !== 'received' || !income.isBusiness) continue;
      const owed = applyBps(income.amountCents, input.taxReserveBps);
      const outstanding = Math.max(0, owed - (income.taxReservedCents ?? 0));
      taxReserveCents += outstanding;
    }
    if (taxReserveCents > 0) {
      breakdown.push({
        label: 'Set aside for taxes',
        detail: `${(input.taxReserveBps / 100).toFixed(0)}% of business income received`,
        amountCents: -taxReserveCents,
        kind: 'tax',
      });
    }
  }

  // --- Step 7: essentials still needed before payday ----------------------
  let essentialsCents = 0;
  for (const env of input.envelopes) {
    const need = envelopeNeedInWindow(env, today, daysInWindow);
    if (need <= 0) continue;
    essentialsCents += need;
    breakdown.push({
      label: env.name,
      detail: `next ${daysInWindow} ${daysInWindow === 1 ? 'day' : 'days'}`,
      amountCents: -need,
      kind: 'envelope',
      refId: env.id,
    });
  }

  // --- Step 8: the answer -------------------------------------------------
  const safeToSpendPeriodCents =
    cashCents -
    requiredBillsCents -
    debtMinimumsCents -
    sinkingReserveCents -
    taxReserveCents -
    essentialsCents;

  const safeToSpendTodayCents = floorToDollarCents(safeToSpendPeriodCents / daysInWindow);

  breakdown.push({
    label: hasNextIncome ? 'Safe to spend before payday' : 'Safe to spend this month',
    amountCents: safeToSpendPeriodCents,
    kind: 'total',
  });

  // --- Step 9: status color ------------------------------------------------
  const status = statusFor(safeToSpendPeriodCents, requiredBillsCents + essentialsCents);

  // --- The runway projection ----------------------------------------------
  const { timeline, shortfall, runwayEndDate } = projectRunway(input, horizonDays);

  const totalRequiredCents = requiredBillsCents + debtMinimumsCents;

  return {
    safeToSpendTodayCents,
    safeToSpendPeriodCents,
    status,
    nextIncome,
    daysInWindow,
    hasNextIncome,
    runwayEndDate,
    shortfall,
    timeline,
    upcoming: {
      billsBeforeIncome,
      debtsBeforeIncome,
      totalRequiredCents,
      remainingAfterRequiredCents: cashCents - totalRequiredCents,
    },
    breakdown,
    parts: {
      cashCents,
      requiredBillsCents,
      debtMinimumsCents,
      sinkingReserveCents,
      taxReserveCents,
      essentialsCents,
    },
  };
}

/**
 * Amber is the honest middle: the money covers everything, but the cushion is
 * thin enough that one surprise breaks it. Below 15% of what is already owed
 * counts as thin. Amber says "tight but manageable", never "you failed".
 */
const AMBER_BUFFER_RATIO = 0.15;

function statusFor(periodCents: Cents, obligationsCents: Cents): CalcStatus {
  if (periodCents < 0) return 'red';
  if (periodCents < obligationsCents * AMBER_BUFFER_RATIO) return 'amber';
  return 'green';
}

// ---------------------------------------------------------------------------
// The runway: a day-by-day simulation
// ---------------------------------------------------------------------------

function projectRunway(
  input: CalcInput,
  horizonDays: number,
): {
  timeline: TimelinePoint[];
  shortfall: { date: ISODate; amountCents: Cents } | null;
  runwayEndDate: ISODate | null;
} {
  const dailyEssentials = input.envelopes.reduce((sum, e) => sum + envelopeDailyBurnCents(e), 0);
  const dailySinking = input.fundsLiveInChecking
    ? input.sinkingFunds.reduce((sum, f) => sum + fundDailyAccrualCents(f, input.today), 0)
    : 0;

  const incomeByDate = groupBy(
    input.incomeEvents.filter((e) => countsTowardRunway(e, input.countExpectedIncome)),
    (e) => e.date,
  );
  const billsByDate = groupBy(input.billInstances.filter(billCountsAgainstUs), (b) => b.dueDate);
  const debtsByDate = groupBy(input.debtDues, (d) => d.dueDate);

  let balance = input.cashCents;
  let lastNonNegativeDate: ISODate | null = null;
  let shortfall: { date: ISODate; amountCents: Cents } | null = null;
  const timeline: TimelinePoint[] = [];

  for (let offset = 0; offset <= horizonDays; offset++) {
    const date = addDays(input.today, offset);
    const events: TimelineEvent[] = [];

    for (const income of incomeByDate.get(date) ?? []) {
      balance += income.amountCents;
      events.push({ kind: 'income', label: income.label, amountCents: income.amountCents });
    }
    for (const bill of billsByDate.get(date) ?? []) {
      balance -= bill.amountCents;
      events.push({ kind: 'bill', label: bill.name, amountCents: -bill.amountCents });
    }
    for (const debt of debtsByDate.get(date) ?? []) {
      balance -= debt.minPaymentCents;
      events.push({ kind: 'debt', label: `${debt.name} minimum`, amountCents: -debt.minPaymentCents });
    }

    // Everyday spending leaks out continuously, so we burn it daily rather
    // than pretending it all happens on one convenient date.
    balance -= toCents(dailyEssentials);
    balance -= toCents(dailySinking);

    timeline.push({ date, balanceCents: balance, events });

    if (shortfall === null) {
      // Only track this up to the FIRST time the balance goes under. Later
      // paychecks push it positive again, and "lasts until November" would be a
      // lie when the money actually runs out three weeks from now.
      if (balance >= 0) {
        lastNonNegativeDate = date;
      } else {
        shortfall = { date, amountCents: -balance };
      }
    }
  }

  // If the money never runs out inside the horizon, there is no "runs out" date
  // to show — the card says "lasts past your next payday" instead.
  const runwayEndDate = shortfall === null ? null : lastNonNegativeDate;

  return { timeline, shortfall, runwayEndDate };
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const bucket = map.get(k);
    if (bucket) bucket.push(item);
    else map.set(k, [item]);
  }
  return map;
}
