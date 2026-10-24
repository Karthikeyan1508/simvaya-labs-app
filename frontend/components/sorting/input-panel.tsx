'use client';

import { Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import type { Preset } from './engine';

const PRESETS: { id: Preset; label: string }[] = [
  { id: 'random', label: 'Random' },
  { id: 'nearly', label: 'Nearly sorted' },
  { id: 'reversed', label: 'Reversed' },
];

const first = (v: number | readonly number[]) => (typeof v === 'number' ? v : v[0]);

export interface InputPanelProps {
  size: number;
  preset: Preset;
  onSize: (n: number) => void;
  onPreset: (p: Preset) => void;
  onShuffle: () => void;
}

export function InputPanel(p: InputPanelProps) {
  return (
    <Card className="glass gap-0 overflow-hidden py-0 ring-0">
      <CardHeader className="border-b py-4">
        <CardTitle className="text-base">Input</CardTitle>
        <CardDescription>Pick an array, then step through the sort.</CardDescription>
        <CardAction>
          <Button size="sm" onClick={p.onShuffle}>
            Shuffle <Shuffle />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-5 py-4">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Items</Label>
            <span className="num text-sm font-semibold text-primary">{p.size}</span>
          </div>
          <Slider
            value={[p.size]}
            min={6}
            max={30}
            step={1}
            onValueChange={(v) => p.onSize(first(v))}
            aria-label="Number of items"
          />
        </div>

        <div className="space-y-2.5">
          <Label className="text-xs font-medium">Preset</Label>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => p.onPreset(x.id)}
                aria-pressed={p.preset === x.id}
                className="btn-chip"
              >
                {x.label}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
