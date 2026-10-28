'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { EXPERIMENT_TITLES } from '@/lib/account';
import { formatWhen, type SubmittedViva } from '@/lib/viva';

// Finished oral self-assessments: date, score out of max, and a link to the transcript and feedback.
export function SubmittedVivaList({ vivas }: { vivas: SubmittedViva[] }) {
  return (
    <ul className="grid gap-3">
      {vivas.map((v) => (
        <li key={v.id} className="min-w-0">
          <Link
            href={`/viva/${v.id}`}
            className="glass flex items-center justify-between gap-4 rounded-lg p-5 transition-colors hover:bg-foreground/[0.02]"
          >
            <div className="min-w-0 space-y-1">
              <p className="truncate font-medium">{v.title}</p>
              <p className="text-sm text-muted-foreground">
                {EXPERIMENT_TITLES[v.experimentId] ?? v.experimentId} ·{' '}
                {v.submittedAt ? `Submitted ${formatWhen(v.submittedAt)}` : `Created ${formatWhen(v.createdAt)}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              <span className="num text-sm">
                {v.score ?? '—'} / {v.maxScore}
              </span>
              <span className="hidden text-sm text-muted-foreground md:inline">View transcript and feedback</span>
              <ArrowRight className="size-4 text-muted-foreground" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
