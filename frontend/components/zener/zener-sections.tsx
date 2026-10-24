'use client';

import { Download, Trash2 } from 'lucide-react';
import { GradientChart, type SeriesPoint } from '@/components/lab/gradient-chart';
import { SectionHead } from '@/components/lab/section-head';
import { Button } from '@/components/ui/button';
import { MANUAL_NOTE, ZENER_THEORY } from '@/lib/zener/content';
import { type LineRegulation, type LoadRegulation } from '@/lib/zener/regulation';
import type { OperatingPoint } from '@/lib/zener/solver';
import { RS_OHM, VZ_V } from '@/lib/zener/solver';

export interface Observation {
  id: number;
  vs: number;
  rl: number | null;
  vOut: number;
  iZ: number; // A
  pZ: number; // W
}

const loadLabel = (rl: number | null) => (rl === null ? 'No load' : `${rl} Ω`);

export function ZenerTheory({ relations }: { relations: { label: string; value: string }[] }) {
  return (
    <div className="space-y-8">
      <SectionHead title="Theory" subtitle="How a Zener diode holds a voltage constant in reverse breakdown." />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="max-w-3xl space-y-4">
          {ZENER_THEORY.map((p, i) => (
            <p key={i} className="text-[15px] leading-relaxed">
              {p}
            </p>
          ))}
        </div>
        <aside className="glass h-fit rounded-lg p-5">
          <h3 className="text-sm font-semibold">Key relations</h3>
          <dl className="num mt-4 space-y-3 text-sm">
            {relations.map((r) => (
              <div key={r.label}>
                <dt className="text-muted-foreground">{r.label}</dt>
                <dd>{r.value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </div>
  );
}

export function ZenerObservations({
  rows,
  onRemove,
  onClear,
}: {
  rows: Observation[];
  onRemove: (id: number) => void;
  onClear: () => void;
}) {
  const exportCsv = () => {
    const header = 'S.No,Vs (V),RL (ohm),Vout (V),Iz (mA),Pz (mW)';
    const lines = rows.map((r, i) =>
      [i + 1, r.vs, r.rl ?? 'open', r.vOut.toFixed(3), (r.iZ * 1000).toFixed(2), (r.pZ * 1000).toFixed(1)].join(','),
    );
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zener-regulator-observations.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <SectionHead title="Observations" subtitle="One row per reading. Record a reading from the bench in Simulation." />
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
          <Download /> Export CSV
        </Button>
        <Button variant="ghost" onClick={onClear} disabled={rows.length === 0}>
          Clear table
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No readings yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="num w-full text-sm">
            <thead className="bg-foreground/[0.035] text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">S.No</th>
                <th className="px-3 py-2 font-medium">Vs (V)</th>
                <th className="px-3 py-2 font-medium">RL (Ω)</th>
                <th className="px-3 py-2 font-medium">Vout (V)</th>
                <th className="px-3 py-2 font-medium">Iz (mA)</th>
                <th className="px-3 py-2 font-medium">Pz (mW)</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2">{i + 1}</td>
                  <td className="px-3 py-2">{r.vs.toFixed(1)}</td>
                  <td className="px-3 py-2">{r.rl === null ? 'open' : r.rl}</td>
                  <td className="px-3 py-2">{r.vOut.toFixed(2)}</td>
                  <td className="px-3 py-2">{(r.iZ * 1000).toFixed(1)}</td>
                  <td className="px-3 py-2">{(r.pZ * 1000).toFixed(0)}</td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="ghost" size="icon" aria-label={`Remove reading ${i + 1}`} onClick={() => onRemove(r.id)}>
                      <Trash2 />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ZenerCalculations({
  vs,
  rl,
  op,
  latest,
  lineReg,
  loadReg,
}: {
  vs: number;
  rl: number | null;
  op: OperatingPoint | null;
  latest: Observation | null;
  lineReg: LineRegulation | null;
  loadReg: LoadRegulation | null;
}) {
  const fmtA = (a: number) => `${(a * 1000).toFixed(2)} mA`;
  return (
    <div className="space-y-8">
      <SectionHead title="Calculations" subtitle={`Each formula with the numbers on the bench now: Vs = ${vs} V, RL = ${loadLabel(rl)}.`} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass space-y-3 rounded-lg p-5">
          <h3 className="text-sm font-semibold">1. Series resistor</h3>
          <p className="num text-sm">Rs = (Vs - Vz) / (Iz + IL)</p>
          <p className="num text-sm text-muted-foreground">
            Rs = ({vs} - {VZ_V}) / (Iz + IL) with Rs = {RS_OHM} Ω, so the total current is {op ? fmtA(op.iS) : '—'}.
          </p>
        </div>
        <div className="glass space-y-3 rounded-lg p-5">
          <h3 className="text-sm font-semibold">2. Zener current</h3>
          <p className="num text-sm">Iz = (Vs - Vz) / Rs - IL</p>
          <p className="num text-sm text-muted-foreground">
            {op ? (op.regulating ? `Iz = ${fmtA(op.iZ)}, IL = ${fmtA(op.iL)}` : 'Not regulating: Iz = 0.') : '—'}
          </p>
        </div>
        <div className="glass space-y-3 rounded-lg p-5">
          <h3 className="text-sm font-semibold">3. Zener power</h3>
          <p className="num text-sm">Pz = Vz x Iz</p>
          <p className="num text-sm text-muted-foreground">
            {op ? `Pz = ${VZ_V} x ${(op.iZ * 1000).toFixed(2)} mA = ${(op.pZ * 1000).toFixed(1)} mW, rating 1 W` : '—'}
          </p>
        </div>
        <div className="glass space-y-3 rounded-lg p-5">
          <h3 className="text-sm font-semibold">4. Line regulation</h3>
          <p className="num text-sm">Line regulation = ΔVout / ΔVs (at fixed RL)</p>
          <p className="num text-sm text-muted-foreground">
            {lineReg
              ? `${lineReg.value.toFixed(4)} V/V from Vs ${lineReg.vsSpan[0]} to ${lineReg.vsSpan[1]} V, RL = ${loadLabel(lineReg.rl)}`
              : 'Record two input voltages at the same load to see it.'}
          </p>
        </div>
        <div className="glass space-y-3 rounded-lg p-5">
          <h3 className="text-sm font-semibold">5. Load regulation</h3>
          <p className="num text-sm">% load regulation = (V_NL - V_FL) / V_FL x 100</p>
          <p className="num text-sm text-muted-foreground">
            {loadReg
              ? `${loadReg.pct.toFixed(2)} % at Vs = ${loadReg.vs} V: V_NL = ${loadReg.vNl.toFixed(2)} V, V_FL = ${loadReg.vFl.toFixed(2)} V (RL = ${loadReg.rlFull} Ω)`
              : 'Record a no-load and a loaded reading at the same input to see it.'}
          </p>
        </div>
        <div className="glass space-y-3 rounded-lg p-5">
          <h3 className="text-sm font-semibold">6. Output voltage</h3>
          <p className="num text-sm">Vout = Vz while the Zener conducts</p>
          <p className="num text-sm text-muted-foreground">
            {latest
              ? `Last reading: Vout = ${latest.vOut.toFixed(2)} V at Vs = ${latest.vs} V, RL = ${loadLabel(latest.rl)}.`
              : 'Record a reading to compare it with Vz.'}
          </p>
        </div>
      </div>
      <p className="max-w-3xl text-sm text-muted-foreground">{MANUAL_NOTE}</p>
    </div>
  );
}

// Curves are computed for the load on the bench, so they show the whole input range, not only the recorded points.
export function ZenerGraphs({
  vOut,
  iZ,
  loadCurve,
}: {
  vOut: SeriesPoint[];
  iZ: SeriesPoint[];
  loadCurve: SeriesPoint[];
}) {
  return (
    <div className="space-y-8">
      <SectionHead title="Graphs" subtitle="Computed for the load on the bench, from 0 to 15 V input." />
      <div className="grid gap-4 md:grid-cols-2">
        <GradientChart
          id="vout-vs"
          title="(a) Output voltage vs input voltage"
          description="Vout flat at Vz once the Zener conducts"
          yLabel="Vout (V)"
          data={vOut}
          color="var(--chart-1)"
          xDigits={1}
          yDigits={2}
        />
        <GradientChart
          id="iz-vs"
          title="(b) Zener current vs input voltage"
          description="Iz rises with the input above Vz"
          yLabel="Iz (mA)"
          data={iZ}
          color="var(--chart-2)"
          xDigits={1}
          yDigits={1}
        />
        <GradientChart
          id="vout-il"
          title="(c) Output voltage vs load current"
          description="Load regulation at the input voltage on the bench"
          yLabel="Vout (V)"
          data={loadCurve}
          color="var(--chart-3)"
          xDigits={1}
          yDigits={2}
        />
      </div>
    </div>
  );
}
