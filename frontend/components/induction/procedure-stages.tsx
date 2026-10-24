'use client';

import { Check, Play } from 'lucide-react';
import { SectionHead } from '@/components/lab/section-head';
import { Button } from '@/components/ui/button';
import type { ComponentId, ProcedureStage } from '@/lib/induction';
import type { EeeSectionId } from '@/lib/sections';
import { cn } from '@/lib/utils';

type StageId = ProcedureStage['id'];
export type StageFlags = Record<StageId, boolean>;

// What the student has done so far. Each stage ticks from one of these, never from a manual tick.
export interface StageFacts {
  theoryRead: boolean;
  partsSeen: boolean;
  circuitSeen: boolean;
  safetyAll: boolean;
  noLoad: boolean;
  loaded: boolean;
  released: boolean;
  analysed: boolean;
  viva: boolean;
  exported: boolean;
}

export function stageFlags(f: StageFacts): StageFlags {
  return {
    intro: f.theoryRead,
    apparatus: f.partsSeen,
    circuit: f.circuitSeen,
    safety: f.safetyAll,
    no_load: f.noLoad,
    loading: f.loaded,
    unload: f.released,
    analyse: f.analysed,
    viva: f.viva,
    report: f.exported,
  };
}

export const currentStageId = (stages: ProcedureStage[], flags: StageFlags) =>
  stages.find((s) => !flags[s.id])?.id ?? null;

// Parts lit on the bench and the diagram while a stage is the current one.
export const STAGE_HIGHLIGHT: Record<StageId, ComponentId[]> = {
  intro: [],
  apparatus: ['housing', 'terminal_box', 'brake_drum', 'spring_balances'],
  circuit: ['supply_panel', 'starter', 'ammeter', 'voltmeter', 'wattmeter_w1', 'wattmeter_w2'],
  safety: ['estop', 'supply_panel'],
  no_load: ['ammeter', 'voltmeter', 'speed_sensor'],
  loading: ['brake_drum', 'spring_balances', 'wattmeter_w1', 'wattmeter_w2'],
  unload: ['brake_drum', 'spring_balances', 'estop'],
  analyse: ['speed_sensor'],
  viva: [],
  report: [],
};

// The section where each stage's work is done. Stages without one are finished on the same page.
export const STAGE_SECTION: Partial<Record<StageId, EeeSectionId>> = {
  intro: 'theory',
  apparatus: 'simulation',
  circuit: 'simulation',
  no_load: 'simulation',
  loading: 'simulation',
  unload: 'simulation',
  analyse: 'graphs',
  viva: 'viva',
  report: 'observations',
};

export function ProcedureSection({
  stages,
  flags,
  safetyChecks,
  ticks,
  onTick,
  onOpen,
}: {
  stages: ProcedureStage[];
  flags: StageFlags;
  safetyChecks: string[];
  ticks: boolean[];
  onTick: (i: number) => void;
  onOpen: (section: EeeSectionId) => void;
}) {
  const doneCount = stages.filter((s) => flags[s.id]).length;
  const current = currentStageId(stages, flags);
  const ticked = safetyChecks.filter((_, i) => ticks[i]).length;
  const allTicked = safetyChecks.length > 0 && ticked === safetyChecks.length;

  return (
    <div className="space-y-8">
      <SectionHead
        title="Procedure"
        subtitle="Ten stages, in the order of the lab sheet. A stage ticks itself when your own work shows it is done."
        actions={
          <span className="num text-sm text-muted-foreground">
            {doneCount}/{stages.length} done
          </span>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <ol className="space-y-2">
          {stages.map((s, i) => {
            const isDone = flags[s.id];
            const isCurrent = s.id === current;
            const target = STAGE_SECTION[s.id];
            return (
              <li
                key={s.id}
                className={cn('flex gap-4 rounded-md px-4 py-3.5', isCurrent ? 'bg-primary/10' : 'bg-foreground/[0.035]')}
              >
                <span
                  className={cn(
                    'num grid size-8 shrink-0 place-items-center rounded-md text-xs',
                    isDone ? 'orange-gradient text-primary-foreground' : 'bg-foreground/[0.05] text-muted-foreground',
                  )}
                >
                  {isDone ? <Check className="size-3.5" /> : String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-medium">
                    {s.title}
                    {isCurrent && <span className="ml-2 text-xs font-normal text-primary">Current stage</span>}
                    {isDone && <span className="ml-2 text-xs font-normal text-muted-foreground">Done</span>}
                  </p>
                  <p className="text-[15px] leading-relaxed text-muted-foreground">{s.text}</p>
                </div>
                {target && (
                  <Button variant="ghost" size="sm" onClick={() => onOpen(target)} className="shrink-0 self-start">
                    <Play /> Open
                  </Button>
                )}
              </li>
            );
          })}
        </ol>

        <aside className="glass h-fit space-y-4 rounded-lg p-5">
          <h3 className="text-sm font-semibold">Safety checklist</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The rig runs from a 415 V supply. Tick each check before power goes on. Supply and Start stay locked until
            every item is ticked, so the motor cannot run before the checks are made.
          </p>
          <ul className="space-y-2">
            {safetyChecks.map((c, i) => (
              <li key={i}>
                <label className="flex cursor-pointer items-start gap-3 rounded-md bg-foreground/[0.035] px-3 py-2.5 text-sm leading-relaxed">
                  <input
                    type="checkbox"
                    checked={!!ticks[i]}
                    onChange={() => onTick(i)}
                    className="mt-1 size-4 accent-primary"
                  />
                  <span>{c}</span>
                </label>
              </li>
            ))}
          </ul>
          <p className="num text-xs text-muted-foreground">
            {ticked} of {safetyChecks.length} ticked
          </p>
          <p className={cn('text-sm', allTicked ? 'text-primary' : 'text-muted-foreground')}>
            {allTicked ? 'Run controls are unlocked.' : 'Run controls are locked until all items are ticked.'}
          </p>
        </aside>
      </div>
    </div>
  );
}
