'use client';

import { useState } from 'react';
import { GradientChart } from '@/components/lab/gradient-chart';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ComponentInfo, ProcedureStep } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { AnswerPayload, StudentQuestion } from '@/lib/viva';
import { VivaScene } from './viva-scene';

const AREA = 'w-full rounded-lg border border-input bg-card px-3 py-2.5 text-[15px] leading-relaxed outline-none focus-visible:ring-3 focus-visible:ring-ring/50';
const CHOICE = (on: boolean) =>
  cn(
    'flex w-full cursor-pointer items-start gap-3 rounded-lg border p-3.5 text-left text-[15px] leading-relaxed transition-colors',
    on ? 'border-primary bg-primary/[0.07]' : 'border-border bg-card hover:border-foreground/25',
  );

interface Props {
  question: StudentQuestion;
  value: AnswerPayload | undefined;
  parts: ComponentInfo[];
  steps: ProcedureStep[];
  onChange: (a: AnswerPayload) => void; // typing: keep it on screen
  onCommit: (a: AnswerPayload) => void; // choosing, or leaving a field: save it
}

// One answer UI per question kind. Only the fields a student may see are read here.
export function AnswerInput({ question: q, value, parts, steps, onChange, onCommit }: Props) {
  if (q.kind === 'explain') {
    const text = value && 'text' in value ? value.text : '';
    return (
      <div className="space-y-2">
        <Label htmlFor="answer-text">Your answer</Label>
        <textarea
          id="answer-text"
          rows={6}
          className={AREA}
          value={text}
          placeholder="Write your answer in your own words"
          onChange={(e) => onChange({ text: e.target.value })}
          onBlur={() => {
            if (value) onCommit(value);
          }}
        />
      </div>
    );
  }

  if (q.kind === 'mcq' || q.kind === 'formula') {
    const chosen = value && 'option' in value ? value.option : -1;
    return (
      <div role="radiogroup" aria-label="Answers" className="space-y-2">
        {(q.options ?? []).map((opt, i) => (
          <label key={i} className={CHOICE(chosen === i)}>
            <input
              type="radio"
              name={`answer-${q.id}`}
              className="mt-1 size-4 shrink-0 accent-amber-600"
              checked={chosen === i}
              onChange={() => onCommit({ option: i })}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  if (q.kind === 'point') {
    const picked = value && 'partId' in value ? value.partId : null;
    const marker = parts.findIndex((p) => p.id === picked) + 1;
    return (
      <div className="space-y-3">
        {parts.length === 0 ? (
          <p className="text-sm text-muted-foreground">The rig is not available right now.</p>
        ) : (
          <VivaScene parts={parts} mode="point" selected={picked} onPick={(partId) => onCommit({ partId })} />
        )}
        <p className="text-sm text-muted-foreground">
          {picked && marker > 0
            ? `Marker ${marker} is selected. Click another marker to change your answer.`
            : 'Click a numbered marker on the rig to answer.'}
        </p>
      </div>
    );
  }

  if (q.kind === 'step') {
    const chosen = value && 'step' in value ? value.step : -1;
    return (
      <div role="radiogroup" aria-label="Procedure steps" className="space-y-2">
        {steps.length === 0 && <p className="text-sm text-muted-foreground">The procedure is not available right now.</p>}
        {steps.map((s) => (
          <button
            key={s.step}
            type="button"
            role="radio"
            aria-checked={chosen === s.step}
            className={cn(CHOICE(chosen === s.step), 'items-center')}
            onClick={() => onCommit({ step: s.step })}
          >
            <span className="num grid size-7 shrink-0 place-items-center rounded-md bg-foreground/[0.06] text-xs">{s.step}</span>
            <span className="text-sm leading-relaxed">{s.text}</span>
          </button>
        ))}
      </div>
    );
  }

  if (q.kind === 'highlight') {
    const text = value && 'text' in value ? value.text : '';
    return (
      <div className="space-y-4">
        <VivaScene parts={parts} mode="highlight" highlight={q.highlightPartId} />
        <div className="space-y-2">
          <Label htmlFor="answer-text">Name of the lit part</Label>
          <Input
            id="answer-text"
            className="h-10 bg-card px-3"
            value={text}
            placeholder="Type the part's name"
            onChange={(e) => onChange({ text: e.target.value })}
            onBlur={() => {
              if (value) onCommit(value);
            }}
          />
        </div>
      </div>
    );
  }

  return <NumberAnswer question={q} value={value} onChange={onChange} onCommit={onCommit} />;
}

// calc and graph: a number with its unit. The field keeps what is typed, so "1." does not snap back.
function NumberAnswer({
  question: q,
  value,
  onChange,
  onCommit,
}: {
  question: StudentQuestion;
  value: AnswerPayload | undefined;
  onChange: (a: AnswerPayload) => void;
  onCommit: (a: AnswerPayload) => void;
}) {
  const [raw, setRaw] = useState(value && 'value' in value ? String(value.value) : '');
  const g = q.graph;

  return (
    <div className="space-y-4">
      {g && (
        <GradientChart
          id={`viva-${q.id}`}
          title={g.yLabel || 'Graph'}
          description={`${g.yLabel} against ${g.xLabel}`}
          yLabel={g.yLabel}
          data={g.x.map((x, i) => ({ x, y: g.y[i] }))}
          color="var(--chart-1)"
        />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="number"
          step="any"
          aria-label="Your answer"
          placeholder="Your answer"
          className="num h-10 w-48 bg-card px-3"
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value);
            const n = e.target.valueAsNumber;
            if (Number.isFinite(n)) onChange({ value: n });
          }}
          onBlur={() => {
            if (value) onCommit(value);
          }}
        />
        {q.unit && <span className="num text-sm text-muted-foreground">{q.unit}</span>}
      </div>
    </div>
  );
}
