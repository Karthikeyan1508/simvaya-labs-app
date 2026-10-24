'use client';

import { Check, RotateCcw, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Question } from '@/lib/quiz';
import { cn } from '@/lib/utils';
import { SectionHead } from '../section-head';

export function QuizSection({
  title,
  subtitle,
  questions,
  onScore,
}: {
  title: string;
  subtitle: string;
  questions: Question[];
  onScore: (score: number | null) => void;
}) {
  const [picked, setPicked] = useState<(number | null)[]>(() => questions.map(() => null));
  const [submitted, setSubmitted] = useState(false);

  const score = questions.reduce((s, q, i) => s + (picked[i] === q.answer ? 1 : 0), 0);
  const complete = picked.every((p) => p !== null);

  const pick = (qi: number, oi: number) => {
    if (submitted) return;
    setPicked((p) => p.map((v, i) => (i === qi ? oi : v)));
  };

  const submit = () => {
    setSubmitted(true);
    onScore(score);
  };

  const reset = () => {
    setPicked(questions.map(() => null));
    setSubmitted(false);
    onScore(null);
  };

  return (
    <div className="space-y-8">
      <SectionHead
        title={title}
        subtitle={subtitle}
        actions={
          submitted ? (
            <div className="flex items-center gap-3">
              <span className="num text-2xl font-semibold text-primary">
                {score}/{questions.length}
              </span>
              <Button variant="outline" size="sm" onClick={reset}>
                <RotateCcw /> Retry
              </Button>
            </div>
          ) : (
            <Button onClick={submit} disabled={!complete}>
              Submit answers
            </Button>
          )
        }
      />

      <ol className="max-w-3xl space-y-6">
        {questions.map((q, qi) => (
          <li key={q.q} className="space-y-3">
            <p className="text-[15px] font-medium">
              <span className="num mr-2 text-primary">{qi + 1}.</span>
              {q.q}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {q.options.map((o, oi) => {
                const isPicked = picked[qi] === oi;
                const isRight = submitted && oi === q.answer;
                const isWrong = submitted && isPicked && oi !== q.answer;
                return (
                  <button
                    key={o}
                    type="button"
                    onClick={() => pick(qi, oi)}
                    disabled={submitted}
                    aria-pressed={isPicked}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-left text-sm transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/45',
                      'border-border/70 bg-card',
                      !submitted && !isPicked && 'hover:border-foreground/20 hover:bg-foreground/[0.03]',
                      !submitted && isPicked && 'border-primary/60 bg-primary/10',
                      isRight && 'border-primary/60 bg-primary/10',
                      isWrong && 'border-destructive/50 bg-destructive/10',
                    )}
                  >
                    <span>{o}</span>
                    {isRight && <Check className="size-4 text-primary" />}
                    {isWrong && <X className="size-4 text-destructive" />}
                  </button>
                );
              })}
            </div>
            {submitted && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">{picked[qi] === q.answer ? 'Correct. ' : 'Not quite. '}</span>
                {q.why}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
