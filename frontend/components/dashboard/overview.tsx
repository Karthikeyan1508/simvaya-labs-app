'use client';

import { Activity, FlaskConical } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSession } from '@/components/app/session-provider';
import { PageHeader, Block } from '@/components/app/page-header';
import { fetchSummary, type Summary } from '@/lib/account';
import { errorMessage, listSubmittedVivas, type SubmittedViva } from '@/lib/viva';
import { SubmittedVivaList } from '@/components/viva/submitted-viva-list';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export function Overview() {
  const { user } = useSession();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [vivas, setVivas] = useState<SubmittedViva[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSummary()
      .then(setSummary)
      .catch((e: Error) => setError(e.message));
    listSubmittedVivas()
      .then(setVivas)
      .catch((e: unknown) => setError(errorMessage(e)));
  }, []);

  const firstName = user?.name.split(' ')[0] ?? '';

  return (
    <div className="space-y-12">
      <div className="glow-card rounded-2xl border border-border/60 p-6 md:p-8">
        <PageHeader
          eyebrow={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          title={`${greeting()}, ${firstName}`}
          description="Your experiments and viva results."
        />
      </div>

      {error && <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2">
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
        <Stat icon={Activity} label="This week" value={summary?.activitiesThisWeek} hint="Activities in the last 7 days" />
      </div>

      <Block title="Viva results" meta={vivas ? `${vivas.length} finished` : undefined}>
        {vivas?.length === 0 && (
          <p className="glass rounded-lg p-6 text-sm text-muted-foreground">No finished vivas yet.</p>
        )}
        {vivas && vivas.length > 0 && <SubmittedVivaList vivas={vivas} />}
      </Block>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | null | undefined;
  hint: string;
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
          <span>{hint}</span>
        </div>
      </div>
    </div>
  );
}
