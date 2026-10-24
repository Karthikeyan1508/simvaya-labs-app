'use client';

import { Calculator } from 'lucide-react';
import { SectionHead } from '@/components/lab/section-head';
import type { DerivedReadings, ExperimentInfo, ObservationRow } from '@/lib/induction';
import { cn } from '@/lib/utils';
import type { RowsApi } from './lab-rows';

const pending = '…';
const shown = (d: DerivedReadings | null, v: number | null | undefined, digits: number) => {
  if (d === null) return pending;
  return v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(digits);
};

// The seven formulas for the selected observation. Values come from the backend; the substitution uses the same numbers.
export function CalculationsSection({ exp, api }: { exp: ExperimentInfo; api: RowsApi }) {
  const { rows } = api;

  if (rows.length === 0) {
    return (
      <div className="space-y-8">
        <SectionHead title="Calculations" subtitle="The formulas and the values for one observation." />
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-14 text-center">
          <Calculator className="size-7 text-primary" />
          <p className="text-sm font-medium">Nothing to calculate yet</p>
          <p className="text-xs text-muted-foreground">Capture a reading in Observations and the formulas show up here.</p>
        </div>
      </div>
    );
  }

  const row: ObservationRow = rows.find((r) => r.id === api.selectedId) ?? rows[rows.length - 1];
  const d = api.derivedOf(row);
  const raw = row.raw;
  const np = exp.nameplate;
  const br = exp.brake;
  const ns = (np.frequencyHz * 120) / np.poles;
  const k = br.radiusM + br.beltThicknessM / 2;
  const torque = shown(d, d?.torqueNm, 3);
  const pout = shown(d, d?.poutW, 1);
  const pin = shown(d, d?.pinW, 1);
  const sum = `${raw.W1.toFixed(1)} ${raw.W2 < 0 ? '−' : '+'} ${Math.abs(raw.W2).toFixed(1)}`;

  const formulas = [
    {
      name: 'Synchronous speed',
      formula: 'Ns = 120 f / P',
      sub: `120 × ${np.frequencyHz} / ${np.poles}`,
      value: shown(d, d?.syncRpm, 0),
      unit: 'rpm',
    },
    {
      name: 'Slip',
      formula: 's = (Ns − N) / Ns × 100',
      sub: `(${ns} − ${raw.speedRpm.toFixed(1)}) / ${ns} × 100`,
      value: shown(d, d?.slipPct, 2),
      unit: '%',
    },
    {
      name: 'Shaft torque',
      formula: 'T = 9.81 (S1 − S2)(R + t/2)',
      sub: `9.81 × (${raw.s1Kg.toFixed(2)} − ${raw.s2Kg.toFixed(2)}) × ${k.toFixed(3)}`,
      value: torque,
      unit: 'N·m',
    },
    {
      name: 'Output power',
      formula: 'Pout = 2π N T / 60',
      sub: `2π × ${raw.speedRpm.toFixed(1)} × ${torque} / 60`,
      value: pout,
      unit: 'W',
    },
    {
      name: 'Input power',
      formula: 'Pin = W1 + W2',
      sub: sum,
      value: pin,
      unit: 'W',
    },
    {
      name: 'Power factor',
      formula: 'pf = Pin / (√3 VL IL)',
      sub: `${pin} / (1.732 × ${raw.VL.toFixed(0)} × ${raw.IL.toFixed(3)})`,
      value: shown(d, d?.pf, 3),
      unit: '',
    },
    {
      name: 'Efficiency',
      formula: 'η = 100 Pout / Pin',
      sub: `100 × ${pout} / ${pin}`,
      value: shown(d, d?.etaPct, 2),
      unit: '%',
    },
  ];

  return (
    <div className="space-y-8">
      <SectionHead
        title="Calculations"
        subtitle="The seven formulas for the selected observation. Pick another row below, or select one in the table or the graphs."
      />

      <div className="flex flex-wrap gap-1.5">
        {rows.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => api.select(r.id)}
            aria-pressed={r.id === row.id}
            className="btn-chip num rounded-full"
          >
            Row {r.observation}
          </button>
        ))}
      </div>

      <div className="max-w-full overflow-x-auto rounded-lg border border-border/70 bg-card">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/70 text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Quantity</th>
              <th className="px-4 py-2.5 font-medium">Formula</th>
              <th className="px-4 py-2.5 font-medium">Substituted</th>
              <th className="px-4 py-2.5 text-right font-medium">Value</th>
              <th className="px-4 py-2.5 font-medium">Unit</th>
            </tr>
          </thead>
          <tbody>
            {formulas.map((f, i) => (
              <tr key={f.name} className={cn('border-b border-border/50', i % 2 === 1 && 'bg-foreground/[0.02]')}>
                <td className="px-4 py-3 font-medium">{f.name}</td>
                <td className="num px-4 py-3 text-xs">{f.formula}</td>
                <td className="num px-4 py-3 text-xs text-muted-foreground">{f.sub}</td>
                <td className="num px-4 py-3 text-right font-semibold">{f.value}</td>
                <td className="px-4 py-3 text-muted-foreground">{f.unit || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
        Nameplate and brake values are illustrative until the rig data is confirmed. Speed N, the balance readings and the
        line readings are the row&apos;s own values; the other quantities are calculated from them.
      </p>
    </div>
  );
}
