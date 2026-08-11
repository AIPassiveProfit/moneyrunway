'use client';

import { useMemo, useState } from 'react';

import { BreakdownSheet } from '@/components/BreakdownSheet';
import { EditSheet, type EditTarget } from '@/components/EditSheet';
import { EnvelopesCard } from '@/components/EnvelopesCard';
import { NextActionCard } from '@/components/NextActionCard';
import { RunwayCard } from '@/components/RunwayCard';
import { SafeToSpendCard } from '@/components/SafeToSpendCard';
import { UpcomingCard } from '@/components/UpcomingCard';
import { chooseNextAction } from '@/lib/calc/nextAction';
import { calculateSafeToSpend } from '@/lib/calc/safeToSpend';
import { formatCents } from '@/lib/calc/money';
import type { BreakdownLine } from '@/lib/calc/types';
import { buildDemoScenario, type Scenario } from '@/lib/demo';

/**
 * Phase 0: the food stand.
 *
 * One screen, one number, real math. The scenario lives in React state rather
 * than a database — Phase 0's job is to prove the number feels right in your
 * hand, and a database does not help with that.
 */
export default function Dashboard() {
  const [scenario, setScenario] = useState<Scenario>(() => buildDemoScenario());
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [explaining, setExplaining] = useState(false);

  const result = useMemo(() => calculateSafeToSpend(scenario), [scenario]);
  const action = useMemo(() => chooseNextAction(scenario, result), [scenario, result]);

  const openBreakdownLine = (line: BreakdownLine) => {
    if (line.kind === 'cash') return setEditing({ kind: 'cash' });
    if (!line.refId) return;
    if (line.kind === 'bill') setEditing({ kind: 'bill', id: line.refId });
    else if (line.kind === 'envelope') setEditing({ kind: 'envelope', id: line.refId });
    else if (line.kind === 'sinking') setEditing({ kind: 'fund', id: line.refId });
  };

  const doNextAction = () => {
    if (action.targetId === 'cash') return setEditing({ kind: 'cash' });
    if (action.targetId && scenario.billInstances.some((b) => b.id === action.targetId)) {
      return setEditing({ kind: 'bill', id: action.targetId });
    }
    if (action.targetId && scenario.envelopes.some((e) => e.id === action.targetId)) {
      return setEditing({ kind: 'envelope', id: action.targetId });
    }
    if (action.targetId && scenario.sinkingFunds.some((f) => f.id === action.targetId)) {
      return setEditing({ kind: 'fund', id: action.targetId });
    }
    setExplaining(true);
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col">
      <DemoBanner onReset={() => setScenario(buildDemoScenario())} />

      <header className="px-5 pt-6">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.15em] text-navy-faint">
          Make Money Make Sense
        </p>
        <h1 className="hero-number mt-1 text-3xl">Money Runway</h1>
      </header>

      <main className="flex flex-col gap-4 px-5 py-6">
        <SafeToSpendCard result={result} onExplain={() => setExplaining(true)} />

        <BalanceStrip
          cashCents={scenario.cashCents}
          savingsCents={scenario.savingsCents}
          onEdit={() => setEditing({ kind: 'cash' })}
        />

        <NextActionCard action={action} onAct={doNextAction} />

        <RunwayCard result={result} today={scenario.today} />

        <UpcomingCard
          result={result}
          today={scenario.today}
          onEditBill={(id) => setEditing({ kind: 'bill', id })}
          onEditIncome={(id) => setEditing({ kind: 'income', id })}
        />

        <EnvelopesCard
          envelopes={scenario.envelopes}
          today={scenario.today}
          onEdit={(id) => setEditing({ kind: 'envelope', id })}
        />

        <Disclaimer />
      </main>

      <BreakdownSheet
        open={explaining}
        onClose={() => setExplaining(false)}
        result={result}
        onOpenLine={(line) => {
          setExplaining(false);
          openBreakdownLine(line);
        }}
      />

      <EditSheet
        target={editing}
        scenario={scenario}
        onClose={() => setEditing(null)}
        onSave={setScenario}
      />
    </div>
  );
}

function DemoBanner({ onReset }: { onReset: () => void }) {
  return (
    <div
      data-testid="demo-banner"
      className="flex items-center justify-between gap-3 bg-navy px-5 py-2.5 text-cream"
    >
      <p className="text-sm">
        You&rsquo;re viewing <strong className="font-semibold">sample data</strong>. Tap any
        number to change it.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="shrink-0 rounded-full border border-cream/30 px-3 py-1.5 text-xs font-semibold transition hover:bg-cream/10"
      >
        Reset
      </button>
    </div>
  );
}

function BalanceStrip({
  cashCents,
  savingsCents,
  onEdit,
}: {
  cashCents: number;
  savingsCents: number;
  onEdit: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onEdit}
      data-testid="balance-strip"
      className="flex items-center justify-between gap-3 rounded-3xl bg-white px-6 py-4 text-left shadow-sm ring-1 ring-line transition hover:bg-cream"
    >
      <span>
        <span className="block text-[0.7rem] font-bold uppercase tracking-[0.15em] text-navy-faint">
          In checking
        </span>
        <span className="tnum block text-2xl font-bold">{formatCents(cashCents)}</span>
      </span>
      <span className="text-right">
        <span className="block text-[0.7rem] font-bold uppercase tracking-[0.15em] text-navy-faint">
          Savings
        </span>
        <span className="tnum block text-lg font-semibold text-navy-soft">
          {formatCents(savingsCents)}
        </span>
      </span>
    </button>
  );
}

function Disclaimer() {
  return (
    <footer className="px-1 pb-4 pt-2">
      <p className="text-xs leading-relaxed text-navy-faint">
        Money Runway is an educational budgeting and cash-flow organization tool. It is not
        financial, investment, tax, legal, or credit advice. Consider your own situation and a
        qualified professional when needed.
      </p>
    </footer>
  );
}
