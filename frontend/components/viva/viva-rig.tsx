'use client';

import dynamic from 'next/dynamic';
import type { ComponentInfo, RigState } from '@/lib/types';

// The WebGL scene only runs in the browser.
const PeltonScene = dynamic(() => import('@/components/pelton/PeltonScene'), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-muted-foreground">Loading rig…</div>,
});

// The rig at rest. The viva never runs it; it only shows a part to name or lets the student click one.
const IDLE: RigState = { pumpOn: false, nozzleStep: 8, deadWeightKg: 0, springKg: 0, speedRpm: 0, p1: 0, p2: 0, pp: 0 };
const VIEW = { name: 'iso' as const, nonce: 0 };

// The Pelton rig inside the viva. `highlight` glows (name this part), `selected` marks the student's click, and part
// labels stay off so the picture does not give the answer away.
export function VivaRig({
  parts,
  highlight,
  selected,
  onPick,
  caption,
}: {
  parts: ComponentInfo[];
  highlight: string[];
  selected: string | null;
  onPick?: (id: string) => void;
  caption: string;
}) {
  return (
    <div className="shrink-0 border-t border-border/60">
      <p className="px-4 pt-3 text-xs font-medium text-muted-foreground">{caption}</p>
      <div className="relative m-3 h-56 shrink-0 overflow-hidden rounded-md md:h-64" style={{ backgroundColor: '#3d424b' }}>
        <PeltonScene
          components={parts}
          state={IDLE}
          highlight={highlight}
          selected={selected}
          onSelect={(id) => onPick?.(id)}
          explode={0}
          showLabels={false}
          view={VIEW}
        />
      </div>
    </div>
  );
}
