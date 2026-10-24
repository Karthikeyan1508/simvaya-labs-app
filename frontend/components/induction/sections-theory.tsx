'use client';

import { SectionHead } from '@/components/lab/section-head';
import { ratedTorqueNm, type ExperimentInfo } from '@/lib/induction';

// Theory paragraphs from the experiment content, with the nameplate used by the simulation.
export function TheorySection({ exp }: { exp: ExperimentInfo }) {
  const n = exp.nameplate;
  const rows: [string, string][] = [
    ['Rated power', `${n.ratedPowerKw} kW`],
    ['Line voltage', `${n.lineVoltageV} V`],
    ['Rated current', `${n.ratedCurrentA} A`],
    ['Frequency', `${n.frequencyHz} Hz`],
    ['Poles', String(n.poles)],
    ['Rated speed', `${n.ratedSpeedRpm} rpm`],
    ['Power factor', n.ratedPowerFactor.toFixed(2)],
    ['Efficiency', `${n.ratedEfficiencyPct} %`],
    ['Connection', n.connection],
    ['Rated torque', `${ratedTorqueNm(n).toFixed(2)} N·m`],
  ];

  return (
    <div className="space-y-8">
      <SectionHead title="Theory" subtitle="How a three-phase induction motor turns electrical input into shaft output." />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="max-w-3xl space-y-4">
          {exp.theory.map((p, i) => (
            <p key={i} className="text-[15px] leading-relaxed">
              {p}
            </p>
          ))}
        </div>

        <aside className="glass h-fit rounded-lg p-5">
          <h3 className="text-sm font-semibold">Nameplate</h3>
          {n.illustrative && (
            <p className="mt-1 text-xs text-muted-foreground">Illustrative values until the rig ratings are confirmed.</p>
          )}
          <dl className="num mt-4 space-y-2 text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-2">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            Brake drum radius {exp.brake.radiusM} m, belt thickness {exp.brake.beltThicknessM} m, spring balance tare{' '}
            {exp.brake.tareKg} kg.
          </p>
        </aside>
      </div>
    </div>
  );
}
