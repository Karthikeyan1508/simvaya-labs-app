'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { describeStep, type SortStep } from './engine';

export interface StepListProps {
  steps: SortStep[];
  at: number; // number of steps applied; the active line is at - 1
  onJump: (n: number) => void;
}

// Every step in plain English. Click a line to jump to it.
export function StepList({ steps, at, onJump }: StepListProps) {
  const box = useRef<HTMLDivElement>(null);

  // Keep the active line in view inside the list only, so the page does not scroll.
  useEffect(() => {
    const list = box.current;
    const el = list?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!list || !el) return;
    list.scrollTop = el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2;
  }, [at]);

  return (
    <div className="glass flex min-h-0 flex-col rounded-lg xl:flex-1">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-medium">Steps</p>
        <p className="num text-xs text-muted-foreground">{steps.length} in total</p>
      </div>
      <div ref={box} className="relative min-h-0 flex-1 overflow-y-auto p-1.5 max-h-72 xl:max-h-none">
        {steps.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing to sort.</p>}
        <ol>
          {steps.map((s, k) => {
            const active = k === at - 1;
            return (
              <li key={k}>
                <button
                  type="button"
                  onClick={() => onJump(k + 1)}
                  aria-current={active ? 'step' : undefined}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors',
                    active ? 'bg-primary/10 font-medium text-foreground' : 'text-foreground/80 hover:bg-foreground/[0.05]',
                  )}
                >
                  <span
                    className={cn(
                      'num mt-px w-7 shrink-0 text-right text-[11px]',
                      active ? 'text-primary' : 'text-muted-foreground',
                    )}
                  >
                    {k + 1}
                  </span>
                  <span className="leading-relaxed">{describeStep(s)}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
