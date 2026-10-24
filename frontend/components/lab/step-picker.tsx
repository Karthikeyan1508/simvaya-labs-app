'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { ProcedureStep } from '@/lib/types';
import { cn } from '@/lib/utils';

// The current step, with a list of every step in a popover. Pick one to jump the rig to it.
export function StepPicker({
  steps,
  done,
  index,
  onChange,
  container,
}: {
  steps: ProcedureStep[];
  done: boolean[];
  index: number;
  onChange: (i: number) => void;
  container?: HTMLElement;
}) {
  const [open, setOpen] = useState(false);
  const current = steps[index];
  const doneCount = done.filter(Boolean).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'min-w-0 flex-1 rounded-md px-3 py-1.5 text-left outline-none transition-colors hover:bg-foreground/[0.05] focus-visible:bg-foreground/[0.05]',
          open && 'bg-foreground/[0.05]',
        )}
      >
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          Step {index + 1} of {steps.length}
          <ChevronDown className={cn('size-3.5 transition-transform duration-200', open && 'rotate-180')} />
        </span>
        <span className="mt-0.5 block truncate text-sm font-medium">{current?.text}</span>
      </PopoverTrigger>

      <PopoverContent
        container={container}
        align="start"
        sideOffset={8}
        className="w-[min(92vw,560px)] gap-0 rounded-lg bg-popover p-0 shadow-xl ring-0"
      >
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
          <p className="text-sm font-medium">Procedure</p>
          <p className="num text-xs text-muted-foreground">
            {doneCount}/{steps.length} done
          </p>
        </div>

        <ol className="max-h-[360px] overflow-y-auto px-1.5 pb-1.5">
          {steps.map((s, i) => {
            const active = i === index;
            const isDone = done[i];
            return (
              <li key={s.step}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(i);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-md px-2.5 py-2 text-left transition-colors',
                    active ? 'bg-primary/10' : 'hover:bg-foreground/[0.05]',
                  )}
                >
                  <span
                    className={cn(
                      'num mt-px grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-medium',
                      isDone
                        ? 'bg-primary text-primary-foreground'
                        : active
                          ? 'bg-primary/20 text-primary'
                          : 'bg-foreground/[0.06] text-muted-foreground',
                    )}
                  >
                    {isDone ? <Check className="size-3" /> : s.step}
                  </span>
                  <span
                    className={cn(
                      'text-sm leading-relaxed',
                      active ? 'font-medium text-foreground' : 'text-foreground/80',
                    )}
                  >
                    {s.text}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </PopoverContent>
    </Popover>
  );
}
