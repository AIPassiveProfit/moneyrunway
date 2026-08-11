/**
 * The twelve cases from docs/CALCULATIONS.md §8.
 *
 * These are the tests that matter most in the whole project. If the engine is
 * wrong, a real person overdrafts a real bank account. Every case below is a
 * situation Jasmine could actually be in.
 */

import { describe, expect, it } from 'vitest';

import { addDays } from './dates';
import { calculateSafeToSpend } from './safeToSpend';
import type { CalcInput, Envelope, IncomeEvent } from './types';

const TODAY = '2026-08-11';

function input(overrides: Partial<CalcInput> = {}): CalcInput {
  return {
    today: TODAY,
    cashCents: 0,
    savingsCents: 0,
    incomeEvents: [],
    billInstances: [],
    debtDues: [],
    sinkingFunds: [],
    envelopes: [],
    taxReserveBps: 0,
    countExpectedIncome: false,
    fundsLiveInChecking: true,
    horizonDays: 90,
    ...overrides,
  };
}

function payday(daysOut: number, amountCents = 200_000, status: IncomeEvent['status'] = 'scheduled'): IncomeEvent {
  return {
    id: `income-${daysOut}`,
    label: 'Paycheck',
    amountCents,
    date: addDays(TODAY, daysOut),
    status,
  };
}

function bill(name: string, amountCents: number, daysOut: number, isRequired = true) {
  return {
    id: `bill-${name}`,
    name,
    amountCents,
    dueDate: addDays(TODAY, daysOut),
    isRequired,
    isAutopay: false,
    status: 'unpaid' as const,
  };
}

function envelope(name: string, limitCents: number, spentCents: number, lengthDays = 7): Envelope {
  return {
    id: `env-${name}`,
    name,
    limitCents,
    spentCents,
    periodStart: TODAY,
    periodEnd: addDays(TODAY, lengthDays - 1),
  };
}

// ---------------------------------------------------------------------------

