'use client';

import { ArrowLeft, ArrowRight, Send } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { EXPERIMENT_TITLES } from '@/lib/account';
import { getExperiment } from '@/lib/api';
import type { ComponentInfo, ExperimentDef, ProcedureStep } from '@/lib/types';
import {
  KIND_LABEL,
  errorMessage,
  formatAnswer,
  getMyViva,
  saveAnswer,
  startViva,
  submitViva,
  type AnswerPayload,
  type MyVivaDetail,
  type StudentQuestion,
} from '@/lib/viva';
import { AnswerInput } from './answer-input';
import { ReadAloud } from './read-aloud';

// Answers the student may see are only the fields of StudentQuestion. The answer key arrives after submit, in results.
const answersOf = (d: MyVivaDetail) =>
  Object.fromEntries((d.attempt?.answers ?? []).map((a) => [a.questionId, a.answer])) as Record<number, AnswerPayload>;

const spokenText = (q: StudentQuestion) =>
  q.options?.length ? `${q.prompt} Options: ${q.options.map((o, i) => `${i + 1}. ${o}`).join('. ')}` : q.prompt;

export function VivaAttempt({ id }: { id: string }) {
  const vivaId = Number(id);
  const [detail, setDetail] = useState<MyVivaDetail | null>(null);
  const [exp, setExp] = useState<ExperimentDef | null>(null);
  const [answers, setAnswers] = useState<Record<number, AnswerPayload>>({});
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!Number.isInteger(vivaId)) return;
    getMyViva(vivaId)
      .then((d) => {
        setDetail(d);
        setAnswers(answersOf(d));
      })
      .catch((e: unknown) => setError(errorMessage(e)));
  }, [vivaId]);

  useEffect(() => {
    getExperiment().then(setExp).catch(() => undefined);
  }, []);

  if (!Number.isInteger(vivaId)) return <p className="text-sm text-destructive">This viva does not exist.</p>;
  if (!detail) {
    return error ? (
      <p className="text-sm text-destructive">{error}</p>
    ) : (
      <p className="text-sm text-muted-foreground">Loading viva…</p>
    );
  }

  const reload = () =>
    getMyViva(vivaId).then((d) => {
      setDetail(d);
      setAnswers(answersOf(d));
    });
  const { viva, questions, attempt } = detail;
  const parts: ComponentInfo[] = exp?.components ?? [];
  const steps: ProcedureStep[] = exp?.procedure ?? [];
  const labels = Object.fromEntries(parts.map((p) => [p.id, p.label]));
  const n = questions.length;
  const q = questions[index];
  const answeredCount = questions.filter((x) => answers[x.id] !== undefined).length;
  const back = (
    <Link href="/dashboard/viva" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
      <ArrowLeft /> All vivas
    </Link>
  );

  // Local only while typing. commit also saves, for a choice or when the field loses focus.
  const edit = (questionId: number, a: AnswerPayload) => setAnswers((prev) => ({ ...prev, [questionId]: a }));
  const commit = (questionId: number, a: AnswerPayload) => {
    edit(questionId, a);
    saveAnswer(vivaId, questionId, a).catch((e: unknown) => setError(errorMessage(e)));
  };
  const saveCurrent = async () => {
    if (q && answers[q.id] !== undefined) await saveAnswer(vivaId, q.id, answers[q.id]);
  };
  // Moving on waits for the save, so a failed save keeps the student on the question.
  const go = async (next: number) => {
    setBusy(true);
    setError('');
    try {
      await saveCurrent();
      setIndex(next);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const begin = async () => {
    setBusy(true);
    setError('');
    try {
      await startViva(vivaId);
      await reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const finish = async () => {
    if (!window.confirm('Submit this viva now? You cannot change your answers afterwards.')) return;
    setBusy(true);
    setError('');
    try {
      await saveCurrent();
      await submitViva(vivaId);
      await reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (!attempt && viva.status !== 'published') {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        {back}
        <p className="glass rounded-lg p-6 text-[15px]">This viva is closed.</p>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        {back}
        <section className="glass space-y-6 rounded-lg p-6 md:p-8">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{EXPERIMENT_TITLES[viva.experimentId] ?? viva.experimentId}</p>
            <h1 className="text-3xl font-semibold tracking-[-0.025em]">{viva.title}</h1>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              {n} questions, {viva.maxScore} marks in total. Your answers save as you move between questions. Once you
              submit, they are locked.
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={begin} disabled={busy}>
            Start viva <ArrowRight />
          </Button>
        </section>
      </div>
    );
  }

  if (attempt.status === 'submitted') {
    const results = detail.results ?? [];
    const score = results.reduce((sum, r) => sum + (r.score ?? 0), 0);
    const pending = results.some((r) => r.score === null);
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        {back}
        <section className="glass space-y-3 rounded-lg p-6 md:p-8">
          <p className="text-sm text-muted-foreground">{viva.title}</p>
          <h1 className="text-3xl font-semibold tracking-[-0.025em]">Submitted</h1>
          <p className="num text-4xl font-semibold">
            {score} <span className="text-lg font-normal text-muted-foreground">of {viva.maxScore}</span>
          </p>
          <p className="text-[15px] text-muted-foreground">
            {pending
              ? 'Some written answers are waiting for your teacher to mark them. Your total can change then.'
              : 'Every answer is marked.'}
          </p>
        </section>

        <ol className="space-y-3">
          {questions.map((x, i) => {
            const r = results.find((res) => res.questionId === x.id);
            const a = attempt.answers.find((ans) => ans.questionId === x.id);
            const verdict =
              !r || r.score === null ? 'Waiting for review' : r.correct === true ? 'Correct' : r.correct === false ? 'Incorrect' : 'Marked';
            return (
              <li key={x.id} className="glass rounded-lg p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="num">
                    Q{i + 1} · {KIND_LABEL[x.kind]}
                  </span>
                  <span className="num">
                    {r?.score ?? '—'} / {x.points}
                  </span>
                </div>
                <p className="mt-2 font-medium">{x.prompt}</p>
                <p className="mt-2 text-sm">
                  <span className="text-muted-foreground">Your answer:</span>{' '}
                  {a ? formatAnswer(x, a.answer, labels) : 'No answer'}
                </p>
                <p className="mt-1 text-sm">
                  <Badge variant="outline" className="rounded-md">
                    {verdict}
                  </Badge>
                </p>
                {r?.expected && (
                  <p className="mt-2 text-sm">
                    <span className="text-muted-foreground">Correct answer:</span> {labels[r.expected] ?? r.expected}
                  </p>
                )}
                {r?.explanation && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.explanation}</p>}
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {back}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span className="truncate">{viva.title}</span>
          <span className="num shrink-0">
            {index + 1} / {n}
          </span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.08]"
          role="progressbar"
          aria-label="Questions answered so far"
          aria-valuemin={1}
          aria-valuemax={n}
          aria-valuenow={index + 1}
        >
          <div className="fill-gradient h-full rounded-full transition-[width] duration-300" style={{ width: `${((index + 1) / n) * 100}%` }} />
        </div>
      </div>

      {q && (
        <section className="glass space-y-6 rounded-lg p-5 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant="outline" className="rounded-md">
              {KIND_LABEL[q.kind]}
            </Badge>
            <span className="num text-sm text-muted-foreground">
              {q.points} {q.points === 1 ? 'mark' : 'marks'}
            </span>
          </div>
          <p className="text-xl leading-snug font-medium text-balance md:text-2xl">{q.prompt}</p>
          <ReadAloud text={spokenText(q)} />
          <AnswerInput
            key={q.id}
            question={q}
            value={answers[q.id]}
            parts={parts}
            steps={steps}
            onChange={(a) => edit(q.id, a)}
            onCommit={(a) => commit(q.id, a)}
          />
        </section>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" disabled={busy || index === 0} onClick={() => go(index - 1)}>
          <ArrowLeft /> Previous
        </Button>
        {index < n - 1 && (
          <Button disabled={busy} onClick={() => go(index + 1)}>
            Next <ArrowRight />
          </Button>
        )}
      </div>

      <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          Answered {answeredCount} of {n}. You can submit at any time.
        </p>
        <Button variant={index === n - 1 ? 'default' : 'outline'} disabled={busy} onClick={finish}>
          <Send /> Submit viva
        </Button>
      </div>
    </div>
  );
}
