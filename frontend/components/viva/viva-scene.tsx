'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import type { ComponentInfo, RigState } from '@/lib/types';

// The lab's WebGL rig, read-only here. In point mode the markers show numbers only, so the part must be found by sight.
const PeltonScene = dynamic(() => import('@/components/pelton/PeltonScene'), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-white/70">Loading rig…</div>,
});

const REST: RigState = { pumpOn: false, nozzleStep: 8, deadWeightKg: 0, springKg: 0, speedRpm: 0, p1: 0, p2: 0, pp: 0 };
const VIEW = { name: 'iso' as const, nonce: 0 };

interface Props {
  parts: ComponentInfo[];
  mode: 'point' | 'highlight';
  highlight?: string;
  selected?: string | null;
  onPick?: (partId: string) => void;
}

export function VivaScene({ parts, mode, highlight, selected = null, onPick }: Props) {
  const components = useMemo(
    () => (mode === 'point' ? parts.map((c) => ({ ...c, label: '' })) : parts),
    [parts, mode],
  );
  const lit = useMemo(() => (mode === 'highlight' && highlight ? [highlight] : []), [mode, highlight]);

  return (
    <div className="relative aspect-4/3 w-full overflow-hidden rounded-lg bg-[#3d424b]">
      <PeltonScene
        components={components}
        state={REST}
        highlight={lit}
        selected={selected}
        explode={0}
        showLabels={mode === 'point'}
        view={VIEW}
        onSelect={(id) => onPick?.(id)}
      />
    </div>
  );
}
