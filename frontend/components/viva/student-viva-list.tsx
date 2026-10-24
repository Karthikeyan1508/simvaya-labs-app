'use client';

import { ArrowRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/app/page-header';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { EXPERIMENT_TITLES } from '@/lib/account';
import {
  errorMessage,
  listMyVivas,
  startSelfAssessment,
  type MyAttemptSummary,
  type MyViva,
  type NewSelfAssessment,
} from '@/lib/viva';

const PELTON_WHEEL = 'pelton-wheel';

function AttemptStatus({ attempt }: { attempt: MyAttemptSummary | null }) {
  if (!attempt) return <Badge variant="secondary" className="rounded-md">Not started</Badge>;
  if (attempt.status === 'in_progress') return <Badge variant="outline" className="rounded-md">In progress</Badge>;
  if (attempt.pendingReview) {
    return (
      <div className="flex items-center gap-2">
        <Badge className="rounded-md border-0 bg-accent text-accent-foreground">Pending review</Badge>
        {attempt.score !== null && <span className="num text-sm">{attempt.score}</span>}
      </div>
    );
  }
  return (
    <span className="num text-sm">
      Score {attempt.score ?? '—'}
    </span>
  );
}

// The student's own self-assessments. Each one is made from the Pelton wheel lab's facts and answered out loud.
export function StudentVivaList() {
  const [vivas, setVivas] = useState<MyViva[] | null>(null);
  const [made, setMade] = useState<NewSelfAssessment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => listMyVivas().then(setVivas);

  useEffect(() => {
    load().catch((e: unknown) => setError(errorMessage(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Generating can take up to about a minute when the AI services are slow.
  const create = async () => {
    setBusy(true);
    setError('');
    setMade(null);
    try {
      setMade(await startSelfAssessment(PELTON_WHEEL));
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-10">
      <PageHeader
        title="Viva"
        description="Oral self-assessments on each experiment. Answer the examiner out loud, then see your score and feedback."
        actions={
          <Button onClick={create} disabled={busy}>
            <Plus /> {busy ? 'Writing your questions…' : 'New self-assessment'}
          </Button>
        }
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {made && (
        <div className="glass space-y-2 rounded-lg p-5">
          <p className="font-medium">Your self-assessment is ready.</p>
          {made.note && <p className="text-sm text-muted-foreground">{made.note}</p>}
          <Link href={`/viva/${made.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Open it <ArrowRight />
          </Link>
        </div>
      )}
      {!vivas && !error && <p className="text-sm text-muted-foreground">Loading vivas…</p>}
      {vivas?.length === 0 && (
        <div className="glass rounded-lg p-8 text-center">
          <p className="font-medium">No self-assessments yet</p>
          <p className="mt-2 text-sm text-muted-foreground">Start one for the Pelton wheel lab when you are ready.</p>
        </div>
      )}

      {vivas && vivas.length > 0 && (
        <ul className="grid gap-3">
          {vivas.map((v) => (
            <li key={v.id}>
              <Link
                href={`/viva/${v.id}`}
                className="glass flex items-center justify-between gap-4 rounded-lg p-5 transition-colors hover:bg-foreground/[0.02]"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-medium">{v.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {EXPERIMENT_TITLES[v.experimentId] ?? v.experimentId} · {v.questionCount} questions
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <AttemptStatus attempt={v.myAttempt} />
                  <ArrowRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
