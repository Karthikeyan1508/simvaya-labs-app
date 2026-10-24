'use client';

import { ArrowLeft, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useEffect, useState } from 'react';
import { Block, PageHeader } from '@/components/app/page-header';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EXPERIMENT_TITLES } from '@/lib/account';
import { getExperiment } from '@/lib/api';
import type { ExperimentDef } from '@/lib/types';
import {
  KIND_LABEL,
  errorMessage,
  formatAnswer,
  gradeAnswer,
  getViva,
  questionProblem,
  setVivaStatus,
  updateVivaQuestions,
  type Attempt,
  type DraftQuestion,
  type TeacherViva,
  type VivaStatus,
} from '@/lib/viva';
import { QuestionDeck, toRows, type Row } from './question-deck';
import { StatusBadge, formatDate } from './shared';

export function VivaDetail({ id }: { id: string }) {
  const vivaId = Number(id);
  const [data, setData] = useState<TeacherViva | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [exp, setExp] = useState<ExperimentDef | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [openAttempt, setOpenAttempt] = useState<number | null>(null);

  useEffect(() => {
    if (!Number.isInteger(vivaId)) return;
    getViva(vivaId)
      .then((d) => {
        setData(d);
        setRows(toRows(d.questions));
      })
      .catch((e: unknown) => setError(errorMessage(e)));
  }, [vivaId]);

  useEffect(() => {
    getExperiment().then(setExp).catch(() => undefined);
  }, []);

  if (!Number.isInteger(vivaId)) return <p className="text-sm text-destructive">This viva does not exist.</p>;
  if (!data) {
    return error ? (
      <p className="text-sm text-destructive">{error}</p>
    ) : (
      <p className="text-sm text-muted-foreground">Loading viva…</p>
    );
  }

  const reload = () => getViva(vivaId).then(setData);
  const reloadAll = () =>
    getViva(vivaId).then((d) => {
      setData(d);
      setRows(toRows(d.questions));
    });
  // Runs a write, then refreshes. Errors show above the page instead of failing silently.
  const act = async (write: () => Promise<unknown>, refresh: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await write();
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const changeStatus = (status: VivaStatus) => act(() => setVivaStatus(vivaId, status), reload);
  const saveQuestions = () => {
    const bad = rows.findIndex((r) => questionProblem(r.q));
    if (bad >= 0) return setError(`Q${bad + 1}: ${questionProblem(rows[bad].q)}`);
    return act(() => updateVivaQuestions(vivaId, rows.map((r) => r.q)), reloadAll);
  };
  const grade = (attemptId: number, questionId: number, score: number) =>
    act(() => gradeAnswer(vivaId, attemptId, { questionId, score }), reload);

  const { viva, questions, attempts } = data;
  const locked = viva.status !== 'draft';
  const maxScore = questions.reduce((sum, q) => sum + q.points, 0);
  const labels = Object.fromEntries((exp?.components ?? []).map((c) => [c.id, c.label]));
  const waiting = attempts.filter((a) => a.pendingReview).length;

  return (
    <div className="space-y-8">
      <Link href="/teacher" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
        <ArrowLeft /> All vivas
      </Link>

      <PageHeader
        eyebrow={EXPERIMENT_TITLES[viva.experimentId] ?? viva.experimentId}
        title={viva.title}
        description={`Created ${formatDate(viva.createdAt)}${viva.publishedAt ? ` · Published ${formatDate(viva.publishedAt)}` : ''}`}
      />

      <div className="glass flex flex-wrap items-center justify-between gap-4 rounded-lg p-5">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={viva.status} />
          <p className="num text-sm text-muted-foreground">
            {questions.length} questions · {maxScore} marks · {viva.attemptCount} attempts · {viva.submittedCount} submitted
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {viva.status === 'draft' && (
            <Button disabled={busy} onClick={() => changeStatus('published')}>
              Publish to students
            </Button>
          )}
          {viva.status === 'published' && (
            <Button variant="outline" disabled={busy} onClick={() => changeStatus('closed')}>
              Close viva
            </Button>
          )}
          {viva.status === 'closed' && (
            <Button disabled={busy} onClick={() => changeStatus('published')}>
              Reopen
            </Button>
          )}
          {locked && viva.submittedCount === 0 && (
            <Button variant="outline" disabled={busy} onClick={() => changeStatus('draft')}>
              Back to draft
            </Button>
          )}
        </div>
      </div>
      {locked && viva.submittedCount > 0 && (
        <p className="text-xs text-muted-foreground">Back to draft is unavailable once a student has submitted.</p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Block title="Questions" meta={locked ? 'Locked' : 'Editable in draft'}>
        {locked && (
          <p className="flex items-start gap-2 rounded-lg bg-accent/50 p-3 text-sm text-accent-foreground">
            <Lock className="mt-0.5 size-4 shrink-0" />
            <span>
              Questions are locked while the viva is {viva.status}.{' '}
              {viva.submittedCount === 0
                ? 'Move it back to draft to edit them.'
                : 'Students have submitted, so it cannot go back to draft.'}
            </span>
          </p>
        )}
        <QuestionDeck rows={rows} onChange={setRows} parts={exp?.components ?? []} steps={exp?.procedure ?? []} locked={locked} />
        {!locked && (
          <div className="flex justify-end">
            <Button onClick={saveQuestions} disabled={busy}>
              Save questions
            </Button>
          </div>
        )}
      </Block>

      <Block title="Attempts" meta={`${attempts.length} total · ${waiting} waiting for review`}>
        {attempts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nobody has started this viva yet.</p>
        ) : (
          <div className="glass overflow-x-auto rounded-lg">
            <Table className="min-w-[560px] text-sm">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map((a) => {
                  const open = openAttempt === a.id;
                  return (
                    <Fragment key={a.id}>
                      <TableRow>
                        <TableCell>
                          <p className="font-medium">{a.studentName}</p>
                          <p className="text-xs text-muted-foreground">{a.studentEmail}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={a.status === 'submitted' ? 'secondary' : 'outline'} className="rounded-md">
                            {a.status === 'submitted' ? 'Submitted' : 'In progress'}
                          </Badge>
                        </TableCell>
                        <TableCell className="num">
                          {a.score ?? '—'} <span className="text-muted-foreground">/ {a.maxScore}</span>
                        </TableCell>
                        <TableCell>
                          {a.pendingReview && (
                            <Badge className="rounded-md border-0 bg-accent text-accent-foreground">Pending review</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" aria-expanded={open} onClick={() => setOpenAttempt(open ? null : a.id)}>
                            Answers {open ? <ChevronUp /> : <ChevronDown />}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {open && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={5} className="whitespace-normal">
                            <AttemptAnswers
                              attempt={a}
                              questions={questions}
                              labels={labels}
                              disabled={busy}
                              onGrade={(questionId, score) => grade(a.id, questionId, score)}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Block>
    </div>
  );
}

function AttemptAnswers({
  attempt,
  questions,
  labels,
  disabled,
  onGrade,
}: {
  attempt: Attempt;
  questions: DraftQuestion[];
  labels: Record<string, string>;
  disabled: boolean;
  onGrade: (questionId: number, score: number) => void;
}) {
  return (
    <div className="space-y-5 py-2">
      {attempt.transcript.length > 0 && (
        <section className="glass rounded-lg p-4">
          <h3 className="mb-3 text-sm font-medium">Interview transcript</h3>
          <ol className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {attempt.transcript.map((l, i) => (
              <li key={i} className="text-sm leading-relaxed">
                <span className="mr-2 text-xs font-medium text-muted-foreground">
                  {l.role === 'examiner' ? 'Examiner' : 'Student'}
                </span>
                {l.text}
              </li>
            ))}
          </ol>
        </section>
      )}
    <ol className="space-y-3">
      {questions.map((q, i) => {
        const a = attempt.answers.find((x) => x.questionId === q.id);
        return (
          <li key={q.id ?? i} className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="num">Q{i + 1}</span>
              <Badge variant="outline" className="rounded-md">
                {KIND_LABEL[q.kind]}
              </Badge>
              {a && a.correct !== null && <span>{a.correct ? 'Auto: correct' : 'Auto: wrong'}</span>}
            </div>
            <p className="mt-2 text-sm font-medium">{q.prompt}</p>
            <p className="mt-2 text-sm">
              <span className="text-muted-foreground">Answer:</span>{' '}
              {a ? formatAnswer(q, a.answer, labels) : 'No answer'}
            </p>
            {q.kind === 'explain' && q.explanation && (
              <p className="mt-1 text-xs text-muted-foreground">Marking note: {q.explanation}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="num text-muted-foreground">
                Marks {a?.score ?? '—'} / {q.points}
              </span>
              {q.kind === 'explain' && a && q.id !== undefined && (
                <GradeField
                  key={`${attempt.id}-${q.id}-${a.score}`}
                  max={q.points}
                  initial={a.score}
                  disabled={disabled}
                  onSave={(score) => onGrade(q.id as number, score)}
                />
              )}
            </div>
          </li>
        );
      })}
    </ol>
    </div>
  );
}

function GradeField({
  max,
  initial,
  disabled,
  onSave,
}: {
  max: number;
  initial: number | null;
  disabled: boolean;
  onSave: (score: number) => void;
}) {
  const [value, setValue] = useState(initial === null ? '' : String(initial));
  const score = Number(value);
  const valid = value.trim() !== '' && Number.isFinite(score) && score >= 0 && score <= max;

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={0}
        max={max}
        step={0.5}
        aria-label="Marks for this answer"
        className="h-9 w-24 bg-card px-2"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <span className="text-xs text-muted-foreground">of {max}</span>
      <Button size="sm" disabled={disabled || !valid} onClick={() => onSave(score)}>
        Save marks
      </Button>
    </div>
  );
}
