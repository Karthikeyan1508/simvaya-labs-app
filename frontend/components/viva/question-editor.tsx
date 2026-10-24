'use client';

import { ChevronDown, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ComponentInfo, ProcedureStep } from '@/lib/types';
import { cn } from '@/lib/utils';
import { questionProblem, type DraftQuestion } from '@/lib/viva';

const FIELD = 'h-10 bg-card px-3';
const AREA = 'w-full rounded-lg border border-input bg-card px-3 py-2 text-[15px] leading-relaxed outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

const parseList = (text: string) =>
  text.split(',').map((s) => s.trim()).filter(Boolean).map(Number).filter((n) => Number.isFinite(n));
const shown = (n: number | undefined) => (n !== undefined && Number.isFinite(n) ? n : '');

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

interface Props {
  q: DraftQuestion;
  onChange: (q: DraftQuestion) => void;
  parts: ComponentInfo[];
  steps: ProcedureStep[];
}

// Edits one question's prompt, marks and answer key. The kind is fixed once the question exists.
export function QuestionEditor({ q, onChange, parts, steps }: Props) {
  const set = (patch: Partial<DraftQuestion>) => onChange({ ...q, ...patch });
  // Graph values are typed as text so that a trailing comma does not fight the field.
  const [xs, setXs] = useState(q.graph?.x.join(', ') ?? '');
  const [ys, setYs] = useState(q.graph?.y.join(', ') ?? '');
  const options = q.options ?? [];
  const partName = parts.find((p) => p.id === q.partId)?.label ?? q.partId ?? 'Choose a part';
  const problem = questionProblem(q);

  const setOption = (i: number, text: string) => set({ options: options.map((o, j) => (j === i ? text : o)) });
  const removeOption = (i: number) =>
    set({
      options: options.filter((_, j) => j !== i),
      answer: q.answer === undefined || q.answer === i ? undefined : q.answer > i ? q.answer - 1 : q.answer,
    });
  const setGraph = (patch: Partial<NonNullable<DraftQuestion['graph']>>) =>
    set({ graph: { x: [], y: [], xLabel: '', yLabel: '', ...q.graph, ...patch } });

  return (
    <div className="space-y-4">
      <Field label="Prompt">
        <textarea
          className={cn(AREA, 'min-h-20')}
          value={q.prompt}
          onChange={(e) => set({ prompt: e.target.value })}
          placeholder="What the student reads or hears"
        />
      </Field>

      {q.kind === 'explain' && (
        <Field label="Marking note (only you see this)">
          <textarea
            className={cn(AREA, 'min-h-20')}
            value={q.explanation ?? ''}
            onChange={(e) => set({ explanation: e.target.value })}
            placeholder="What a full answer should cover"
          />
        </Field>
      )}

      {(q.kind === 'mcq' || q.kind === 'formula') && (
        <Field label="Options (mark the correct one)">
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  aria-label={`Option ${i + 1}`}
                  className={cn(FIELD, 'min-w-0 flex-1')}
                  value={opt}
                  placeholder={`Option ${i + 1}`}
                  onChange={(e) => setOption(i, e.target.value)}
                />
                <button
                  type="button"
                  className="btn-chip shrink-0"
                  aria-pressed={q.answer === i}
                  onClick={() => set({ answer: i })}
                >
                  {q.answer === i ? 'Correct' : 'Mark correct'}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove option ${i + 1}`}
                  disabled={options.length <= 2}
                  onClick={() => removeOption(i)}
                >
                  <X />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => set({ options: [...options, ''] })}>
              <Plus /> Add option
            </Button>
          </div>
        </Field>
      )}

      {(q.kind === 'point' || q.kind === 'highlight') && (
        <Field label={q.kind === 'point' ? 'Part the student must click' : 'Part to light up'}>
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'outline' }), 'w-full justify-between')}>
              <span className="truncate">{partName}</span>
              <ChevronDown />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-72 w-72">
              {parts.map((p) => (
                <DropdownMenuItem key={p.id} onClick={() => set({ partId: p.id })}>
                  {p.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </Field>
      )}

      {q.kind === 'step' && (
        <Field label="Correct procedure step">
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'outline' }), 'w-full justify-between')}>
              <span className="truncate">Step {q.step ?? '—'}</span>
              <ChevronDown />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-72 w-96 max-w-[90vw]">
              {steps.map((s) => (
                <DropdownMenuItem key={s.step} className="items-start" onClick={() => set({ step: s.step })}>
                  <span className="num shrink-0">{s.step}.</span>
                  <span className="line-clamp-2">{s.text}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </Field>
      )}

      {(q.kind === 'calc' || q.kind === 'graph') && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Expected value">
            <Input
              type="number"
              step="any"
              className={FIELD}
              value={shown(q.expected)}
              onChange={(e) => set({ expected: e.target.valueAsNumber })}
            />
          </Field>
          <Field label="Tolerance (%)">
            <Input
              type="number"
              min={0}
              step="any"
              className={FIELD}
              value={q.tolerance === undefined ? '' : Math.round(q.tolerance * 1000) / 10}
              onChange={(e) => set({ tolerance: e.target.valueAsNumber / 100 })}
            />
          </Field>
          <Field label="Unit">
            <Input className={FIELD} value={q.unit ?? ''} placeholder="e.g. kW" onChange={(e) => set({ unit: e.target.value })} />
          </Field>
        </div>
      )}

      {q.kind === 'graph' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="x values (comma separated)">
            <Input
              className={FIELD}
              value={xs}
              onChange={(e) => {
                setXs(e.target.value);
                setGraph({ x: parseList(e.target.value) });
              }}
            />
          </Field>
          <Field label="y values (comma separated)">
            <Input
              className={FIELD}
              value={ys}
              onChange={(e) => {
                setYs(e.target.value);
                setGraph({ y: parseList(e.target.value) });
              }}
            />
          </Field>
          <Field label="x axis label">
            <Input className={FIELD} value={q.graph?.xLabel ?? ''} onChange={(e) => setGraph({ xLabel: e.target.value })} />
          </Field>
          <Field label="y axis label">
            <Input className={FIELD} value={q.graph?.yLabel ?? ''} onChange={(e) => setGraph({ yLabel: e.target.value })} />
          </Field>
          <Field label="Peak at x (optional, not shown to students)">
            <Input
              type="number"
              step="any"
              className={FIELD}
              value={shown(q.graph?.peakX)}
              onChange={(e) => setGraph({ peakX: Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : undefined })}
            />
          </Field>
        </div>
      )}

      <Field label="Marks">
        <Input
          type="number"
          min={0}
          step={0.5}
          className={cn(FIELD, 'max-w-32')}
          value={shown(q.points)}
          onChange={(e) => set({ points: e.target.valueAsNumber })}
        />
      </Field>

      {problem && <p className="text-sm text-destructive">{problem}</p>}
    </div>
  );
}
