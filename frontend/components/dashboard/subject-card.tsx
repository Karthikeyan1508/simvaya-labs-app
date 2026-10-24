'use client';

import { Check, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Progress, ProgressIndicator, ProgressTrack } from '@/components/ui/progress';
import { EXPERIMENT_TITLES, type SubjectOverview } from '@/lib/account';
import { cn } from '@/lib/utils';

export function SubjectCard({ subject }: { subject: SubjectOverview }) {
  const [open, setOpen] = useState(false);
  const total = subject.experiments.length;
  const pct = total ? (subject.performed / total) * 100 : 0;

  return (
    <article className="surface-gradient flex flex-col rounded-xl border border-border/60 p-5 transition-transform hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] leading-snug font-medium">{subject.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {subject.lab ? `${subject.experiments.length} experiments` : 'Theory course'}
          </p>
        </div>
        {subject.lab && (
          <Badge variant="secondary" className="shrink-0 rounded-md">
            Lab
          </Badge>
        )}
      </div>

      {subject.lab && (
        <>
          <div className="mt-6 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Experiments performed</span>
              <span className="num font-medium">
                {subject.performed}/{total}
              </span>
            </div>
            <Progress value={pct}>
              <ProgressTrack className="h-1.5">
                <ProgressIndicator className="fill-gradient" />
              </ProgressTrack>
            </Progress>
          </div>

          <Button
            variant="ghost"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="mt-5 w-full justify-between px-3"
          >
            {open ? 'Hide experiments' : 'Show experiments'}
            <ChevronDown className={cn('transition-transform duration-200', open && 'rotate-180')} />
          </Button>

          {open && (
            <ul className="mt-1 space-y-0.5">
              {subject.experiments.map((e) => (
                <li key={e.id} className="flex items-center gap-3 rounded-md px-2 py-2">
                  <span className="num w-6 shrink-0 text-xs text-muted-foreground">{String(e.no).padStart(2, '0')}</span>
                  <span className={cn('min-w-0 flex-1 truncate text-sm', !e.available && 'text-muted-foreground')}>
                    {e.available ? (EXPERIMENT_TITLES[e.id] ?? e.title) : e.title}
                  </span>
                  {e.performed && <Check className="size-4 shrink-0 text-primary" aria-label="Performed" />}
                  {e.available ? (
                    <Link
                      href={`/experiments/${e.id}`}
                      className={buttonVariants({ size: 'sm', variant: e.performed ? 'outline' : 'default' })}
                    >
                      {e.performed ? 'Open again' : 'Open'}
                    </Link>
                  ) : (
                    <span className="shrink-0 text-xs text-muted-foreground">Coming soon</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {!subject.lab && (
        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          Lab sheets for this course appear here when they are published.
        </p>
      )}
    </article>
  );
}
