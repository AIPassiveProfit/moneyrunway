'use client';

import { formatShortDate, relativeDays } from '@/lib/calc/dates';
import { formatCents } from '@/lib/calc/money';
import type { CalcResult, ISODate } from '@/lib/calc/types';

/** Card 4: what is coming in, what is going out, and what is left over. */
export function UpcomingCard({
  result,
  today,
  onEditBill,
  onEditIncome,
}: {
  result: CalcResult;
  today: ISODate;
  onEditBill: (id: string) => void;
  onEditIncome: (id: string) => void;
}) {
  const { upcoming, nextIncome } = result;
  const remaining = upcoming.remainingAfterRequiredCents;

  return (
    <section
      aria-labelledby="upcoming-heading"
      data-testid="upcoming-money"
      className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-line"
    >
      <h2
        id="upcoming-heading"
        className="text-[0.7rem] font-bold uppercase tracking-[0.15em] text-navy-faint"
      >
        Upcoming money
      </h2>

      {nextIncome && (
        <button
          type="button"
          onClick={() => onEditIncome(nextIncome.id)}
          className="mt-4 flex w-full items-center justify-between gap-3 rounded-2xl bg-mint-wash px-4 py-3.5 text-left transition hover:brightness-[0.98]"
        >
          <span>
            <span className="block text-[0.95rem] font-semibold text-mint-deep">
              {nextIncome.label} coming in
            </span>
            <span className="block text-sm text-navy-soft">
              {formatShortDate(nextIncome.date)} · {relativeDays(today, nextIncome.date)}
            </span>
          </span>
          <span className="tnum shrink-0 text-lg font-bold text-mint-deep">
            +{formatCents(nextIncome.amountCents)}
          </span>
        </button>
      )}

      <h3 className="mt-6 text-sm font-semibold text-navy">
        Bills coming up before then
      </h3>

      {upcoming.billsBeforeIncome.length === 0 && upcoming.debtsBeforeIncome.length === 0 ? (
        <p className="mt-2 text-[0.95rem] text-navy-soft">
          Nothing is due before your next payday.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col divide-y divide-line">
          {upcoming.billsBeforeIncome.map((bill) => (
            <li key={bill.id}>
              <button
                type="button"
                onClick={() => onEditBill(bill.id)}
                data-testid={`bill-row-${bill.id}`}
                className="flex w-full items-center justify-between gap-3 py-3 text-left transition hover:opacity-70"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[0.95rem] font-medium">{bill.name}</span>
                  <span className="block text-sm text-navy-faint">
                    {formatShortDate(bill.dueDate)}
                    {bill.isAutopay ? ' · autopay' : ''}
                  </span>
                </span>
                <span className="tnum shrink-0 font-semibold">
                  −{formatCents(bill.amountCents)}
                </span>
              </button>
            </li>
          ))}
          {upcoming.debtsBeforeIncome.map((debt) => (
            <li
              key={debt.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <span className="min-w-0">
                <span className="block truncate text-[0.95rem] font-medium">
                  {debt.name} minimum
                </span>
                <span className="block text-sm text-navy-faint">
                  {formatShortDate(debt.dueDate)}
                </span>
              </span>
              <span className="tnum shrink-0 font-semibold">
                −{formatCents(debt.minPaymentCents)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-5 flex flex-col gap-2 border-t border-line pt-4 text-[0.95rem]">
        <div className="flex justify-between gap-3">
          <dt className="text-navy-soft">Total needed before payday</dt>
          <dd className="tnum font-semibold">{formatCents(upcoming.totalRequiredCents)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-navy-soft">Left after required bills</dt>
          <dd
            className={`tnum font-bold ${remaining < 0 ? 'text-clay-deep' : 'text-navy'}`}
          >
            {formatCents(remaining)}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-sm text-navy-faint">
        This is before everyday spending. Safe to Spend takes that out too.
      </p>
    </section>
  );
}
