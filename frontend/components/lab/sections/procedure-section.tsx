'use client';

import { Check, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ComponentInfo, ProcedureStep } from '@/lib/types';
import { cn } from '@/lib/utils';
import { SectionHead } from '../section-head';

export function ProcedureSection({
  steps,
  stepIndex,
  done,
  components,
  onToggle,
  onOpen,
}: {
  steps: ProcedureStep[];
  stepIndex: number;
  done: boolean[];
  components: ComponentInfo[];
  onToggle: (i: number) => void;
  onOpen: (i: number) => void;
}) {
  const label = (id: string) => components.find((c) => c.id === id)?.label ?? id;
  const doneCount = done.filter(Boolean).length;

  return (
    <div className="space-y-8">
      <SectionHead
        title="Procedure"
        subtitle="Follow the nine steps from the lab sheet. Steps tick themselves when the rig shows the change."
        actions={<span className="num text-sm text-muted-foreground">{doneCount}/{steps.length} done</span>}
      />

      <ol className="max-w-4xl space-y-2">
        {steps.map((s, i) => {
          const isDone = done[i];
          const isActive = i === stepIndex;
          return (
            <li
              key={s.step}
              className={cn(
                'flex gap-4 rounded-md px-4 py-3.5 transition-colors',
                isActive ? 'bg-primary/10' : 'bg-foreground/[0.035]',
              )}
            >
              <button
                type="button"
                onClick={() => onToggle(i)}
                aria-label={`Mark step ${s.step} ${isDone ? 'not done' : 'done'}`}
                aria-pressed={isDone}
                className="btn-chip num mt-0.5 size-8 shrink-0 px-0 text-xs"
              >
                {isDone ? <Check className="size-3.5" /> : s.step}
              </button>

              <div className="min-w-0 flex-1 space-y-2">
                <p className={cn('text-[15px] leading-relaxed', isDone && !isActive && 'text-muted-foreground')}>
                  {s.text}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {s.highlight.map((id) => (
                    <span key={id} className="rounded-sm bg-foreground/[0.05] px-1.5 py-0.5 text-[11px] text-muted-foreground">
                      {label(id)}
                    </span>
                  ))}
                </div>
              </div>

              <Button variant="ghost" size="sm" onClick={() => onOpen(i)} className="shrink-0 self-start">
                <Play /> Open
              </Button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
