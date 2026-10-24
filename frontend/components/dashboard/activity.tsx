'use client';

import { Activity as ActivityIcon, FlaskConical, LogIn, Play, Table2, Waves, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Block, PageHeader } from '@/components/app/page-header';
import { ActivityItem, ActivityType, EXPERIMENT_TITLES, fetchActivities } from '@/lib/account';

const ICON: Record<ActivityType, LucideIcon> = {
  signed_in: LogIn,
  experiment_opened: FlaskConical,
  attempt_started: Play,
  row_recorded: Table2,
  sweep_run: Waves,
};

const LABEL: Record<ActivityType, string> = {
  signed_in: 'Signed in',
  experiment_opened: 'Opened the lab',
  attempt_started: 'Started an attempt',
  row_recorded: 'Recorded a reading',
  sweep_run: 'Ran a 12-point sweep',
};

const dayLabel = (iso: string) => {
  const d = new Date(iso).toDateString();
  if (d === new Date().toDateString()) return 'Today';
  if (d === new Date(Date.now() - 86_400_000).toDateString()) return 'Yesterday';
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
};

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

export function ActivityLog() {
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchActivities(200)
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  }, []);

  // Items come newest first, so consecutive items with the same day share a group.
  const groups = (items ?? []).reduce<{ label: string; items: ActivityItem[] }[]>((acc, item) => {
    const label = dayLabel(item.createdAt);
    const last = acc[acc.length - 1];
    if (last && last.label === label) last.items.push(item);
    else acc.push({ label, items: [item] });
    return acc;
  }, []);

  return (
    <div className="space-y-10">
      <PageHeader title="Activity" description="Everything you have done on Simvaya, most recent first." />

      {error && <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

      {items?.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg bg-card py-16 text-center">
          <ActivityIcon className="size-7 text-primary" />
          <p className="text-sm font-medium">No activity yet</p>
          <p className="max-w-sm text-xs text-muted-foreground">Opening labs and recording readings shows up here.</p>
        </div>
      )}

      {groups.map((g) => (
        <Block key={g.label} title={g.label} meta={`${g.items.length} ${g.items.length === 1 ? 'event' : 'events'}`}>
          <ul className="space-y-1.5">
            {g.items.map((item) => {
              const Icon = ICON[item.type];
              return (
                <li key={item.id} className="flex items-center gap-4 rounded-lg bg-card px-4 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground/[0.05] text-muted-foreground">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{LABEL[item.type]}</p>
                    {item.experimentId && (
                      <p className="truncate text-xs text-muted-foreground">
                        {EXPERIMENT_TITLES[item.experimentId] ?? item.experimentId}
                      </p>
                    )}
                  </div>
                  <time className="num shrink-0 text-xs text-muted-foreground">{timeOf(item.createdAt)}</time>
                </li>
              );
            })}
          </ul>
        </Block>
      ))}
    </div>
  );
}
