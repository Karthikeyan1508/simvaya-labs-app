'use client';

import { Activity, Award, Check, FlaskConical, Table2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/components/app/session-provider';
import { PageHeader, Block } from '@/components/app/page-header';
import { fetchAcademics, fetchSummary, type Academics, type SemesterOverview, type Summary } from '@/lib/account';
import { cn } from '@/lib/utils';
import { SubjectCard } from './subject-card';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const STATUS_LABEL: Record<SemesterOverview['status'], string> = {
  completed: 'Completed',
  active: 'Active',
  upcoming: 'Upcoming',
};

export function Overview() {
  const { user } = useSession();
  const [academics, setAcademics] = useState<Academics | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([fetchAcademics(), fetchSummary()])
      .then(([a, s]) => {
        setAcademics(a);
        setSummary(s);
        setSelected(a.activeSemester);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const shown = academics?.semesters.find((s) => s.number === selected) ?? null;
  const labCount = shown?.subjects.filter((s) => s.lab).length ?? 0;
  const firstName = user?.name.split(' ')[0] ?? '';

  return (
    <div className="space-y-12">
      <div className="glow-card rounded-2xl border border-border/60 p-6 md:p-8">
        <PageHeader
          eyebrow={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          title={`${greeting()}, ${firstName}`}
          description={
            academics
              ? `Semester ${academics.activeSemester} is your active semester in ${academics.branch}.`
              : 'Loading your semester.'
          }
        />
      </div>

      {error && <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={FlaskConical}
          label="Experiments performed"
          value={summary?.attempts.total}
          hint={
            summary?.attempts.byExperiment.length
              ? `${summary.attempts.byExperiment.length} experiment${summary.attempts.byExperiment.length > 1 ? 's' : ''} started`
              : 'Start the Pelton wheel lab'
          }
        />
        <Stat icon={Table2} label="Recordings" value={summary?.recordings} hint="Readings saved to your account" />
        <Stat icon={Activity} label="This week" value={summary?.activitiesThisWeek} hint="Activities in the last 7 days" />
        <Stat icon={Award} label="Viva score" value={null} hint="Not available yet" badge="Coming soon" />
      </div>

      <Block title="Semesters" meta={`8 semesters · ${academics ? academics.semesters.filter((s) => s.status === 'completed').length : 0} completed`}>
        <div className="grid grid-cols-4 gap-2 md:grid-cols-8">
          {(academics?.semesters ?? []).map((s) => {
            const on = s.number === selected;
            return (
              <button
                key={s.number}
                type="button"
                onClick={() => setSelected(s.number)}
                aria-pressed={on}
                className={cn(
                  'group flex flex-col items-center gap-2.5 rounded-lg px-1 py-3 text-center transition-colors',
                  on ? 'bg-card' : 'hover:bg-card/60',
                )}
              >
                <span
                  className={cn(
                    'num grid size-10 place-items-center rounded-full text-sm font-medium transition-colors',
                    s.status === 'active' &&
                      'orange-gradient text-primary-foreground shadow-[0_8px_20px_-10px_rgba(217,119,6,0.9)]',
                    s.status === 'completed' && 'bg-foreground/[0.08] text-foreground',
                    s.status === 'upcoming' && 'bg-foreground/[0.04] text-muted-foreground',
                  )}
                >
                  {s.status === 'completed' ? <Check className="size-4" /> : s.number}
                </span>
                <span className={cn('text-sm', on ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                  Sem {s.number}
                </span>
                <span className="text-[11px] text-muted-foreground">{STATUS_LABEL[s.status]}</span>
              </button>
            );
          })}
        </div>
      </Block>

      {shown && (
        <Block
          title={`Semester ${shown.number} subjects`}
          meta={`${shown.subjects.length} subjects · ${labCount} with labs`}
        >
          <div className="flex items-center gap-2">
            <Badge variant={shown.status === 'active' ? 'default' : 'secondary'} className="rounded-md">
              {STATUS_LABEL[shown.status]}
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shown.subjects.map((sub) => (
              <SubjectCard key={sub.id} subject={sub} />
            ))}
          </div>
        </Block>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | null | undefined;
  hint: string;
  badge?: string;
}) {
  return (
    <div className="surface-gradient flex flex-col gap-6 rounded-xl border border-border/60 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <p className="num text-gradient-orange text-4xl font-semibold tracking-tight">
          {value === undefined || value === null ? '—' : value}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {badge && (
            <Badge variant="secondary" className="rounded-md">
              {badge}
            </Badge>
          )}
          <span>{hint}</span>
        </div>
      </div>
    </div>
  );
}
