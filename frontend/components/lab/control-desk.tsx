'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Kbd } from '@/components/ui/kbd';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { fmt } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface ControlDeskProps {
  pumpOn: boolean;
  onPump: (on: boolean) => void;
  nozzleStep: number;
  onNozzle: (k: number) => void;
  deadWeightKg: number;
  onDeadWeight: (v: number) => void;
  springKg: number;
  onSpring: (v: number) => void;
  netLoadKg: number;
  busy: boolean;
  onRecord: () => void;
  onAutoRun: () => void;
}

// Slider values come back as a number or an array depending on the control.
const first = (v: number | readonly number[]) => (typeof v === 'number' ? v : v[0]);

export function ControlDesk(p: ControlDeskProps) {
  const lit = Math.round(p.deadWeightKg / 4); // ten discs of 4 kg each

  return (
    <Card className="glass gap-0 overflow-hidden py-0 ring-0">
      <CardHeader className="border-b py-4">
        <CardTitle className="text-base">Control desk</CardTitle>
        <CardDescription>Set the rig, then record a reading.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 py-5">
        <div className="flex items-center justify-between rounded-lg bg-foreground/[0.035] p-3">
          <div className="flex items-center gap-3">
            <span
              className={cn('size-2.5 rounded-full', p.pumpOn ? 'led bg-primary' : 'bg-muted-foreground/40')}
            />
            <div>
              <p className="text-sm font-medium">Centrifugal pump</p>
              <p className="num text-xs text-muted-foreground">{p.pumpOn ? '3.00 kg/cm² · running' : 'stopped'}</p>
            </div>
          </div>
          <Switch checked={p.pumpOn} onCheckedChange={(c) => p.onPump(Boolean(c))} aria-label="Pump" />
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Nozzle opening</Label>
            <span className="num text-sm font-semibold text-primary">{p.nozzleStep}/8</span>
          </div>
          <div className="grid grid-cols-8 gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => p.onNozzle(k)}
                aria-pressed={k === p.nozzleStep}
                className="btn-chip num w-full px-0"
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Dead weights T1</Label>
            <span className="num text-sm font-semibold">{fmt(p.deadWeightKg, 1)} kg</span>
          </div>
          <Slider
            value={[p.deadWeightKg]}
            min={0}
            max={40}
            step={0.5}
            onValueChange={(v) => p.onDeadWeight(first(v))}
            aria-label="Dead weights T1"
          />
          <div className="flex gap-1" aria-label={`${lit} of 10 discs on the hanger`}>
            {Array.from({ length: 10 }).map((_, i) => (
              <span key={i} className={cn('h-2.5 flex-1 rounded-sm', i < lit ? 'fill-gradient' : 'bg-muted')} />
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Spring balance T2</Label>
            <span className="num text-sm font-semibold">{fmt(p.springKg, 1)} kg</span>
          </div>
          <Slider
            value={[p.springKg]}
            min={0}
            max={40}
            step={0.5}
            onValueChange={(v) => p.onSpring(first(v))}
            aria-label="Spring balance T2"
          />
        </div>

        <div className="relative overflow-hidden rounded-lg bg-foreground/[0.035] p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Net load T = T1 + T0 − T2
          </p>
          <p className="num mt-1 text-3xl font-semibold tracking-tight">
            <span className="text-gradient-orange">{fmt(p.netLoadKg, 2)}</span>
            <span className="ml-1.5 text-base text-muted-foreground">kg</span>
          </p>
        </div>

        <div className="grid gap-2">
          <Button onClick={p.onRecord} disabled={!p.pumpOn || p.busy} className="w-full justify-between">
            Record row <Kbd className="bg-black/10 text-current">R</Kbd>
          </Button>
          <Button variant="outline" onClick={p.onAutoRun} disabled={p.busy} className="w-full justify-between">
            Sweep 12 loads <Kbd>A</Kbd>
          </Button>
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Readings come from the simplified rig model on the backend. Not calibrated.
        </p>
      </CardContent>
    </Card>
  );
}
