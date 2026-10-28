'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { EXPERIMENT_TITLES } from '@/lib/account';
import type { ComponentInfo } from '@/lib/types';
import { labParts } from '@/lib/viva-parts';
import {
  KIND_LABEL,
  errorMessage,
  formatAnswer,
  getMyViva,
  startViva,
  type AnswerPayload,
  type MyVivaDetail,
} from '@/lib/viva';
import { OralInterview } from './oral-interview';

// The oral viva: the examiner is spoken, the student dictates or types, and the transcript is kept with the marks.
// Typed answers are not offered for vivas. With onExit (the experiment page) there is no link to the viva list.
export function VivaAttempt({ id, onExit }: { id: string; onExit?: () => void }) {
  const vivaId = Number(id);
  const [detail, setDetail] = useState<MyVivaDetail | null>(null);
  const [parts, setParts] = useState<ComponentInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reload = () => getMyViva(vivaId).then(setDetail);

  useEffect(() => {
    if (!Number.isInteger(vivaId)) return;
    reload().catch((e: unknown) => setError(errorMessage(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vivaId]);

  const experimentId = detail?.viva.experimentId;
  useEffect(() => {
    if (experimentId) labParts(experimentId).then(setParts).catch(() => undefined);
  }, [experimentId]);

  if (!Number.isInteger(vivaId)) return <p className="text-sm text-destructive">This viva does not exist.</p>;
  if (!detail) {
    return error ? (
      <p className="text-sm text-destructive">{error}</p>
    ) : (
      <p className="text-sm text-muted-foreground">Loading viva…</p>
    );
  }

  const { viva, questions, attempt } = detail;
  const labels = Object.fromEntries(parts.map((p) => [p.id, p.label]));
  const n = questions.length;
  const back = onExit ? null : (
    <Link href="/dashboard/viva" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
      <ArrowLeft /> All vivas
    </Link>
  );

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
              Oral viva: {n} questions, {viva.maxScore} marks in total. The examiner reads each question aloud and you
              answer by dictating with Wispr Flow or typing. Your answers are recorded as a transcript for review.
            </p>
            <p className="text-sm text-muted-foreground">No microphone is needed. Dictate with Wispr Flow, or type.</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={begin} disabled={busy}>
            Start the oral viva <ArrowRight />
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
              ? 'Some answers are waiting for review. Your total can change then.'
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
                  {a ? formatAnswer(x, a.answer as AnswerPayload, labels) : 'No answer'}
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
                {r?.feedback && (
                  <p className="mt-2 text-sm leading-relaxed">
                    <span className="text-muted-foreground">Feedback:</span> {r.feedback}
                  </p>
                )}
                {r?.explanation && (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    <span className="text-foreground">Model answer: </span>
                    {r.explanation}
                  </p>
                )}
              </li>
            );
          })}
        </ol>

        {detail.transcript.length > 0 && (
          <section className="glass rounded-lg p-5">
            <h2 className="mb-3 text-sm font-medium">Interview transcript</h2>
            <ol className="space-y-3">
              {detail.transcript.map((l, i) => (
                <li key={i} className="text-sm leading-relaxed">
                  <span className="mr-2 text-xs font-medium text-muted-foreground">
                    {l.role === 'examiner' ? 'Examiner' : 'You'}
                  </span>
                  {l.text}
                </li>
              ))}
            </ol>
          </section>
        )}

        {onExit && (
          <Button variant="outline" onClick={onExit}>
            Start another self-assessment
          </Button>
        )}
      </div>
    );
  }

  // In progress: the oral interview is the only way to answer.
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {back}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{viva.title}</p>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Oral viva</h1>
        <p className="text-sm text-muted-foreground">
          Dictate or type your answers. They are saved as you send them. When the examiner has finished, the interview is submitted.
        </p>
      </div>
      <OralInterview vivaId={vivaId} title={viva.title} questions={questions} parts={parts} onDone={reload} />
    </div>
  );
}
