'use client';

import { cn } from '@/lib/utils';

export interface BarChartProps {
  arr: number[];
  pivot: number; // -1 when no pivot is active
  i: number; // boundary, -1 when unused
  j: number; // scanning index, -1 when unused
  kind: string; // type of the current step, or '' at the start
  sorted: Set<number>;
  lo: number;
  hi: number;
}

// Bars sized by value. Pivot is ink, the compared and swapped bars are amber, placed bars are a calm grey-ink.
export function BarChart({ arr, pivot, i, j, kind, sorted, lo, hi }: BarChartProps) {
  const max = Math.max(...arr, 1);
  const showValues = arr.length <= 16;
  const swapping = kind === 'swap';
  const comparing = kind === 'compare';

  return (
    <div className="flex h-72 gap-[3px] sm:gap-1.5" role="img" aria-label={`Array of ${arr.length} bars`}>
      {arr.map((v, k) => {
        const inSegment = kind !== '' && k >= lo && k <= hi;
        const amber = (comparing && k === j) || (swapping && (k === i || k === j));
        const bar =
          k === pivot
            ? 'bg-foreground'
            : amber
              ? 'orange-gradient'
              : sorted.has(k)
                ? 'bg-foreground/55'
                : 'bg-muted-foreground/35';
        const tag = `${k === i ? 'i' : ''}${k === j ? 'j' : ''}${k === pivot ? 'p' : ''}`;
        return (
          <div
            key={k}
            className={cn('flex min-w-0 flex-1 flex-col rounded-md', inSegment && 'bg-foreground/[0.04]')}
          >
            <span className="num h-5 text-center text-[10px] leading-5 text-muted-foreground">
              {showValues ? v : ''}
            </span>
            <div className="flex flex-1 items-end">
              <div
                className={cn(
                  'w-full rounded-t-[3px] transition-[height,background-color] duration-300 ease-out',
                  bar,
                  swapping && amber && 'ring-2 ring-primary/40',
                )}
                style={{ height: `${Math.max(4, (v / max) * 100)}%` }}
              />
            </div>
            <span className="num h-5 text-center text-[9px] leading-5 font-semibold text-primary">{tag}</span>
          </div>
        );
      })}
    </div>
  );
}
