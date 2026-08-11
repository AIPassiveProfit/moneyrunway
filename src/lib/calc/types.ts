/**
 * Types for the Money Runway calculation engine.
 *
 * Two rules govern everything in this folder:
 *
 *   1. All money is an INTEGER NUMBER OF CENTS. Never a float, never dollars.
 *      $14.50 is `1450`. Floats lose money: 0.1 + 0.2 !== 0.3 in JavaScript.
 *
 *   2. All dates are calendar dates as "YYYY-MM-DD" strings in the user's own
 *      timezone. A bill due "Aug 15" is due on Aug 15 in her town, not at some
 *      UTC instant. `today` is an INPUT, never read from the system clock, so
 *      every calculation is reproducible and testable.
 */

/** A calendar date, "YYYY-MM-DD", in the user's local timezone. */
export type ISODate = string;

/** Integer cents. Always. */
export type Cents = number;

export type IncomeStatus =
  /** A reliable paycheck from a job. Counts toward the runway. */
  | 'scheduled'
  /** An invoice or payout that may or may not land. Excluded unless the user opts in. */
  | 'expected'
  /** Already landed and already sitting in the account balance. */
  | 'received';

export type IncomeEvent = {
  id: string;
  label: string;
  amountCents: Cents;
  date: ISODate;
  status: IncomeStatus;
  /** Business income, for the Creator Mode tax reserve. */
  isBusiness?: boolean;
  /** Tax already set aside from this payment, so we never reserve twice. */
  taxReservedCents?: Cents;
};

export type BillInstance = {
  id: string;
  name: string;
  amountCents: Cents;
  dueDate: ISODate;
  /** Required bills reduce Safe to Spend. Flexible bills are shown but reducible. */
  isRequired: boolean;
  isAutopay: boolean;
  status: 'unpaid' | 'paid' | 'skipped';
  category?: string;
};

export type DebtDue = {
  id: string;
  name: string;
  /** The minimum only. Extra payments are a choice, not an obligation. */
  minPaymentCents: Cents;
  dueDate: ISODate;
};

export type SinkingFund = {
  id: string;
  name: string;
  goalCents: Cents;
  currentCents: Cents;
  /** Null means "no deadline" — we then use `contributionCents` if set. */
  targetDate: ISODate | null;
  /** Optional user override of the computed contribution, per month. */
  contributionCents?: Cents;
  isPaused?: boolean;
};

export type Envelope = {
  id: string;
  name: string;
  limitCents: Cents;
  spentCents: Cents;
  /** Inclusive first and last day of the current envelope period. */
  periodStart: ISODate;
  periodEnd: ISODate;
};

export type CalcInput = {
  today: ISODate;
  /** Checking / spendable cash. Savings is tracked separately and never spent. */
  cashCents: Cents;
  savingsCents: Cents;
  incomeEvents: IncomeEvent[];
  billInstances: BillInstance[];
  debtDues: DebtDue[];
  sinkingFunds: SinkingFund[];
  envelopes: Envelope[];
  /** Creator Mode tax reserve, in basis points. 2500 = 25%. 0 = off. */
  taxReserveBps: number;
  /** Count uncertain 'expected' income toward the runway? Defaults to false, on purpose. */
  countExpectedIncome: boolean;
  /** Do sinking fund balances sit inside the checking balance? Usually yes. */
  fundsLiveInChecking: boolean;
  /** How far ahead the runway projection looks. Default 90 days. */
  horizonDays: number;
};

export type BreakdownKind =
  | 'cash'
  | 'bill'
  | 'debt'
  | 'sinking'
  | 'envelope'
  | 'tax'
  | 'total';

/** One line of the "How is this calculated?" trail. Generated, never hand-written. */
export type BreakdownLine = {
  label: string;
  detail?: string;
  amountCents: Cents;
  kind: BreakdownKind;
  refId?: string;
};

export type TimelineEvent = {
  kind: 'income' | 'bill' | 'debt';
  label: string;
  amountCents: Cents;
};

export type TimelinePoint = {
  date: ISODate;
  balanceCents: Cents;
  events: TimelineEvent[];
};

export type CalcStatus = 'green' | 'amber' | 'red';

export type CalcResult = {
  /** The hero number. Whole dollars, rounded down. */
  safeToSpendTodayCents: Cents;
  /** The same money, expressed for the whole stretch until the next payday. */
  safeToSpendPeriodCents: Cents;
  status: CalcStatus;

  nextIncome: IncomeEvent | null;
  /** Days from today up to (not including) the next payday. Always >= 1. */
  daysInWindow: number;
  /** False when the user has not told us about any future income yet. */
  hasNextIncome: boolean;

  /** The last day the projected balance is still at or above zero. */
  runwayEndDate: ISODate | null;
  shortfall: { date: ISODate; amountCents: Cents } | null;
  timeline: TimelinePoint[];

  /** Card 4: Upcoming Money. */
  upcoming: {
    billsBeforeIncome: BillInstance[];
    debtsBeforeIncome: DebtDue[];
    totalRequiredCents: Cents;
    remainingAfterRequiredCents: Cents;
  };

  breakdown: BreakdownLine[];

  /** Component totals, kept for tests and for the explainer screen. */
  parts: {
    cashCents: Cents;
    requiredBillsCents: Cents;
    debtMinimumsCents: Cents;
    sinkingReserveCents: Cents;
    taxReserveCents: Cents;
    essentialsCents: Cents;
  };
};
