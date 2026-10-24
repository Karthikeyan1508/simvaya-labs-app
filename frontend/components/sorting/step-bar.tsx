'use client';

import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

const first = (v: number | readonly number[]) => (typeof v === 'number' ? v : v[0]);

export interface StepBarProps {
  at: number;
  total: number;
  text: string;
  playing: boolean;
  speed: number;
  onSpeed: (v: number) => void;
  onPlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
}

// The step bar on top: where we are, then reset, prev, play, next, and the playback speed.
export function StepBar(p: StepBarProps) {
  return (
    <div className="glass flex flex-wrap items-center gap-2 rounded-lg px-2 py-2">
      <div className="min-w-0 flex-1 px-2 py-0.5">
        <p className="num text-xs font-medium text-muted-foreground">
          Step <span className="text-foreground">{p.at}</span> of {p.total}
        </p>
        <p className="mt-0.5 truncate text-sm font-medium" aria-live="polite">
          {p.text}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <Button size="icon-sm" variant="ghost" onClick={p.onReset} aria-label="Reset" title="Reset (R)">
          <RotateCcw />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={p.onPrev} aria-label="Previous step" title="Previous (←)">
          <ChevronLeft />
        </Button>
        <Button size="icon-sm" onClick={p.onPlay} aria-label={p.playing ? 'Pause' : 'Play'} title="Play or pause (Space)">
          {p.playing ? <Pause /> : <Play />}
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={p.onNext} aria-label="Next step" title="Next (→)">
          <ChevronRight />
        </Button>
      </div>

      <div className="flex w-full items-center gap-3 px-2 sm:w-44">
        <span className="num w-12 shrink-0 text-xs text-muted-foreground">{p.speed}/s</span>
        <Slider
          value={[p.speed]}
          min={1}
          max={20}
          step={1}
          onValueChange={(v) => p.onSpeed(first(v))}
          aria-label="Playback speed in steps per second"
        />
      </div>
    </div>
  );
}
