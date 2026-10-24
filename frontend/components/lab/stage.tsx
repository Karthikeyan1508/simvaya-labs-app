'use client';

import dynamic from 'next/dynamic';
import { ChevronUp, Eye, Tag } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { VIEW_NAMES, type ViewName } from '@/components/pelton/views';
import { VIEW_LABEL } from '@/lib/lab-logic';
import type { ComponentInfo, RigState } from '@/lib/types';
import { cn } from '@/lib/utils';

// The WebGL scene only runs in the browser.
const PeltonScene = dynamic(() => import('@/components/pelton/PeltonScene'), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-muted-foreground">Loading rig…</div>,
});

export interface StageProps {
  className?: string;
  components: ComponentInfo[];
  state: RigState;
  highlight: string[];
  selected: string | null;
  onSelect: (id: string) => void;
  explode: number;
  onExplode: (v: number) => void;
  showLabels: boolean;
  onLabels: (v: boolean) => void;
  view: { name: ViewName; nonce: number };
  onView: (v: ViewName) => void;
  step: number;
  totalSteps: number;
  popupContainer?: HTMLElement;
}

// Fixed studio backdrop. The translucent water blends with this, not with the page, so the rig looks the same in both themes.
const STUDIO = '#3d424b';

export function Stage(p: StageProps) {
  const [viewsOpen, setViewsOpen] = useState(false);

  return (
    <section className={cn('glass relative overflow-hidden rounded-lg', p.className)}>
      <div className="absolute inset-0" style={{ backgroundColor: STUDIO }} />
      <div className="absolute inset-0">
        <PeltonScene
          components={p.components}
          state={p.state}
          highlight={p.highlight}
          selected={p.selected}
          onSelect={p.onSelect}
          explode={p.explode}
          showLabels={p.showLabels}
          view={p.view}
        />
      </div>

      {/* HUD: status chips */}
      <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap gap-1.5">
        <Badge variant="outline" className="num gap-2 border-transparent bg-card/70 px-2.5 py-1 text-[11px] backdrop-blur">
          <span className={cn('size-2 rounded-full', p.state.pumpOn ? 'led bg-primary' : 'bg-muted-foreground/40')} />
          {p.state.pumpOn ? 'LIVE' : 'IDLE'}
        </Badge>
        <Badge variant="outline" className="num border-transparent bg-card/70 px-2.5 py-1 text-[11px] backdrop-blur">
          Nozzle {p.state.nozzleStep}/8
        </Badge>
        <Badge variant="outline" className="num border-transparent bg-card/70 px-2.5 py-1 text-[11px] backdrop-blur">
          Step {p.step}/{p.totalSteps}
        </Badge>
      </div>

      {/* HUD: dock. Camera view picker on the left, then explode, labels and reset. */}
      <div className="glass absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-md px-4 py-2.5">
        <Popover open={viewsOpen} onOpenChange={setViewsOpen}>
          <PopoverTrigger className="btn-chip min-w-36 px-3">
            <span className="text-xs text-muted-foreground">View</span>
            <span className="font-medium text-foreground">{VIEW_LABEL[p.view.name]}</span>
            <ChevronUp className={cn('size-3.5 transition-transform duration-200', viewsOpen && 'rotate-180')} />
          </PopoverTrigger>
          <PopoverContent
            container={p.popupContainer}
            align="start"
            side="top"
            sideOffset={10}
            className="w-auto gap-0 rounded-lg bg-popover/90 p-2 shadow-xl ring-0 backdrop-blur-xl"
          >
            <div className="grid grid-cols-4 gap-1.5">
              {VIEW_NAMES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    p.onView(v);
                    setViewsOpen(false);
                  }}
                  aria-pressed={p.view.name === v}
                  className="btn-chip px-3"
                >
                  {VIEW_LABEL[v]}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex min-w-[200px] flex-1 items-center gap-3">
          <Eye className="size-4 text-primary" />
          <span className="text-xs font-medium">Explode</span>
          <Slider
            value={[p.explode]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={(v) => p.onExplode(typeof v === 'number' ? v : v[0])}
            aria-label="Explode"
          />
          <span className="num w-10 text-right text-xs">{Math.round(p.explode * 100)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Tag className="size-4 text-primary" />
          <span className="text-xs font-medium">Labels</span>
          <Switch checked={p.showLabels} onCheckedChange={(c) => p.onLabels(Boolean(c))} aria-label="Labels" />
        </div>
        <Button size="sm" variant="outline" onClick={() => p.onView('iso')}>
          Reset view
        </Button>
      </div>
    </section>
  );
}
