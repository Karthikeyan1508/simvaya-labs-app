'use client';

import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Pause, Play, RotateCcw, Tag } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ArcGauge } from '@/components/lab/arc-gauge';
import { StepPicker } from '@/components/lab/step-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import type { ProcedureStep } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ZENER_PARTS } from '@/lib/zener/content';
import type { OperatingPoint } from '@/lib/zener/solver';
import { VS_MAX_V } from '@/lib/zener/solver';
import type { Wiring } from '@/lib/zener/wiring';
import { ZenerSchematic } from './zener-schematic';
import type { ZenerReadings } from './zener-parts';
import { ZenerScene } from './zener-scene';
import { ZenerWireBench } from './zener-wire-bench';
import { ZENER_VIEW_LABEL, ZENER_VIEW_NAMES, type ZenerViewName } from './zener-views';

export type ZenerMode = 'simulate' | 'wire';

export const RL_MIN = 100;
export const RL_MAX = 2000;
const LOADS: { label: string; ohm: number | null }[] = [
  { label: 'No load', ohm: null },
  { label: '1 kΩ', ohm: 1000 },
  { label: '470 Ω', ohm: 470 },
  { label: '220 Ω', ohm: 220 },
];
const STEP_MS = 3500;

// Slider values come back as a number or an array depending on the control.
const first = (v: number | readonly number[]) => (typeof v === 'number' ? v : v[0]);

export interface ZenerSimulationProps {
  vs: number;
  onVs: (v: number) => void;
  rl: number | null;
  onRl: (v: number | null) => void;
  switchOn: boolean;
  onSwitch: (on: boolean) => void;
  op: OperatingPoint | null; // solver result for the current setting (null when invalid)
  messages: string[]; // reasons the setting is invalid
  readings: ZenerReadings | null; // what the meters show (null with the switch open)
  hideValues: boolean;
  onHide: (v: boolean) => void;
  steps: { text: string; highlight: string[]; pass: boolean }[];
  stepIndex: number;
  onStep: (i: number) => void;
  playing: boolean;
  onPlaying: (p: boolean) => void;
  view: { name: ZenerViewName; nonce: number };
  onView: (name: ZenerViewName) => void;
  selected: string | null;
  onSelect: (id: string | null) => void;
  showLabels: boolean;
  onLabels: (v: boolean) => void;
  onRecord: () => void;
  onAutoRecord: () => void;
  mode: ZenerMode; // Simulate: the knobs drive the bench. Wire it yourself: the student's own wires drive the meters.
  onMode: (m: ZenerMode) => void;
  wiring: Wiring;
  onWiring: (w: Wiring) => void;
  voiceHighlight?: string[] | null; // set by the voice assistant; replaces the step's highlight until cleared
}

