'use client';

import { AlertTriangle, Box, Minus, OctagonAlert, Pause, Play, Plus, Power, RotateCcw, Square } from 'lucide-react';
import { memo, type ComponentProps, type ReactNode } from 'react';
import { CircuitDiagram } from '@/components/induction/circuit-diagram';
import { MotorScene } from '@/components/induction/motor-scene';
import { SectionHead } from '@/components/lab/section-head';
import { Button } from '@/components/ui/button';
import { fmt } from '@/lib/format';
import { LOAD_MAX_KG, isComponentId, warningText, type ComponentId, type ExperimentInfo } from '@/lib/induction';
import { cn } from '@/lib/utils';
import { LOAD_STEPS, type RigApi } from './lab-rig';

// The scene re-renders only when one of its own inputs changes, not on every readings refresh.
const SceneView = memo(function SceneView(props: ComponentProps<typeof MotorScene>) {
  return <MotorScene {...props} />;
});

export type ViewMode = 'scene' | 'circuit';

export interface LabSimulationProps {
  exp: ExperimentInfo;
  rig: RigApi;
  loadFraction: number;
  armed: boolean;
  ticked: number;
  total: number;
  view: ViewMode;
  onView: (v: ViewMode) => void;
  cutaway: boolean;
  onCutaway: (v: boolean) => void;
  part: ComponentId | null;
  onPart: (id: ComponentId | null) => void;
  highlight: ComponentId[];
  onGoProcedure: () => void;
}

