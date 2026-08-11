'use client';

import { useState } from 'react';

import { dollarsToCents } from '@/lib/calc/money';
import type { Scenario } from '@/lib/demo';
import { Sheet } from './Sheet';

export type EditTarget =
  | { kind: 'cash' }
  | { kind: 'bill'; id: string }
  | { kind: 'income'; id: string }
  | { kind: 'envelope'; id: string }
  | { kind: 'fund'; id: string };

type Draft = {
  title: string;
  amountLabel: string;
  amountCents: number;
  date?: string;
  dateLabel?: string;
  help: string;
  /** A second amount, used for "already spent" on an envelope. */
  secondLabel?: string;
  secondCents?: number;
};

function toDraft(scenario: Scenario, target: EditTarget): Draft | null {
  switch (target.kind) {
    case 'cash':
      return {
        title: 'Money in checking',
        amountLabel: 'Balance right now',
        amountCents: scenario.cashCents,
        help: 'Open your banking app and copy the number. Close enough is fine — you can change it any time.',
      };

    case 'bill': {
      const bill = scenario.billInstances.find((b) => b.id === target.id);
      if (!bill) return null;
      return {
        title: bill.name,
        amountLabel: 'Amount',
        amountCents: bill.amountCents,
        date: bill.dueDate,
        dateLabel: 'Due date',
        help: 'Change either one and watch your Safe to Spend number move.',
      };
    }

    case 'income': {
      const income = scenario.incomeEvents.find((e) => e.id === target.id);
      if (!income) return null;
      return {
        title: income.label,
        amountLabel: 'Amount you take home',
        amountCents: income.amountCents,
        date: income.date,
        dateLabel: 'Date it lands',
        help: 'Use your take-home pay, after taxes and deductions — the number that actually hits your account.',
      };
    }

    case 'envelope': {
      const env = scenario.envelopes.find((e) => e.id === target.id);
      if (!env) return null;
      return {
        title: env.name,
        amountLabel: 'Weekly limit',
        amountCents: env.limitCents,
        secondLabel: 'Spent so far this week',
        secondCents: env.spentCents,
        help: 'This is what you plan to spend, not what you wish you spent. A limit you actually hit is worth more than a perfect one you ignore.',
      };
    }

    case 'fund': {
      const fund = scenario.sinkingFunds.find((f) => f.id === target.id);
      if (!fund) return null;
      return {
        title: fund.name,
        amountLabel: 'Goal amount',
        amountCents: fund.goalCents,
        secondLabel: 'Saved so far',
        secondCents: fund.currentCents,
        help: 'We hold back a little each day toward this, instead of the whole amount at once.',
      };
    }
  }
}

function applyEdit(
  scenario: Scenario,
  target: EditTarget,
  amountCents: number,
  secondCents: number,
  date: string | undefined,
): Scenario {
  switch (target.kind) {
    case 'cash':
      return { ...scenario, cashCents: amountCents };

    case 'bill':
      return {
        ...scenario,
        billInstances: scenario.billInstances.map((b) =>
          b.id === target.id ? { ...b, amountCents, dueDate: date ?? b.dueDate } : b,
        ),
      };

    case 'income':
      return {
        ...scenario,
        incomeEvents: scenario.incomeEvents.map((e) =>
          e.id === target.id ? { ...e, amountCents, date: date ?? e.date } : e,
        ),
      };

    case 'envelope':
      return {
        ...scenario,
        envelopes: scenario.envelopes.map((e) =>
          e.id === target.id ? { ...e, limitCents: amountCents, spentCents: secondCents } : e,
        ),
      };

    case 'fund':
      return {
        ...scenario,
        sinkingFunds: scenario.sinkingFunds.map((f) =>
          f.id === target.id ? { ...f, goalCents: amountCents, currentCents: secondCents } : f,
        ),
      };
  }
}

export function EditSheet({
  target,
  scenario,
  onClose,
  onSave,
}: {
  target: EditTarget | null;
  scenario: Scenario;
  onClose: () => void;
  onSave: (next: Scenario) => void;
}) {
  const draft = target ? toDraft(scenario, target) : null;
  if (!target || !draft) return null;

  // The `key` gives each thing its own fresh form. That is what lets the fields
  // below seed themselves from the draft on mount, instead of an effect that
  // copies props into state on every render.
  const key = 'id' in target ? `${target.kind}:${target.id}` : target.kind;

  return (
    <EditForm
      key={key}
      target={target}
      draft={draft}
      scenario={scenario}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function EditForm({
  target,
  draft,
  scenario,
  onClose,
  onSave,
}: {
  target: EditTarget;
  draft: Draft;
  scenario: Scenario;
  onClose: () => void;
  onSave: (next: Scenario) => void;
}) {
  const [amount, setAmount] = useState(() => (draft.amountCents / 100).toFixed(2));
  const [second, setSecond] = useState(() =>
    draft.secondCents !== undefined ? (draft.secondCents / 100).toFixed(2) : '',
  );
  const [date, setDate] = useState(() => draft.date ?? '');

  const parse = (value: string) => {
    const n = Number.parseFloat(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  };

  const submit = () => {
    onSave(
      applyEdit(
        scenario,
        target,
        dollarsToCents(parse(amount)),
        dollarsToCents(parse(second)),
        date || undefined,
      ),
    );
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={draft.title}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col gap-5"
      >
        <MoneyField
          id="edit-amount"
          label={draft.amountLabel}
          value={amount}
          onChange={setAmount}
          autoFocus
        />

        {draft.secondLabel !== undefined && (
          <MoneyField
            id="edit-second"
            label={draft.secondLabel}
            value={second}
            onChange={setSecond}
          />
        )}

        {draft.date !== undefined && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-date" className="text-sm font-semibold">
              {draft.dateLabel}
            </label>
            <input
              id="edit-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-14 rounded-2xl border border-line bg-cream px-4 text-lg"
            />
          </div>
        )}

        <p className="text-sm leading-relaxed text-navy-faint">{draft.help}</p>

        <button
          type="submit"
          data-testid="edit-save"
          className="h-14 w-full rounded-2xl bg-navy text-base font-semibold text-cream transition hover:bg-navy-deep active:scale-[0.99]"
        >
          Save
        </button>
      </form>
    </Sheet>
  );
}

function MoneyField({
  id,
  label,
  value,
  onChange,
  autoFocus,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <div className="flex items-center rounded-2xl border border-line bg-cream focus-within:ring-2 focus-within:ring-mint-deep">
        <span aria-hidden="true" className="pl-4 text-lg text-navy-faint">
          $
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => e.target.select()}
          className="tnum h-14 w-full rounded-2xl bg-transparent px-2 text-lg outline-none"
        />
      </div>
    </div>
  );
}
