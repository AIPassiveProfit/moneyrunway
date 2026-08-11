/**
 * The Next Best Action engine.
 *
 * One card. One action. Never a list of chores.
 *
 * The full ten-rule table lives in docs/PRD.md §7.4. Phase 0 implements the
 * seven rules that only need data we already have on screen; the remaining
 * three need the weekly check-in and the subscription audit, which arrive in
 * later phases.
 *
 * Tone rule, and it is not negotiable: red is never a scolding. Every message
 * names the next move, not the mistake.
 */

import { daysBetween, formatShortDate, relativeDays } from './dates';
import { formatCents, formatWholeDollars } from './money';
import type { CalcInput, CalcResult } from './types';

export type NextAction = {
  id: string;
  tone: 'calm' | 'caution' | 'urgent';
  headline: string;
  detail: string;
  /** What the button says. Phase 0 buttons open the relevant edit sheet. */
  actionLabel: string;
  /** The id of the thing the button should open, when there is one. */
  targetId?: string;
};

export function chooseNextAction(input: CalcInput, result: CalcResult): NextAction {
  const { today } = input;

  // Rule 1 — a shortfall lands before the next paycheck does. Nothing outranks
  // this: there is no incoming money to fix it, so a decision has to be made.
  const shortfallBeforePayday =
    result.shortfall !== null &&
    daysBetween(today, result.shortfall.date) <= result.daysInWindow;

  if (result.shortfall && shortfallBeforePayday) {
    return {
      id: 'shortfall',
      tone: 'urgent',
      headline: `You're projected to be ${formatWholeDollars(result.shortfall.amountCents)} short before ${formatShortDate(result.shortfall.date)}.`,
      detail:
        'Two things usually close a gap this size: trim a flexible spending limit for the week, or move one bill to just after payday. Neither is a failure — it is just timing.',
      actionLabel: 'See what to adjust',
    };
  }

  // Rule 2 — a required bill lands before there is money to cover it.
  for (const bill of result.upcoming.billsBeforeIncome) {
    const daysAway = daysBetween(today, bill.dueDate);
    if (daysAway <= 3 && input.cashCents < bill.amountCents) {
      return {
        id: `bill-uncovered-${bill.id}`,
        tone: 'urgent',
        headline: `${bill.name} is due ${relativeDays(today, bill.dueDate)} and you're ${formatWholeDollars(bill.amountCents - input.cashCents)} short.`,
        detail: `${formatCents(bill.amountCents)} is due on ${formatShortDate(bill.dueDate)}, and there is ${formatCents(input.cashCents)} in checking right now.`,
        actionLabel: 'Open this bill',
        targetId: bill.id,
      };
    }
  }

  // Rule 3 — a required bill is close and nobody is going to pay it automatically.
  for (const bill of result.upcoming.billsBeforeIncome) {
    if (bill.isAutopay) continue;
    if (daysBetween(today, bill.dueDate) <= 5) {
      return {
        id: `set-aside-${bill.id}`,
        tone: 'caution',
        headline: `Set aside ${formatWholeDollars(bill.amountCents)} for ${bill.name.toLowerCase()}.`,
        detail: `It's due ${relativeDays(today, bill.dueDate)}, on ${formatShortDate(bill.dueDate)}, and it isn't on autopay.`,
        actionLabel: 'Open this bill',
        targetId: bill.id,
      };
    }
  }

  // Rule 3b — a shortfall further out, after the next paycheck. Not urgent, but
  // seeing it three weeks early is the whole reason this app exists.
  if (result.shortfall) {
    return {
      id: 'shortfall-later',
      tone: 'caution',
      headline: `Heads up: things get tight around ${formatShortDate(result.shortfall.date)}.`,
      detail: `After your next payday, the bills in that stretch run about ${formatWholeDollars(result.shortfall.amountCents)} past what will be left. Small moves now are easier than big ones later.`,
      actionLabel: 'See what to adjust',
    };
  }

  // Rule 6 — a sinking fund has slipped behind its own deadline.
  for (const fund of input.sinkingFunds) {
    if (fund.isPaused) continue;
    const remaining = fund.goalCents - fund.currentCents;
    if (remaining <= 0 || fund.targetDate === null) continue;
    if (daysBetween(today, fund.targetDate) <= 0) {
      return {
        id: `fund-late-${fund.id}`,
        tone: 'caution',
        headline: `Your ${fund.name.toLowerCase()} fund is ${formatWholeDollars(remaining)} short of its target.`,
        detail: 'The date has arrived. You can move the target out, lower the goal, or add to it — all three are fine.',
        actionLabel: 'Open this fund',
        targetId: fund.id,
      };
    }
  }

  // Rule 7 — an envelope is nearly spent with days still to go.
  for (const env of input.envelopes) {
    const daysLeft = daysBetween(today, env.periodEnd) + 1;
    const remaining = env.limitCents - env.spentCents;
    if (daysLeft < 3) continue;
    if (env.limitCents > 0 && remaining > 0 && env.spentCents / env.limitCents >= 0.8) {
      return {
        id: `envelope-${env.id}`,
        tone: 'caution',
        headline: `Your ${env.name.toLowerCase()} budget has ${formatCents(remaining)} left for ${daysLeft} days.`,
        detail: 'Worth knowing now rather than on Saturday at the register.',
        actionLabel: 'Open this budget',
        targetId: env.id,
      };
    }
  }

  // Rule 4 — nothing is wrong, but the balance is the input everything rests on.
  if (result.upcoming.billsBeforeIncome.length === 0 && result.hasNextIncome) {
    return {
      id: 'confirm-balance',
      tone: 'calm',
      headline: `Quick check: is your balance still ${formatCents(input.cashCents)}?`,
      detail: 'Every number on this screen is built on that one. Ten seconds in your banking app keeps it honest.',
      actionLabel: 'Update my balance',
      targetId: 'cash',
    };
  }

  // Rule 10 — the fallback. Everything is healthy, so just say what is next.
  const nextBill = result.upcoming.billsBeforeIncome[0];
  if (nextBill) {
    return {
      id: 'on-track',
      tone: 'calm',
      headline: "You're on track.",
      detail: `Your next bill is ${nextBill.name.toLowerCase()}, ${formatCents(nextBill.amountCents)}, on ${formatShortDate(nextBill.dueDate)}.`,
      actionLabel: 'See upcoming money',
    };
  }

  return {
    id: 'all-clear',
    tone: 'calm',
    headline: "You're on track.",
    detail: 'Nothing needs your attention today. That is worth noticing.',
    actionLabel: 'Update my balance',
    targetId: 'cash',
  };
}
