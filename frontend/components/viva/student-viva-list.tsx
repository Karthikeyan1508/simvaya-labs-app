'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/app/page-header';
import { Badge } from '@/components/ui/badge';
import { EXPERIMENT_TITLES } from '@/lib/account';
import { errorMessage, listMyVivas, type MyAttemptSummary, type MyViva } from '@/lib/viva';

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

export function StudentVivaList() {
  const [vivas, setVivas] = useState<MyViva[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listMyVivas().then(setVivas).catch((e: unknown) => setError(errorMessage(e)));
  }, []);

  return (
    <div className="space-y-10">
      <PageHeader
        title="Viva"
        description="Short checks on each experiment. Answer them after the lab, one question at a time."
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!vivas && !error && <p className="text-sm text-muted-foreground">Loading vivas…</p>}
      {vivas?.length === 0 && (
        <div className="glass rounded-lg p-8 text-center">
          <p className="font-medium">No vivas are open right now</p>
          <p className="mt-2 text-sm text-muted-foreground">Your teacher will publish one here when it is ready.</p>
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