// Pelton-style simulation: the step bar, the readings as gauges, the 3D bench with its view presets, labels and
// part picking, and the control desk on the right.
export function ZenerSimulation(p: ZenerSimulationProps) {
  const root = useRef<HTMLDivElement>(null);
  const [isFull, setIsFull] = useState(false);
  const highlight = p.voiceHighlight ?? p.steps[p.stepIndex]?.highlight ?? [];
  const part = ZENER_PARTS.find((x) => x.id === p.selected) ?? null;
  const procedure: ProcedureStep[] = p.steps.map((s, i) => ({ step: i + 1, text: s.text, highlight: s.highlight }));
  const shown = p.op && p.switchOn ? p.op : null;

  // Playing walks the steps; it stops after the last one.
  useEffect(() => {
    if (!p.playing) return;
    const id = window.setInterval(() => {
      if (p.stepIndex >= p.steps.length - 1) {
        p.onPlaying(false);
        return;
      }
      p.onStep(p.stepIndex + 1);
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [p.playing, p.stepIndex, p.steps.length]);

  // The browser's own full screen. Escape leaves it and the state follows.
  useEffect(() => {
    const onChange = () => setIsFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void root.current?.requestFullscreen?.().catch(() => undefined);
  };

  const vOut = shown?.vOut ?? null;
  const gauges = [
    { label: 'Vs (across Rs)', unit: 'V', value: shown ? p.vs - shown.vOut : 0, max: 15 },
    { label: 'Vout', unit: 'V', value: vOut ?? 0, max: 15 },
    { label: 'Iz (Zener)', unit: 'mA', value: shown ? shown.iZ * 1000 : 0, max: 100, digits: 1 },
    { label: 'IL (load)', unit: 'mA', value: shown ? shown.iL * 1000 : 0, max: 60, digits: 1 },
  ];

  return (
    <div ref={root} className={cn('flex flex-col gap-3', isFull && 'h-dvh overflow-y-auto bg-background p-3')}>
      <div className="flex flex-wrap items-center gap-2">
        {(['simulate', 'wire'] as const).map((m) => (
          <button
            key={m}
            type="button"
            className="btn-chip px-3 text-xs"
            aria-pressed={p.mode === m}
            onClick={() => p.onMode(m)}
          >
            {m === 'simulate' ? 'Simulate' : 'Wire it yourself'}
          </button>
        ))}
      </div>

      <div className="glass flex items-center gap-2 rounded-lg px-2 py-2">
        <StepPicker steps={procedure} done={p.steps.map((s) => s.pass)} index={p.stepIndex} onChange={p.onStep} />

        <span className="h-7 w-px shrink-0 bg-border" />

        <div className="flex shrink-0 items-center gap-0.5">
          <Button size="icon-sm" variant="ghost" onClick={() => p.onStep(Math.max(0, p.stepIndex - 1))} aria-label="Previous step">
            <ChevronLeft />
          </Button>
          <Button size="icon-sm" onClick={() => p.onPlaying(!p.playing)} aria-label={p.playing ? 'Pause' : 'Play'}>
            {p.playing ? <Pause /> : <Play />}
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => p.onStep(Math.min(p.steps.length - 1, p.stepIndex + 1))}
            aria-label="Next step"
          >
            <ChevronRight />
          </Button>
        </div>

        <Button
          size="icon-sm"
          variant="ghost"
          onClick={toggleFull}
          aria-label={isFull ? 'Exit full screen' : 'Full screen'}
          title={isFull ? 'Exit full screen (Esc)' : 'Full screen'}
          className="ml-auto"
        >
          {isFull ? <Minimize2 /> : <Maximize2 />}
        </Button>
      </div>

      <div className="grid gap-3 xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-3">
          {p.mode === 'wire' ? (
            <ZenerWireBench
              wiring={p.wiring}
              onWiring={p.onWiring}
              vs={p.vs}
              switchOn={p.switchOn}
              rl={p.rl}
              op={p.op}
            />
          ) : (
            <>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {gauges.map((g) => (
                <ArcGauge key={g.label} label={g.label} unit={g.unit} value={p.hideValues ? 0 : g.value} max={g.max} digits={g.digits} />
              ))}
            </div>

            <section className="glass relative h-[380px] overflow-hidden rounded-lg xl:h-[460px]">
              <ZenerScene
                readings={p.readings}
                rl={p.rl}
                regulating={Boolean(shown?.regulating)}
                switchOn={p.switchOn}
                view={p.view}
                highlight={highlight}
                selected={p.selected}
                onSelect={p.onSelect}
                showLabels={p.showLabels}
              />

              {/* HUD: status chips */}
              <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap gap-1.5">
                <span className="num glass flex items-center gap-2 rounded-md px-2.5 py-1 text-[11px]">
                  <span className={cn('size-2 rounded-full', p.switchOn ? 'led bg-primary' : 'bg-muted-foreground/40')} />
                  {p.switchOn ? 'LIVE' : 'OFF'}
                </span>
                <span className="num glass rounded-md px-2.5 py-1 text-[11px]">
                  {p.rl === null ? 'No load' : `RL ${p.rl} Ω`}
                </span>
                <span className="num glass rounded-md px-2.5 py-1 text-[11px]">
                  Step {p.stepIndex + 1}/{p.steps.length}
                </span>
              </div>

              {/* HUD: dock. Views on the left, labels and reset on the right. */}
              <div className="glass absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md px-3 py-2">
                <div className="flex flex-wrap gap-1.5">
                  {ZENER_VIEW_NAMES.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => p.onView(v)}
                      aria-pressed={p.view.name === v}
                      className="btn-chip px-2.5 text-xs"
                    >
                      {ZENER_VIEW_LABEL[v]}
                    </button>
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Tag className="size-4 text-primary" />
                    <span className="text-xs font-medium">Labels</span>
                    <Switch checked={p.showLabels} onCheckedChange={(c) => p.onLabels(Boolean(c))} aria-label="Labels" />
                  </div>
                  <Button size="sm" variant="outline" onClick={() => p.onView('iso')}>
                    <RotateCcw /> Reset view
                  </Button>
                </div>
              </div>
            </section>

            <Card className="glass gap-0 py-0 ring-0">
              <CardContent className="py-4 text-sm">
                {part ? (
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium">{part.label}</p>
                      <Button size="sm" variant="ghost" onClick={() => p.onSelect(null)}>
                        Clear
                      </Button>
                    </div>
                    <p className="text-muted-foreground">{part.description}</p>
                    <ul className="num list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                      {part.specs.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Click a part on the bench, or its label, to see what it does.</p>
                )}
              </CardContent>
            </Card>
            </>
          )}
        </div>

        <Card className="glass h-fit gap-0 overflow-hidden py-0 ring-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-base">Control desk</CardTitle>
            <CardDescription>Set the bench, then record a reading.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 py-5">
            <div className="flex items-center justify-between rounded-lg bg-foreground/[0.035] p-3">
              <div className="flex items-center gap-3">
                <span className={cn('size-2.5 rounded-full', p.switchOn ? 'led bg-primary' : 'bg-muted-foreground/40')} />
                <div>
                  <p className="text-sm font-medium">Supply switch</p>
                  <p className="num text-xs text-muted-foreground">{p.switchOn ? 'closed · supply on' : 'open · supply off'}</p>
                </div>
              </div>
              <Switch checked={p.switchOn} onCheckedChange={(c) => p.onSwitch(Boolean(c))} aria-label="Supply switch" />
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-medium">DC supply Vs</p>
                <span className="num text-sm">{p.vs.toFixed(1)} V</span>
              </div>
              <Slider
                value={[p.vs]}
                min={0}
                max={VS_MAX_V}
                step={0.1}
                onValueChange={(v) => p.onVs(first(v))}
                aria-label="Input voltage"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-medium">Rheostat RL</p>
                <span className="num text-sm">{p.rl === null ? 'open' : `${p.rl} Ω`}</span>
              </div>
              <Slider
                value={[p.rl ?? RL_MAX]}
                min={RL_MIN}
                max={RL_MAX}
                step={10}
                onValueChange={(v) => p.onRl(first(v))}
                aria-label="Load resistance"
              />
              <div className="flex flex-wrap gap-1.5">
                {LOADS.map((l) => (
                  <Button
                    key={l.label}
                    size="sm"
                    variant={p.rl === l.ohm ? 'default' : 'outline'}
                    aria-pressed={p.rl === l.ohm}
                    onClick={() => p.onRl(l.ohm)}
                  >
                    {l.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm">Hide readings</p>
              <Switch checked={p.hideValues} onCheckedChange={(c) => p.onHide(Boolean(c))} aria-label="Hide readings" />
            </div>

            {!p.switchOn && <p className="text-sm text-muted-foreground">Switch open: no supply, so every meter reads zero.</p>}
            {p.messages.length > 0 && (
              <ul className="space-y-1 text-sm text-destructive">
                {p.messages.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            )}
            {p.switchOn && p.op && p.op.warnings.length > 0 && (
              <ul className="space-y-1 text-sm text-amber-600 dark:text-amber-400">
                {p.op.warnings.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            )}

            <div className="flex flex-col gap-2">
              <Button onClick={p.onRecord} disabled={!p.op || !p.switchOn}>
                Record reading
              </Button>
              <Button variant="outline" onClick={p.onAutoRecord}>
                Auto-record manual tables
              </Button>
            </div>

            <div className="rounded-md border border-border p-3">
              <ZenerSchematic vOut={vOut} iZ={shown?.iZ ?? null} regulating={Boolean(shown?.regulating)} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
