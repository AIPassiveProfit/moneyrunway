'use client';

import { formatCents, formatWholeDollars } from '@/lib/calc/money';
import type { CalcResult, CalcStatus } from '@/lib/calc/types';

/**
 * The centerpiece. Everything else on the dashboard exists to support this
 * number, so it gets the biggest type on the screen and nothing competes.
 */

const STATUS: Record<
  CalcStatus,
  { label: string; note: string; text: string; wash: string; dot: string }
> = {
  green: {
    label: 'On track',
    note: 'You have room before your next payday.',
    text: 'text-mint-deep',
    wash: 'bg-mint-wash',
    dot: 'bg-mint-deep',
  },
  amber: {
    label: 'Tight but manageable',
    note: 'Everything is covered, but the cushion is thin.',
    text: 'text-amber-deep',
    wash: 'bg-amber-wash',
    dot: 'bg-amber-deep',
  },
  red: {
    label: 'Short before payday',
    note: "This is fixable, and it is better to know now.",
    text: 'text-clay-deep',
    wash: 'bg-clay-wash',
    dot: 'bg-clay-deep',
  },
};

export function SafeToSpendCard({
  result,
  onExplain,
}: {
  result: CalcResult;
  onExplain: () => void;
}) {
  const status = STATUS[result.status];
  const isNegative = result.safeToSpendTodayCents < 0;

  return (
    <section
      aria-labelledby="sts-heading"
      className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-line"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="sts-heading"
          className="text-[0.7rem] font-bold uppercase tracking-[0.15em] text-navy-faint"
        >
          Safe to spend today
        </h2>
        <span
          data-testid="safe-to-spend-status"
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wider ${status.wash} ${status.text}`}
        >
          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </div>

      <p
        data-testid="safe-to-spend-amount"
        className={`hero-number mt-3 text-[3.75rem] sm:text-7xl ${status.text}`}
      >
        {isNegative ? '−' : ''}
        {formatWholeDollars(Math.abs(result.safeToSpendTodayCents))}
      </p>

      <p className="mt-4 text-[0.95rem] leading-relaxed text-navy-soft">
        {isNegative
          ? 'Your upcoming obligations come to more than the money on hand. Nothing has gone wrong yet — there is still time to move things around.'
          : 'This is the amount you can spend without putting your upcoming obligations at risk.'}
      </p>

      <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[0.95rem]">
        <span className="text-navy-soft">
          {result.hasNextIncome ? 'Safe through payday:' : 'Safe over the next 30 days:'}
        </span>
        <strong data-testid="safe-to-spend-period" className="tnum font-bold">
          {formatCents(result.safeToSpendPeriodCents)}
        </strong>
      </div>

      <p className="mt-1 text-sm text-navy-faint">{status.note}</p>

      <button
        type="button"
        onClick={onExplain}
        data-testid="explain-button"
        className="mt-5 w-full rounded-2xl border border-line bg-cream px-4 py-3.5 text-[0.95rem] font-semibold text-navy transition hover:bg-cream-deep active:scale-[0.99]"
      >
        How is this calculated?
      </button>
    </section>
  );
}
