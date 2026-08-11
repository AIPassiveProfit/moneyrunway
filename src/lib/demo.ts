/**
 * The demo household.
 *
 * This is Jasmine from the ICP: 34, works full time, partner also works, two
 * kids, take-home about $3,990 a month. Decent income on paper, and $840 in
 * checking four days before payday with a car payment about to hit.
 *
 * Everything is built relative to `today` so the demo is always live — the
 * bills are always genuinely coming up, never stale dates from last year.
 *
 * Phase 0 keeps this in memory. Refreshing the page resets it, on purpose:
 * the job of Phase 0 is to prove the number feels right in your hand.
 */

import { addDays } from './calc/dates';
import type { CalcInput, ISODate } from './calc/types';

export type Scenario = CalcInput & {
  /** Bills after the next payday. Shown on the timeline, not subtracted today. */
  label: string;
};

export function todayISO(): ISODate {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function buildDemoScenario(today: ISODate = todayISO()): Scenario {
  const d = (n: number) => addDays(today, n);

  return {
    label: 'Sample household',
    today,

    cashCents: 84_000, //   $840.00 in checking
    savingsCents: 31_000, // $310.00 in savings, which we never count as spendable

    incomeEvents: [
      { id: 'pay-1', label: 'Paycheck', amountCents: 184_000, date: d(4), status: 'scheduled' },
      { id: 'pay-2', label: 'Paycheck', amountCents: 184_000, date: d(18), status: 'scheduled' },
      { id: 'pay-3', label: 'Paycheck', amountCents: 184_000, date: d(32), status: 'scheduled' },
      { id: 'pay-4', label: 'Paycheck', amountCents: 184_000, date: d(46), status: 'scheduled' },
      { id: 'pay-5', label: 'Paycheck', amountCents: 184_000, date: d(60), status: 'scheduled' },
      { id: 'pay-6', label: 'Paycheck', amountCents: 184_000, date: d(74), status: 'scheduled' },
      { id: 'pay-7', label: 'Paycheck', amountCents: 184_000, date: d(88), status: 'scheduled' },
    ],

    billInstances: [
      // Before the next payday — these are what squeeze the number today.
      { id: 'car', name: 'Car payment', amountCents: 41_500, dueDate: d(1), isRequired: true, isAutopay: true, status: 'unpaid', category: 'transport' },
      { id: 'electric', name: 'Electric', amountCents: 14_200, dueDate: d(2), isRequired: true, isAutopay: false, status: 'unpaid', category: 'utilities' },
      { id: 'water', name: 'Water', amountCents: 4_800, dueDate: d(3), isRequired: true, isAutopay: false, status: 'unpaid', category: 'utilities' },

      // After the next payday — real, and on the timeline, but next cycle's problem.
      { id: 'phone', name: 'Phone', amountCents: 8_900, dueDate: d(7), isRequired: true, isAutopay: true, status: 'unpaid', category: 'utilities' },
      { id: 'rent', name: 'Rent', amountCents: 145_000, dueDate: d(9), isRequired: true, isAutopay: false, status: 'unpaid', category: 'housing' },
      { id: 'internet', name: 'Internet', amountCents: 7_900, dueDate: d(12), isRequired: true, isAutopay: true, status: 'unpaid', category: 'utilities' },
      { id: 'insurance', name: 'Car insurance', amountCents: 12_800, dueDate: d(16), isRequired: true, isAutopay: false, status: 'unpaid', category: 'insurance' },
      { id: 'streaming', name: 'Streaming bundle', amountCents: 3_200, dueDate: d(14), isRequired: false, isAutopay: true, status: 'unpaid', category: 'subscription' },
      { id: 'car-2', name: 'Car payment', amountCents: 41_500, dueDate: d(32), isRequired: true, isAutopay: true, status: 'unpaid', category: 'transport' },
      { id: 'rent-2', name: 'Rent', amountCents: 145_000, dueDate: d(40), isRequired: true, isAutopay: false, status: 'unpaid', category: 'housing' },
    ],

    debtDues: [
      { id: 'visa', name: 'Visa', minPaymentCents: 3_500, dueDate: d(3) },
      { id: 'visa-2', name: 'Visa', minPaymentCents: 3_500, dueDate: d(33) },
    ],

    sinkingFunds: [
      { id: 'car-repair', name: 'Car repairs', goalCents: 80_000, currentCents: 22_000, targetDate: d(180) },
    ],

    envelopes: [
      { id: 'groceries', name: 'Groceries', limitCents: 17_500, spentCents: 4_200, periodStart: d(-2), periodEnd: d(4) },
      { id: 'gas', name: 'Gas', limitCents: 6_000, spentCents: 1_500, periodStart: d(-2), periodEnd: d(4) },
      { id: 'eating-out', name: 'Eating out', limitCents: 4_000, spentCents: 2_800, periodStart: d(-2), periodEnd: d(4) },
    ],

    taxReserveBps: 0,
    countExpectedIncome: false,
    fundsLiveInChecking: true,
    horizonDays: 90,
  };
}
