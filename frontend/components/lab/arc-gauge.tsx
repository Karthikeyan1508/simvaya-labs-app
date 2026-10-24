'use client';

import { useId } from 'react';
import { fmt } from '@/lib/format';

const R = 38;
const CIRC = 2 * Math.PI * R;
const SWEEP = CIRC * 0.75; // 270 degree dial

// Instrument-style dial: a 270 degree track with an amber gradient arc for the reading.
export function ArcGauge({
  label,
  unit,
  value,
  max,
  digits = 2,
}: {
  label: string;
  unit: string;
  value: number;
  max: number;
  digits?: number;
}) {
  const gid = useId();
  const frac = Math.min(1, Math.max(0, value / max));

  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-foreground/[0.035] px-3 py-3 text-center">
      <div className="relative size-[84px]">
        <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
          <defs>
            <linearGradient id={gid} x1="0" y1="0.5" x2="1" y2="0.5">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            style={{ stroke: 'var(--muted)' }}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${SWEEP} ${CIRC}`}
            transform="rotate(135 50 50)"
          />
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke={`url(#${gid})`}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${SWEEP * frac} ${CIRC}`}
            transform="rotate(135 50 50)"
            className="transition-[stroke-dasharray] duration-500"
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="num text-base font-semibold">{fmt(value, digits)}</span>
        </div>
      </div>
      <p className="text-xs font-medium">{label}</p>
      <p className="num text-[10.5px] text-muted-foreground">{unit}</p>
    </div>
  );
}
