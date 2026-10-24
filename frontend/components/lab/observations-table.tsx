'use client';

import { Table2 } from 'lucide-react';
import { fmt } from '@/lib/format';
import type { ObservationRow } from '@/lib/types';
import { cn } from '@/lib/utils';

type Col = { label: string; unit: string; get: (r: ObservationRow) => string };

// Columns follow the manual's two observation tables, grouped the same way.
const GROUPS: { label: string; cols: Col[] }[] = [
  {
    label: 'Load',
    cols: [
      { label: 'T1', unit: 'kg', get: (r) => fmt(r.deadWeightKg, 2) },
      { label: 'T2', unit: 'kg', get: (r) => fmt(r.springKg, 2) },
      { label: 'T', unit: 'kg', get: (r) => fmt(r.netLoadKg, 2) },
    ],
  },
  {
    label: 'Power',
    cols: [
      { label: 'BHP', unit: 'kW', get: (r) => fmt(r.bhpKw, 3) },
      { label: 'IHP', unit: 'kW', get: (r) => fmt(r.ipKw, 3) },
      { label: 'η', unit: '%', get: (r) => fmt(r.etaPct, 1) },
    ],
  },
  {
    label: 'Pressure',
    cols: [
      { label: 'P1', unit: 'kg/cm²', get: (r) => fmt(r.p1, 3) },
      { label: 'P2', unit: 'kg/cm²', get: (r) => fmt(r.p2, 3) },
      { label: 'Pp', unit: 'kg/cm²', get: (r) => fmt(r.pp, 3) },
    ],
  },
  {
    label: 'Flow',
    cols: [
      { label: 'P', unit: 'kg/cm²', get: (r) => fmt(r.dpKgCm2, 3) },
      { label: 'H', unit: 'm', get: (r) => fmt(r.headVenturiM, 2) },
      { label: 'Qact', unit: 'm³/s', get: (r) => fmt(r.qActM3s, 5) },
      { label: 'N', unit: 'rpm', get: (r) => String(r.speedRpm) },
      { label: 'Hp', unit: 'm', get: (r) => fmt(r.headPenstockM, 1) },
      { label: 'Hi', unit: 'm', get: (r) => fmt(r.headInletM, 1) },
    ],
  },
];

const COLS = GROUPS.flatMap((g) => g.cols);
const GROUP_START = new Set(GROUPS.map((g) => g.cols[0]));

export function ObservationsTable({
  rows,
  activeRow,
  onSelect,
  bestIndex,
}: {
  rows: ObservationRow[];
  activeRow: number | null;
  onSelect: (i: number) => void;
  bestIndex: number;
}) {
  if (rows.length === 0) {
    return (
      <div className="surface-gradient flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
        <span className="orange-gradient grid size-12 place-items-center rounded-2xl text-primary-foreground shadow-[0_10px_24px_-14px_rgba(217,119,6,0.9)]">
          <Table2 className="size-5" />
        </span>
        <p className="text-sm font-semibold">No observations yet</p>
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
          Start the pump, set a load, then record a row. Or sweep 12 loads at once.
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-[480px] overflow-auto rounded-2xl border border-border/70 bg-card">
      <table className="num w-full min-w-[1180px] border-separate border-spacing-0 text-xs">
        <thead className="sticky top-0 z-10 bg-card">
          <tr>
            <th rowSpan={2} className="w-14 border-b border-border/70 px-4 py-2.5 text-left font-medium text-muted-foreground">
              #
            </th>
            {GROUPS.map((g) => (
              <th
                key={g.label}
                colSpan={g.cols.length}
                className="border-b border-l border-border/70 px-3 pt-3 pb-2.5 text-center font-sans"
              >
                <span className="text-[11px] font-semibold text-foreground">{g.label}</span>
                <span className="orange-gradient mx-auto mt-1.5 block h-0.5 w-8 rounded-full" />
              </th>
            ))}
          </tr>
          <tr>
            {COLS.map((c, i) => (
              <th
                key={`${c.label}-${i}`}
                className={cn(
                  'border-b border-border/70 px-3 pb-2.5 text-right font-medium',
                  GROUP_START.has(c) && 'border-l border-border/70',
                )}
              >
                <span className="text-foreground">{c.label}</span>
                <span className="block text-[10px] font-normal text-muted-foreground">{c.unit}</span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((r, i) => {
            const active = i === activeRow;
            const best = i === bestIndex;
            return (
              <tr
                key={i}
                onClick={() => onSelect(i)}
                className={cn(
                  'cursor-pointer transition-colors',
                  active ? 'bg-primary/10' : i % 2 === 1 ? 'bg-foreground/[0.02]' : '',
                  !active && 'hover:bg-foreground/[0.05]',
                )}
              >
                <td className="relative border-b border-border/50 px-4 py-2.5 font-semibold">
                  {active && <span className="orange-gradient absolute inset-y-0 left-0 w-[3px]" />}
                  <span className="flex items-center gap-2">
                    {i + 1}
                    {best && (
                      <span className="orange-gradient rounded-full px-1.5 py-px text-[10px] leading-4 font-semibold text-primary-foreground">
                        best
                      </span>
                    )}
                  </span>
                </td>
                {COLS.map((c, j) => (
                  <td
                    key={j}
                    className={cn(
                      'border-b border-border/50 px-3 py-2.5 text-right tabular-nums',
                      GROUP_START.has(c) && 'border-l border-border/70',
                      c.label === 'η' && 'font-semibold',
                    )}
                  >
                    {c.label === 'η' ? (
                      <span className="flex items-center justify-end gap-2.5">
                        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-foreground/10">
                          <span
                            className="fill-gradient block h-full rounded-full"
                            style={{ width: `${Math.min(100, Math.max(0, r.etaPct))}%` }}
                          />
                        </span>
                        <span className="w-12">{c.get(r)}</span>
                      </span>
                    ) : (
                      c.get(r)
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
