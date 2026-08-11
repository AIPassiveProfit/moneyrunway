'use client';

import { daysBetween } from '@/lib/calc/dates';
import { formatCents } from '@/lib/calc/money';
import type { Envelope, ISODate } from '@/lib/calc/types';

/** Card 5: this week's everyday spending, as progress bars rather than a ledger. */
export function EnvelopesCard({
  envelopes,
  today,
  onEdit,
}: {
  envelopes: Envelope[];
  today: ISODate;
  onEdit: (id: string) => void;
}) {
  if (envelopes.length === 0) return null;

  return (
    <section
      aria-labelledby="envelopes-heading"
      data-testid="envelopes-card"
      className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-line"
    >
      <h2
        id="envelopes-heading"
        className="text-[0.7rem] font-bold uppercase tracking-[0.15em] text-navy-faint"
      >
        This week&rsquo;s everyday spending
      </h2>

      <ul className="mt-4 flex flex-col gap-5">
        {envelopes.map((env) => {
          const remaining = env.limitCents - env.spentCents;
          const pct = env.limitCents > 0
            ? Math.min(100, Math.max(0, (env.spentCents / env.limitCents) * 100))
            : 0;
          const over = remaining < 0;
          const tight = !over && pct >= 80;
          const daysLeft = Math.max(0, daysBetween(today, env.periodEnd) + 1);

          return (
            <li key={env.id}>
              <button
                type="button"
                onClick={() => onEdit(env.id)}
                data-testid={`envelope-row-${env.id}`}
                className="w-full text-left transition hover:opacity-80"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[0.95rem] font-medium">{env.name}</span>
                  <span
                    className={`tnum text-[0.95rem] font-semibold ${
                      over ? 'text-clay-deep' : tight ? 'text-amber-deep' : 'text-navy'
                    }`}
                  >
                    {over
                      ? `${formatCents(Math.abs(remaining))} over`
                      : `${formatCents(remaining)} left`}
                  </span>
                </div>

                <div
                  className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-cream-deep"
                  role="progressbar"
                  aria-valuenow={Math.round(pct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${env.name}: ${formatCents(env.spentCents)} of ${formatCents(env.limitCents)} spent`}
                >
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ${
                      over ? 'bg-clay-deep' : tight ? 'bg-amber-deep' : 'bg-mint-deep'
                    }`}
                    style={{ width: `${over ? 100 : pct}%` }}
                  />
                </div>

                <p className="mt-1.5 text-sm text-navy-faint">
                  {formatCents(env.spentCents)} of {formatCents(env.limitCents)} ·{' '}
                  {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