export function LabSimulation(p: LabSimulationProps) {
  const { exp, rig } = p;
  const sim = rig.sim;
  const info = exp.components.find((c) => c.id === p.part);
  const supplyLocked = rig.emergency || rig.paused || (!rig.supplyOn && !p.armed);
  const readings: [string, string, string][] = [
    ['Line voltage VL', fmt(sim.VL, 0), 'V'],
    ['Line current IL', fmt(sim.IL, 2), 'A'],
    ['Wattmeter W1', fmt(sim.W1, 0), 'W'],
    ['Wattmeter W2', fmt(sim.W2, 0), 'W'],
    ['Input power Pin', fmt(sim.pinW, 0), 'W'],
    ['Power factor', fmt(sim.pf, 3), ''],
    ['Speed N', fmt(sim.speedRpm, 0), 'rpm'],
    ['Slip', fmt(sim.slipPct, 2), '%'],
    ['Torque T', fmt(sim.torqueNm, 2), 'N·m'],
    ['Output power Pout', fmt(sim.poutW, 0), 'W'],
    ['Efficiency η', fmt(sim.etaPct, 1), '%'],
    ['Balance S1', fmt(sim.s1Kg, 2), 'kg'],
    ['Balance S2', fmt(sim.s2Kg, 2), 'kg'],
  ];

  return (
    <div className="space-y-5">
      <SectionHead
        title="Simulation"
        subtitle="Operate the simulated motor and watch the instruments. Every reading here is simulated, not measured."
      />

      <div className="space-y-2">
        {rig.emergency && (
          <Notice tone="danger">Emergency stop is active. The motor and supply are off. Reset the rig to continue.</Notice>
        )}
        {rig.paused && !rig.emergency && <Notice tone="info">Paused. The readings are frozen. Resume to continue.</Notice>}
        {rig.loadKg > 0 && !rig.running && !rig.emergency && (
          <Notice tone="info">
            Motor is stopped. The load is set on the brake, but no readings are made until you start the motor.
          </Notice>
        )}
        {sim.warnings.map((w) => (
          <Notice key={w} tone="warn">
            {warningText(w, exp.nameplate)}
          </Notice>
        ))}
        {!p.armed && (
          <Notice tone="info">
            Supply and Start stay locked until the safety checklist is complete ({p.ticked} of {p.total} ticked).{' '}
            <button type="button" onClick={p.onGoProcedure} className="font-medium text-primary underline-offset-4 hover:underline">
              Go to Procedure
            </button>
          </Notice>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="glass relative h-[340px] min-w-0 overflow-hidden rounded-lg md:h-[520px]">
            {p.view === 'scene' ? (
              <SceneView
                running={rig.running && !rig.paused}
                speedRpm={sim.speedRpm}
                loadFraction={p.loadFraction}
                emergency={rig.emergency}
                cutaway={p.cutaway}
                selectedId={p.part}
                highlightIds={p.highlight}
                onSelect={p.onPart}
                resetViewToken={rig.viewToken}
              />
            ) : (
              <div className="h-full overflow-auto p-3">
                <CircuitDiagram highlightIds={p.highlight} selectedId={p.part} onSelect={p.onPart} />
              </div>
            )}
          </div>

          <div className="glass flex flex-wrap items-center gap-2 rounded-lg px-2 py-2">
            <button type="button" className="btn-chip" aria-pressed={p.view === 'scene'} onClick={() => p.onView('scene')}>
              <Box className="size-3.5" /> 3D view
            </button>
            <button
              type="button"
              className="btn-chip"
              aria-pressed={p.view === 'circuit'}
              onClick={() => p.onView('circuit')}
            >
              Circuit diagram
            </button>
            {p.view === 'scene' && (
              <>
                <button
                  type="button"
                  className="btn-chip"
                  aria-pressed={p.cutaway}
                  onClick={() => p.onCutaway(!p.cutaway)}
                >
                  Cutaway
                </button>
                <button type="button" className="btn-chip" onClick={rig.resetView}>
                  Reset view
                </button>
              </>
            )}
            <span className="ml-auto hidden text-xs text-muted-foreground sm:block">
              {p.view === 'scene' ? 'Click a part to select it' : 'Schematic for teaching. The approved wiring diagram governs lab work.'}
            </span>
          </div>
        </div>

        <aside className="flex min-w-0 flex-col gap-3">
          <section className="glass rounded-lg p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Readings</h3>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">simulated</span>
            </div>
            <dl className="num mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
              {readings.map(([label, value, unit]) => (
                <div key={label} className="min-w-0">
                  <dt className="truncate text-[11px] text-muted-foreground">{label}</dt>
                  <dd className="text-[15px] font-medium">
                    {value}
                    {unit && <span className="ml-1 text-[11px] font-normal text-muted-foreground">{unit}</span>}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Load {Math.round(p.loadFraction * 100)}% of rated torque. Readings are zero while the motor is stopped.
            </p>
          </section>

          <section className="glass space-y-4 rounded-lg p-4">
            <h3 className="text-sm font-semibold">Controls</h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="btn-chip"
                aria-pressed={rig.supplyOn}
                disabled={supplyLocked}
                onClick={() => rig.setSupply(!rig.supplyOn)}
              >
                <Power className="size-3.5" /> Supply {rig.supplyOn ? 'on' : 'off'}
              </button>
              <Button variant="outline" size="sm" onClick={rig.reset}>
                <RotateCcw /> Reset rig
              </Button>
              <Button onClick={rig.start} disabled={!rig.canStart}>
                <Play /> Start
              </Button>
              <Button variant="outline" onClick={rig.stop} disabled={!rig.running}>
                <Square /> Stop
              </Button>
              <Button
                variant="outline"
                onClick={rig.togglePause}
                disabled={rig.emergency || (!rig.running && !rig.paused)}
              >
                <Pause /> {rig.paused ? 'Resume' : 'Pause'}
              </Button>
              <Button variant="destructive" onClick={rig.eStop} disabled={rig.emergency}>
                <OctagonAlert /> Emergency stop
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Load on the brake</p>
              <div className="flex items-center gap-2">
                <Button
                  size="icon-sm"
                  variant="outline"
                  aria-label="Decrease load"
                  onClick={() => rig.bump(-1)}
                  disabled={!rig.canLoad || rig.loadKg <= 0}
                >
                  <Minus />
                </Button>
                <span className="num flex-1 text-center text-lg font-semibold">
                  {rig.loadKg.toFixed(1)}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">kg</span>
                </span>
                <Button
                  size="icon-sm"
                  variant="outline"
                  aria-label="Increase load"
                  onClick={() => rig.bump(1)}
                  disabled={!rig.canLoad || rig.loadKg >= LOAD_MAX_KG}
                >
                  <Plus />
                </Button>
              </div>
              <div className="flex gap-1.5" role="group" aria-label="Load step">
                {LOAD_STEPS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="btn-chip num flex-1"
                    aria-pressed={rig.step === s}
                    onClick={() => rig.setStep(s)}
                  >
                    {s} kg
                  </button>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={rig.release}
                disabled={!rig.canLoad || rig.loadKg === 0}
              >
                Release load
              </Button>
            </div>
          </section>

          <section className="glass space-y-3 rounded-lg p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Selected part</h3>
              {p.part && (
                <button
                  type="button"
                  onClick={() => p.onPart(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
            <label className="sr-only" htmlFor="induction-part">
              Choose a part
            </label>
            <select
              id="induction-part"
              value={p.part ?? ''}
              onChange={(e) => p.onPart(isComponentId(e.target.value) ? e.target.value : null)}
              className="w-full rounded-md border border-border/70 bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-primary"
            >
              <option value="">Choose a part</option>
              {exp.components.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            {info ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">{info.label}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{info.description}</p>
                <ul className="space-y-1">
                  {info.specs.map((s) => (
                    <li key={s} className="num text-xs text-muted-foreground">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Click a part on the bench, or choose one from the list.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Notice({ tone, children }: { tone: 'danger' | 'warn' | 'info'; children: ReactNode }) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-md border px-3 py-2 text-sm leading-relaxed',
        tone === 'danger' && 'border-destructive/40 bg-destructive/10 text-destructive',
        tone === 'warn' && 'border-primary/40 bg-primary/10 text-foreground',
        tone === 'info' && 'border-border bg-foreground/[0.035] text-muted-foreground',
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
