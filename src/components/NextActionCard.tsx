'use client';

import type { NextAction } from '@/lib/calc/nextAction';

const TONE = {
  calm: { ring: 'ring-line', bar: 'bg-mint-deep', chip: 'bg-mint-wash text-mint-deep' },
  caution: { ring: 'ring-amber/60', bar: 'bg-amber-deep', chip: 'bg-amber-wash text-amber-deep' },
  urgent: { ring: 'ring-clay/50', bar: 'bg-clay-deep', chip: 'bg-clay-wash text-clay-deep' },
} as const;

/**
 * One card. One action. Never a to-do list — a to-do list is how somebody who
 * is already overwhelmed decides to close the app.
 */
export function NextActionCard({
  action,
  onAct,
}: {
  action: NextAction;
  onAct: () => void;
}) {
  const tone = TONE[action.tone];

  return (
    <section
      aria-labelledby="next-action-heading"
      data-testid="next-best-action"
      className={`overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ${tone.ring}`}
    >
      <div aria-hidden="true" className={`h-1.5 w-full ${tone.bar}`} />
      <div className="p-6">
        <h2
          id="next-action-heading"
          className="text-[0.7rem] font-bold uppercase tracking-[0.15em] text-navy-faint"
        >
          Your next step
        </h2>

        <p className="mt-3 text-[1.15rem] font-bold leading-snug tracking-tight text-balance">
          {action.headline}
        </p>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-navy-soft">{action.detail}</p>

        <button
          type="button"
          onClick={onAct}
          data-testid="next-action-button"
          className="mt-5 w-full rounded-2xl bg-navy px-4 py-3.5 text-[0.95rem] font-semibold text-cream transition hover:bg-navy-deep active:scale-[0.99]"
        >
          {action.actionLabel}
        </button>
      </div>
    </section>
  );
}
