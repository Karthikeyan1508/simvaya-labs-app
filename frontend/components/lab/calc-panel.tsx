'use client';

import { Calculator } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { fmt, sig } from '@/lib/format';
import type { CalcStep, ObservationRow } from '@/lib/types';
import { cn } from '@/lib/utils';

export function CalcPanel({
  rows,
  activeRow,
  onSelect,
}: {
  rows: ObservationRow[];
  activeRow: number | null;
  onSelect: (i: number) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-14 text-center">
        <Calculator className="size-7 text-primary" />
        <p className="text-sm font-medium">Nothing to calculate yet</p>
        <p className="text-xs text-muted-foreground">Record a row and every manual formula shows up here.</p>
      </div>
    );
  }

  const idx = activeRow ?? rows.length - 1;
  const row = rows[idx];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5">
        {rows.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            aria-pressed={i === idx}
            className="btn-chip num rounded-full"
          >
            Row {i + 1}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Dead weights T1" value={fmt(row.deadWeightKg, 2)} unit="kg" />
        <Stat label="Spring balance T2" value={fmt(row.springKg, 2)} unit="kg" />
        <Stat label="Speed N" value={String(row.speedRpm)} unit="rpm" />
        <Stat label="Efficiency η" value={fmt(row.etaPct, 1)} unit="%" accent />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {row.steps.map((s, i) => (
          <StepCard key={s.key} n={i + 1} step={s} accent={s.key === 'eta'} />
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, unit, accent }: { label: string; value: string; unit: string; accent?: boolean }) {
  return (
    <div className={cn('rounded-lg bg-foreground/[0.035] p-3.5', accent && 'bg-primary/10')}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="num mt-1 text-xl font-semibold">
        {accent ? <span className="text-gradient-orange">{value}</span> : value}
        <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
}

function StepCard({ n, step, accent }: { n: number; step: CalcStep; accent: boolean }) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg p-4 transition-colors',
        accent ? 'bg-primary/10' : 'bg-foreground/[0.035]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="num grid size-6 place-items-center rounded-md bg-muted text-[11px] font-semibold">{n}</span>
          <p className="text-sm font-medium">{step.label}</p>
        </div>
        <Badge variant="outline" className="num shrink-0 rounded-md text-[10px] font-normal">
          {step.unit}
        </Badge>
      </div>
      <p className="num mt-3 text-[12px] text-muted-foreground">{step.formula}</p>
      <p className="num mt-1 text-[12px] text-muted-foreground/80">{step.substituted}</p>
      <p className="num mt-2.5 text-2xl font-semibold">
        {accent ? <span className="text-gradient-orange">{sig(step.value, 4)}</span> : sig(step.value, 5)}
      </p>
    </div>
  );
}
