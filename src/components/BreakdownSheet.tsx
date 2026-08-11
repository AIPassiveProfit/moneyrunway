'use client';

import { formatCents } from '@/lib/calc/money';
import type { BreakdownLine, CalcResult } from '@/lib/calc/types';
import { Sheet } from './Sheet';

const KIND_LABEL: Record<BreakdownLine['kind'], string> = {
  cash: 'What you have',
  bill: 'Bills due before payday',
  debt: 'Debt minimums due before payday',
  sinking: 'Set aside for planned expenses',
  tax: 'Set aside for taxes',
  envelope: 'Everyday spending still to come',
  total: '',
};

const ORDER: BreakdownLine['kind'][] = ['cash', 'bill', 'debt', 'sinking', 'tax', 'envelope'];

/**
 * "How is this calculated?"
 *
 * This screen is not a nice-to-have. Our customer has been burned by apps that
 * produced a number she could not explain to her spouse. Every line here is
 * generated from the same data the engine used, and every line is tappable so
 * she can go change the thing she disagrees with.
 */
export function BreakdownSheet({
  open,
  onClose,
  result,
  onOpenLine,
}: {
  open: boolean;
  onClose: () => void;
  result: CalcResult;
  onOpenLine: (line: BreakdownLine) => void;
}) {
  const total = result.breakdown.find((l) => l.kind === 'total');

  return (
    <Sheet open={open} onClose={onClose} title="How is this calculated?">
      <p className="text-[0.95rem] leading-relaxed text-navy-soft">
        We start with the money in your checking account, then take out everything that already
        has a claim on it before your next payday. What is left is yours to spend.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        {ORDER.map((kind) => {
          const lines = result.breakdown.filter((l) => l.kind === kind);
          if (lines.length === 0) return null;

          return (
            <div key={kind}>
              <h3 className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-navy-faint">
                {KIND_LABEL[kind]}
              </h3>
              <ul className="mt-2 flex flex-col divide-y divide-line">
                {lines.map((line, i) => (
                  <li key={`${line.kind}-${line.refId ?? i}`}>
                    <button
                      type="button"
                      onClick={() => onOpenLine(line)}
                      className="flex w-full items-baseline justify-between gap-3 py-2.5 text-left transition hover:opacity-70"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[0.95rem]">{line.label}</span>
                        {line.detail && (
                          <span className="block text-sm text-navy-faint">{line.detail}</span>
                        )}
                      </span>
                      <span
                        className={`tnum shrink-0 font-semibold ${
                          line.amountCents < 0 ? 'text-navy' : 'text-mint-deep'
                        }`}
                      >
                        {line.amountCents < 0 ? '−' : ''}
                        {formatCents(Math.abs(line.amountCents))}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {total && (
        <div className="mt-6 flex items-baseline justify-between gap-3 rounded-2xl bg-cream px-4 py-4">
          <span className="font-semibold">{total.label}</span>
          <span
            data-testid="breakdown-total"
            className={`tnum text-lg font-bold ${
              total.amountCents < 0 ? 'text-clay-deep' : 'text-mint-deep'
            }`}
          >
            {total.amountCents < 0 ? '−' : ''}
            {formatCents(Math.abs(total.amountCents))}
          </span>
        </div>
      )}

      <p className="mt-4 text-sm leading-relaxed text-navy-faint">
        Divided across the {result.daysInWindow}{' '}
        {result.daysInWindow === 1 ? 'day' : 'days'} until your next payday, and rounded down to
        the dollar. We round down on purpose — guessing high would cost you real money.
      </p>
    </Sheet>
  );
}