describe('Safe to Spend', () => {
  it('case 1 — clear runway: $1,000, no bills, payday in 10 days', () => {
    const r = calculateSafeToSpend(input({ cashCents: 100_000, incomeEvents: [payday(10)] }));

    expect(r.daysInWindow).toBe(10);
    expect(r.safeToSpendPeriodCents).toBe(100_000);
    expect(r.safeToSpendTodayCents).toBe(10_000); // $100/day
    expect(r.status).toBe('green');
    expect(r.shortfall).toBeNull();
  });

  it('case 2 — tight: a $900 bill eats most of a $1,000 balance', () => {
    const r = calculateSafeToSpend(
      input({ cashCents: 100_000, incomeEvents: [payday(10)], billInstances: [bill('Rent', 90_000, 3)] }),
    );

    expect(r.safeToSpendPeriodCents).toBe(10_000);
    expect(r.safeToSpendTodayCents).toBe(1_000); // $10/day
    expect(r.status).toBe('amber');
  });

  it('case 3 — shortfall: the bill is bigger than the balance', () => {
    const r = calculateSafeToSpend(
      input({ cashCents: 50_000, incomeEvents: [payday(10)], billInstances: [bill('Rent', 90_000, 3)] }),
    );

    expect(r.safeToSpendPeriodCents).toBe(-40_000);
    expect(r.status).toBe('red');
    expect(r.shortfall).not.toBeNull();
    expect(r.shortfall?.date).toBe(addDays(TODAY, 3));
    expect(r.shortfall?.amountCents).toBe(40_000);
  });

  it('case 4 — a sinking fund reserves its daily share, not the whole goal', () => {
    const r = calculateSafeToSpend(
      input({
        cashCents: 100_000,
        incomeEvents: [payday(10)],
        sinkingFunds: [
          {
            id: 'christmas',
            name: 'Christmas',
            goalCents: 60_000,
            currentCents: 0,
            targetDate: addDays(TODAY, 120),
          },
        ],
      }),
    );

    // $600 over 120 days = $5/day. Ten days in the window = $50 held back.
    expect(r.parts.sinkingReserveCents).toBe(5_000);
    expect(r.safeToSpendPeriodCents).toBe(95_000);
  });

  it('case 5 — uncertain income is excluded by default, included on request', () => {
    const invoice = payday(6, 150_000, 'expected');
    const withoutIt = calculateSafeToSpend(input({ cashCents: 40_000, incomeEvents: [invoice] }));
    const withIt = calculateSafeToSpend(
      input({ cashCents: 40_000, incomeEvents: [invoice], countExpectedIncome: true }),
    );

    expect(withoutIt.hasNextIncome).toBe(false);
    expect(withoutIt.daysInWindow).toBe(30); // the no-income fallback window

    expect(withIt.hasNextIncome).toBe(true);
    expect(withIt.daysInWindow).toBe(6);
  });

  it('case 6 — a payday landing today does not create a zero-day window', () => {
    const r = calculateSafeToSpend(
      input({ cashCents: 100_000, incomeEvents: [payday(0), payday(14)] }),
    );

    expect(r.daysInWindow).toBe(14);
    expect(Number.isFinite(r.safeToSpendTodayCents)).toBe(true);
  });

  it('case 7 — no future income falls back to a 30-day window', () => {
    const r = calculateSafeToSpend(input({ cashCents: 60_000 }));

    expect(r.hasNextIncome).toBe(false);
    expect(r.nextIncome).toBeNull();
    expect(r.daysInWindow).toBe(30);
    expect(r.safeToSpendTodayCents).toBe(2_000); // $600 / 30 days = $20/day
  });

  it('case 8 — an overspent envelope never hands money back', () => {
    const r = calculateSafeToSpend(
      input({
        cashCents: 100_000,
        incomeEvents: [payday(7)],
        envelopes: [envelope('Groceries', 20_000, 26_000)], // $60 over
      }),
    );

    expect(r.parts.essentialsCents).toBe(0);
    expect(r.safeToSpendPeriodCents).toBe(100_000);
  });

  it.todo('case 9 — a debt minimum that never covers interest reports NEVER (Phase 3)');

  it('case 10 — month ends and leap days are handled correctly', () => {
    // A monthly bill anchored on the 31st, and a leap day, and a DST weekend.
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-07', 2)).toBe('2026-03-09'); // US DST starts Mar 8, 2026
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');

    const r = calculateSafeToSpend(
      input({
        today: '2026-01-31',
        cashCents: 100_000,
        incomeEvents: [
          { id: 'i', label: 'Paycheck', amountCents: 200_000, date: '2026-02-14', status: 'scheduled' },
        ],
      }),
    );
    expect(r.daysInWindow).toBe(14);
  });

  it('case 11 — an empty account with nothing entered does not divide by zero', () => {
    const r = calculateSafeToSpend(input());

    expect(r.safeToSpendTodayCents).toBe(0);
    expect(r.safeToSpendPeriodCents).toBe(0);
    expect(r.status).toBe('green');
    expect(r.shortfall).toBeNull();
    expect(Number.isNaN(r.safeToSpendTodayCents)).toBe(false);
  });

  it('case 12 — a fund past its target date reserves the whole remainder', () => {
    const r = calculateSafeToSpend(
      input({
        cashCents: 100_000,
        incomeEvents: [payday(10)],
        sinkingFunds: [
          {
            id: 'insurance',
            name: 'Car insurance',
            goalCents: 42_000,
            currentCents: 12_000,
            targetDate: addDays(TODAY, -3), // the bill is already here
          },
        ],
      }),
    );

    expect(r.parts.sinkingReserveCents).toBe(30_000); // the full $300 shortfall
  });
});

// ---------------------------------------------------------------------------

