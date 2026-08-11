'use client';

import { daysBetween, formatLongDate, formatShortDate, relativeDays } from '@/lib/calc/dates';
import { formatCents, formatWholeDollars } from '@/lib/calc/money';
import type { CalcResult, ISODate } from '@/lib/calc/types';

/** How far the chart looks ahead. Beyond about six weeks it stops being legible. */
const CHART_DAYS = 42;

export function RunwayCard({ result, today }: { result: CalcResult; today: ISODate }) {
  const points = result.timeline.slice(0, CHART_DAYS);

  return (
    <section
      aria-labelledby="runway-heading"
      data-testid="money-runway-card"
      className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-line"
    >
      <h2
        id="runway-heading"
        className="text-[0.7rem] font-bold uppercase tracking-[0.15em] text-navy-faint"
      >
        Your money runway
      </h2>

      {result.nextIncome ? (
        <p className="mt-3 text-lg font-bold leading-snug tracking-tight">
          Your next payday is {formatLongDate(result.nextIncome.date)}
          <span className="font-medium text-navy-soft">
            {' '}
            ({relativeDays(today, result.nextIncome.date)}).
          </span>
        </p>
      ) : (
        <p className="mt-3 text-lg font-bold leading-snug tracking-tight">
          Add your next payday for a truer picture.
        </p>
      )}

      {result.shortfall ? (
        <p data-testid="runway-shortfall" className="mt-2 text-[0.95rem] leading-relaxed text-clay-deep">
          <strong>
            You may be short {formatWholeDollars(result.shortfall.amountCents)} before{' '}
            {formatShortDate(result.shortfall.date)}.
          </strong>{' '}
          {result.runwayEndDate
            ? `Your current money should last until ${formatShortDate(result.runwayEndDate)}.`
            : ''}
        </p>
      ) : (
        <p data-testid="runway-ok" className="mt-2 text-[0.95rem] leading-relaxed text-navy-soft">
          Your money should last past your next payday.
        </p>
      )}

      <RunwayChart points={points} today={today} />

      <ol className="mt-5 flex flex-col gap-2.5 border-t border-line pt-4">
        {points
          .filter((p) => p.events.length > 0)
          .slice(0, 5)
          .map((point) =>
            point.events.map((event, i) => (
              <li
                key={`${point.date}-${i}`}
                className="flex items-baseline justify-between gap-3 text-[0.92rem]"
              >
                <span className="flex min-w-0 items-baseline gap-2">
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                      event.kind === 'income' ? 'bg-mint-deep' : 'bg-navy-faint'
                    }`}
                  />
                  <span className="truncate">{event.label}</span>
                  <span className="shrink-0 text-navy-faint">
                    {formatShortDate(point.date)}
                  </span>
                </span>
                <span
                  className={`tnum shrink-0 font-semibold ${
                    event.amountCents > 0 ? 'text-mint-deep' : 'text-navy'
                  }`}
                >
                  {event.amountCents > 0 ? '+' : '−'}
                  {formatCents(Math.abs(event.amountCents))}
                </span>
              </li>
            )),
          )}
      </ol>
    </section>
  );
}

/**
 * A projected-balance line. Deliberately plain: one line, one zero rule, one
 * marked low point. A dense chart would undo the calm the rest of the screen
 * is working for.
 */
function RunwayChart({
  points,
  today,
}: {
  points: CalcResult['timeline'];
  today: ISODate;
}) {
  if (points.length < 2) return null;

  const W = 320;
  const H = 96;
  const PAD = 4;

  const balances = points.map((p) => p.balanceCents);
  const max = Math.max(...balances, 0);
  const min = Math.min(...balances, 0);
  const span = max - min || 1;

  const x = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const y = (cents: number) => PAD + (1 - (cents - min) / span) * (H - PAD * 2);

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.balanceCents).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${y(min).toFixed(1)} L${x(0).toFixed(1)},${y(min).toFixed(1)} Z`;

  const zeroY = y(0);
  const lowIndex = balances.indexOf(Math.min(...balances));
  const lowPoint = points[lowIndex];
  const goesNegative = min < 0;

  const lastDate = points[points.length - 1].date;

  return (
    <figure className="mt-5">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-24 w-full"
        role="img"
        aria-label={`Projected balance for the next ${daysBetween(today, lastDate)} days. Lowest point ${formatCents(
          lowPoint.balanceCents,
        )} on ${formatShortDate(lowPoint.date)}.`}
      >
        <defs>
          <linearGradient id="runway-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#52c18d" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#52c18d" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {min < 0 && max > 0 && (
          <line
            x1={PAD}
            x2={W - PAD}
            y1={zeroY}
            y2={zeroY}
            stroke="#c25b54"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        <path d={area} fill="url(#runway-fill)" />
        <path
          d={line}
          fill="none"
          stroke={goesNegative ? '#c25b54' : '#2e9a6b'}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <circle
          cx={x(lowIndex)}
          cy={y(lowPoint.balanceCents)}
          r="3.5"
          fill={goesNegative ? '#c25b54' : '#2e9a6b'}
        />
      </svg>

      <figcaption className="mt-1.5 flex justify-between text-xs text-navy-faint">
        <span>Today</span>
        <span className="tnum">
          Lowest: {formatCents(lowPoint.balanceCents)} on {formatShortDate(lowPoint.date)}
        </span>
      </figcaption>
    </figure>
  );
}
