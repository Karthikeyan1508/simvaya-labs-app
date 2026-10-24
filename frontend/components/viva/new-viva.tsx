'use client';

import { ArrowLeft, ChevronDown, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Block, PageHeader } from '@/components/app/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EXPERIMENT_TITLES } from '@/lib/account';
import { getExperiment } from '@/lib/api';
import type { ExperimentDef } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  KIND_LABEL,
  VIVA_KINDS,
  createViva,
  errorMessage,
  proposeQuestions,
  questionProblem,
  type VivaKind,
} from '@/lib/viva';
import { QuestionDeck, toRows, type Row } from './question-deck';

const EXPERIMENTS = [{ id: 'pelton-wheel', title: EXPERIMENT_TITLES['pelton-wheel'] }];
const DEFAULT_COUNTS: Partial<Record<VivaKind, number>> = { mcq: 3, point: 2, highlight: 2, step: 1, calc: 1 };
const AREA = 'w-full rounded-lg border border-input bg-card px-3 py-2.5 text-[15px] leading-relaxed outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

export function NewViva() {
  const router = useRouter();
  const [mode, setMode] = useState<'quick' | 'ai'>('quick');
  const [drafter, setDrafter] = useState<'ai' | 'agenticorg'>('ai');
  const [title, setTitle] = useState('');
  const [experimentId, setExperimentId] = useState(EXPERIMENTS[0].id);
  const [counts, setCounts] = useState<Partial<Record<VivaKind, number>>>(DEFAULT_COUNTS);
  const [instructions, setInstructions] = useState('');
  const [exp, setExp] = useState<ExperimentDef | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // AI draft review: rows the teacher approves or rejects before saving.
  const [rows, setRows] = useState<Row[] | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    getExperiment().then(setExp).catch((e: Error) => setError(`Could not load the lab parts: ${e.message}`));
  }, []);

  const ticked = VIVA_KINDS.filter((k) => (counts[k] ?? 0) > 0);
  const activeCounts = Object.fromEntries(ticked.map((k) => [k, counts[k]])) as Partial<Record<VivaKind, number>>;
  const total = ticked.reduce((sum, k) => sum + (counts[k] ?? 0), 0);
  const parts = exp?.components ?? [];
  const steps = exp?.procedure ?? [];

  const setTicked = (k: VivaKind, on: boolean) =>
    setCounts((c) => ({ ...c, [k]: on ? Math.max(1, c[k] ?? 1) : 0 }));
  const setCount = (k: VivaKind, n: number) =>
    setCounts((c) => ({ ...c, [k]: Number.isFinite(n) ? Math.min(10, Math.max(1, Math.round(n))) : 1 }));

  // The head of the form, checked before any request is sent.
  const headProblem = () => {
    if (!title.trim()) return 'Give the viva a title.';
    if (ticked.length === 0) return 'Tick at least one question type.';
    return '';
  };

  const sendNow = async () => {
    const problem = headProblem();
    if (problem) return setError(problem);
    setBusy(true);
    setError('');
    try {
      const proposal = await proposeQuestions({ experimentId, mode: 'template', counts: activeCounts });
      const viva = await createViva({ title: title.trim(), experimentId, questions: proposal.questions, publish: true });
      router.push(`/teacher/viva/${viva.id}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const draft = async () => {
    const problem = headProblem();
    if (problem) return setError(problem);
    setBusy(true);
    setError('');
    try {
      const proposal = await proposeQuestions({
        experimentId,
        mode: drafter,
        counts: activeCounts,
        instructions: instructions.trim() || undefined,
      });
      setRows(toRows(proposal.questions));
      setNote(proposal.note ?? null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const save = async (publish: boolean) => {
    if (!rows) return;
    if (!title.trim()) return setError('Give the viva a title.');
    const bad = rows.findIndex((r) => r.review !== 'rejected' && questionProblem(r.q));
    if (bad >= 0) return setError(`Q${bad + 1}: ${questionProblem(rows[bad].q)}`);
    const questions = rows.filter((r) => r.review !== 'rejected').map((r) => r.q);
    if (questions.length === 0) return setError('Restore at least one question before saving.');
    setBusy(true);
    setError('');
    try {
      const viva = await createViva({ title: title.trim(), experimentId, questions, publish });
      router.push(`/teacher/viva/${viva.id}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const approved = rows?.filter((r) => r.review === 'approved').length ?? 0;
  const kept = rows?.filter((r) => r.review !== 'rejected').length ?? 0;

  return (
    <div className="space-y-10">
      <PageHeader
        title="New viva"
        description="Choose the questions, then send them now or draft them with AI and review each one before students see it."
        actions={
          <Link href="/teacher" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            <ArrowLeft /> All vivas
          </Link>
        }
      />

      <div className="glass space-y-7 rounded-lg p-5 md:p-7">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <Label htmlFor="viva-title">Title</Label>
            <Input
              id="viva-title"
              className="h-10 bg-card px-3"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Pelton turbine, batch 3"
            />
          </div>
          <div className="min-w-0 space-y-2">
            <Label>Experiment</Label>
            <DropdownMenu>
              <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'outline' }), 'h-10 w-full justify-between')}>
                <span className="truncate">{EXPERIMENTS.find((e) => e.id === experimentId)?.title}</span>
                <ChevronDown />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72">
                {EXPERIMENTS.map((e) => (
                  <DropdownMenuItem key={e.id} onClick={() => setExperimentId(e.id)}>
                    {e.title}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">How to build it</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-chip" aria-pressed={mode === 'quick'} onClick={() => setMode('quick')}>
              <Zap className="size-3.5" /> Quick send
            </button>
            <button type="button" className="btn-chip" aria-pressed={mode === 'ai'} onClick={() => setMode('ai')}>
              <Sparkles className="size-3.5" /> AI draft
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            {mode === 'quick'
              ? 'Standard questions from templates, published to students straight away.'
              : 'Claude drafts the questions. You approve, edit or reject each one before anything is saved or published.'}
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium">Question types</p>
            <p className="num text-xs text-muted-foreground">{total} in total</p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {VIVA_KINDS.map((k) => {
              const on = (counts[k] ?? 0) > 0;
              return (
                <li key={k} className="flex items-center gap-3 rounded-lg border border-border bg-card p-2.5">
                  <input
                    id={`kind-${k}`}
                    type="checkbox"
                    className="size-4 shrink-0 accent-amber-600"
                    checked={on}
                    onChange={(e) => setTicked(k, e.target.checked)}
                  />
                  <label htmlFor={`kind-${k}`} className="min-w-0 flex-1 cursor-pointer text-sm">
                    {KIND_LABEL[k]}
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    aria-label={`Number of ${KIND_LABEL[k]} questions`}
                    className="h-9 w-20 bg-card px-2"
                    disabled={!on}
                    value={on ? (counts[k] ?? 1) : ''}
                    onChange={(e) => setCount(k, e.target.valueAsNumber)}
                  />
                </li>
              );
            })}
          </ul>
        </div>

        {mode === 'ai' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Draft with</span>
            {(
              [
                ['ai', 'Groq AI'],
                ['agenticorg', 'AgenticOrg agent'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className="btn-chip"
                aria-pressed={drafter === value}
                onClick={() => setDrafter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {mode === 'ai' && (
          <div className="space-y-2">
            <Label htmlFor="viva-instructions">Instructions for the AI (optional)</Label>
            <textarea
              id="viva-instructions"
              className={cn(AREA, 'min-h-20')}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Focus on the venturi meter and keep the numbers simple."
            />
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end">
          {mode === 'quick' ? (
            <Button onClick={sendNow} disabled={busy}>
              <Zap /> {busy ? 'Sending…' : 'Generate and send now'}
            </Button>
          ) : (
            <Button onClick={draft} disabled={busy}>
              <Sparkles /> {busy ? 'Drafting…' : rows ? 'Draft again' : 'Generate draft'}
            </Button>
          )}
        </div>
      </div>

      {mode === 'ai' && rows && (
        <Block title="Review the draft" meta={`${kept} kept · ${approved} approved`}>
          {note && (
            <p className="rounded-lg border border-amber-600/25 bg-accent/60 p-3 text-sm text-accent-foreground">{note}</p>
          )}
          <QuestionDeck rows={rows} onChange={setRows} parts={parts} steps={steps} review />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => save(false)} disabled={busy}>
              Save draft
            </Button>
            <Button onClick={() => save(true)} disabled={busy}>
              Publish to students
            </Button>
          </div>
        </Block>
      )}
    </div>
  );
}