describe('the details that protect people', () => {
  it('subtracts autopay bills, because that money leaves whether she remembers or not', () => {
    const autopay = { ...bill('Car payment', 41_500, 2), isAutopay: true };
    const r = calculateSafeToSpend(
      input({ cashCents: 100_000, incomeEvents: [payday(10)], billInstances: [autopay] }),
    );

    expect(r.parts.requiredBillsCents).toBe(41_500);
  });

  it('ignores bills already paid, and bills marked flexible', () => {
    const r = calculateSafeToSpend(
      input({
        cashCents: 100_000,
        incomeEvents: [payday(10)],
        billInstances: [
          { ...bill('Rent', 90_000, 3), status: 'paid' },
          bill('Streaming', 1_500, 4, false),
        ],
      }),
    );

    expect(r.parts.requiredBillsCents).toBe(0);
  });

  it('ignores bills falling after the next payday — they are next cycle’s problem', () => {
    const r = calculateSafeToSpend(
      input({
        cashCents: 100_000,
        incomeEvents: [payday(5)],
        billInstances: [bill('Internet', 7_900, 9)],
      }),
    );

    expect(r.parts.requiredBillsCents).toBe(0);
    expect(r.upcoming.billsBeforeIncome).toHaveLength(0);
  });

  it('rounds the daily number DOWN, never up', () => {
    // $100.99 across 10 days is $10.099/day. We say $10, not $11.
    const r = calculateSafeToSpend(input({ cashCents: 10_099, incomeEvents: [payday(10)] }));
    expect(r.safeToSpendTodayCents).toBe(1_000);
  });

  it('builds a breakdown whose subtractions reconcile to the total', () => {
    const r = calculateSafeToSpend(
      input({
        cashCents: 84_000,
        incomeEvents: [payday(4)],
        billInstances: [bill('Car payment', 41_500, 1)],
        debtDues: [{ id: 'visa', name: 'Visa', minPaymentCents: 3_500, dueDate: addDays(TODAY, 3) }],
        envelopes: [envelope('Groceries', 17_500, 0)],
      }),
    );

    const summed = r.breakdown
      .filter((line) => line.kind !== 'total')
      .reduce((total, line) => total + line.amountCents, 0);

    expect(summed).toBe(r.safeToSpendPeriodCents);
  });

  it('sets aside taxes on business income that has already landed', () => {
    const r = calculateSafeToSpend(
      input({
        cashCents: 200_000,
        incomeEvents: [
          { id: 'b1', label: 'Brand deal', amountCents: 100_000, date: addDays(TODAY, -2), status: 'received', isBusiness: true },
          payday(10),
        ],
        taxReserveBps: 2_500,
      }),
    );

    expect(r.parts.taxReserveCents).toBe(25_000); // 25% of $1,000
  });

  it('does not reserve tax twice on the same payment', () => {
    const r = calculateSafeToSpend(
      input({
        cashCents: 200_000,
        incomeEvents: [
          {
            id: 'b1', label: 'Brand deal', amountCents: 100_000, date: addDays(TODAY, -2),
            status: 'received', isBusiness: true, taxReservedCents: 25_000,
          },
        ],
        taxReserveBps: 2_500,
      }),
    );

    expect(r.parts.taxReserveCents).toBe(0);
  });

  it('reports no runway end date when the money lasts the whole horizon', () => {
    const r = calculateSafeToSpend(
      input({
        cashCents: 500_000,
        incomeEvents: [payday(10), payday(24)],
        horizonDays: 30,
      }),
    );

    expect(r.shortfall).toBeNull();
    expect(r.runwayEndDate).toBeNull();
  });

  it('reports the day the money runs out, not a later recovery', () => {
    // The balance dips under on day 3, then a big paycheck on day 5 fixes it.
    // The honest answer is "day 2", not "some date in November".
    const r = calculateSafeToSpend(
      input({
        cashCents: 30_000,
        incomeEvents: [payday(5, 500_000)],
        billInstances: [bill('Rent', 40_000, 3)],
        horizonDays: 60,
      }),
    );

    expect(r.shortfall?.date).toBe(addDays(TODAY, 3));
    expect(r.runwayEndDate).toBe(addDays(TODAY, 2));
  });

  it('finds the day the money runs out', () => {
    const r = calculateSafeToSpend(
      input({
        cashCents: 20_000,
        envelopes: [envelope('Groceries', 14_000, 0)], // $20/day burn
        horizonDays: 30,
      }),
    );

    // $200 at $20/day is gone at the end of day 10 (offset 9 is the last day at zero).
    expect(r.runwayEndDate).toBe(addDays(TODAY, 9));
    expect(r.shortfall?.date).toBe(addDays(TODAY, 10));
  });
});
