'use client';

import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import type { ViewName } from '@/components/pelton/views';
import type { ComponentInfo, ProcedureStep, Readings, RigState } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ArcGauge } from '../arc-gauge';
import { ControlDesk, type ControlDeskProps } from '../control-desk';
import { Stage } from '../stage';
import { StepPicker } from '../step-picker';

export interface SimulationSectionProps {
  state: RigState;
  readings: Readings;
  components: ComponentInfo[];
  highlight: string[];
  selected: string | null;
  onSelect: (id: string) => void;
  explode: number;
  onExplode: (v: number) => void;
  showLabels: boolean;
  onLabels: (v: boolean) => void;
  view: { name: ViewName; nonce: number };
  onView: (v: ViewName) => void;
  steps: ProcedureStep[];
  done: boolean[];
  stepIndex: number;
  onStep: (i: number) => void;
  playing: boolean;
  onPlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  control: ControlDeskProps;
}

// Simulation: the step bar on top (step picker, then prev, play, next), gauges and the rig on the
// left, the operating panel on the right. Stacks on smaller screens.
export function SimulationSection(p: SimulationSectionProps) {
  const root = useRef<HTMLDivElement>(null);
  // 'native' is the browser's full screen. 'overlay' is the in-app fallback for when the browser refuses it.
  const [mode, setMode] = useState<'off' | 'native' | 'overlay'>('off');
  const full = mode !== 'off';
  // In the browser's own full screen only this element is visible, so menus must mount inside it.
  const popupLayer = mode === 'native' ? (root.current ?? undefined) : undefined;

  const enter = () => {
    const el = root.current;
    if (!el?.requestFullscreen) {
      setMode('overlay');
      return;
    }
    // Some browsers never answer the request, so the in-app view takes over after a short wait.
    let settled = false;
    const fallback = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      setMode('overlay');
    }, 800);
    el.requestFullscreen().then(
      () => {
        if (settled) {
          void document.exitFullscreen().catch(() => undefined);
          return;
        }
        settled = true;
        window.clearTimeout(fallback);
        setMode('native');
      },
      () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(fallback);
        setMode('overlay');
      },
    );
  };

  const leave = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    setMode('off');
  };

  // The browser leaves full screen by itself when Escape is pressed.
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setMode((m) => (m === 'native' ? 'off' : m));
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    if (mode !== 'overlay') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMode('off');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  const body = (
    <div
      ref={root}
      className={cn(
        'flex flex-col gap-3',
        full ? 'fixed inset-0 z-50 h-dvh overflow-y-auto bg-background p-3 md:p-5' : 'xl:h-full xl:min-h-0',
      )}
    >
      <div className="glass flex items-center gap-2 rounded-lg px-2 py-2">
        <StepPicker
          steps={p.steps}
          done={p.done}
          index={p.stepIndex}
          onChange={p.onStep}
          container={popupLayer}
        />

        <span className="h-7 w-px shrink-0 bg-border" />

        <div className="flex shrink-0 items-center gap-0.5">
          <Button size="icon-sm" variant="ghost" onClick={p.onPrev} aria-label="Previous step">
            <ChevronLeft />
          </Button>
          <Button size="icon-sm" onClick={p.onPlay} aria-label={p.playing ? 'Pause' : 'Play'}>
            {p.playing ? <Pause /> : <Play />}
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={p.onNext} aria-label="Next step">
            <ChevronRight />
          </Button>
        </div>

        <Button
          size="icon-sm"
          variant="ghost"
          onClick={full ? leave : enter}
          aria-label={full ? 'Exit full screen' : 'Full screen'}
          title={full ? 'Exit full screen (Esc)' : 'Full screen'}
          className="ml-auto"
        >
          {full ? <Minimize2 /> : <Maximize2 />}
        </Button>
      </div>

      <div className="grid gap-3 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-3 xl:min-h-0">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <ArcGauge label="Venturi throat" unit="P1 · kg/cm²" value={p.readings.p1} max={7} />
            <ArcGauge label="Venturi inlet" unit="P2 · kg/cm²" value={p.readings.p2} max={7} />
            <ArcGauge label="Penstock" unit="Pp · kg/cm²" value={p.readings.pp} max={7} />
            <ArcGauge label="Shaft speed" unit="N · rpm" value={p.readings.speedRpm} max={1000} digits={0} />
          </div>
          <Stage
            className="min-h-[360px] xl:min-h-0 xl:flex-1"
            components={p.components}
            state={p.state}
            highlight={p.highlight}
            selected={p.selected}
            onSelect={p.onSelect}
            explode={p.explode}
            onExplode={p.onExplode}
            showLabels={p.showLabels}
            onLabels={p.onLabels}
            view={p.view}
            onView={p.onView}
            step={p.stepIndex + 1}
            totalSteps={p.steps.length}
            popupContainer={popupLayer}
          />
        </div>

        <div className="xl:min-h-0 xl:overflow-y-auto">
          <ControlDesk {...p.control} />
        </div>
      </div>
    </div>
  );

  return mode === 'overlay' ? createPortal(body, document.body) : body;
}
