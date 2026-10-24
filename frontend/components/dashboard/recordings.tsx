'use client';

import { Table2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Block, PageHeader } from '@/components/app/page-header';
import { buttonVariants } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EXPERIMENT_TITLES, fetchRecordings, type RecordingItem } from '@/lib/account';
import { dateTime, fmt } from '@/lib/format';
import type { ObservationRow } from '@/lib/types';

// Same units and order as the lab's observation table, trimmed to the main results.
const COLS: { label: string; unit: string; get: (r: ObservationRow) => string }[] = [
  { label: 'T1', unit: 'kg', get: (r) => fmt(r.deadWeightKg, 2) },
  { label: 'T2', unit: 'kg', get: (r) => fmt(r.springKg, 2) },
  { label: 'T', unit: 'kg', get: (r) => fmt(r.netLoadKg, 2) },
  { label: 'BHP', unit: 'kW', get: (r) => fmt(r.bhpKw, 3) },
  { label: 'η', unit: '%', get: (r) => fmt(r.etaPct, 1) },
  { label: 'Qact', unit: 'm³/s', get: (r) => fmt(r.qActM3s, 5) },
  { label: 'N', unit: 'rpm', get: (r) => fmt(r.speedRpm, 0) },
];

export function Recordings() {
  const [items, setItems] = useState<RecordingItem[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRecordings()
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="space-y-10">
      <PageHeader title="Recordings" description="Every reading you saved from the labs, newest first." />

      {error && <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

      {items?.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg bg-card py-16 text-center">
          <Table2 className="size-7 text-primary" />
          <p className="text-sm font-medium">No recordings yet</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Record a row in the Pelton wheel lab and it will be saved here.
          </p>
          <Link href="/experiments/pelton-wheel" className={buttonVariants({ size: 'sm' })}>
            Open the lab
          </Link>
        </div>
      )}

      {items && items.length > 0 && (
        <Block title="Readings" meta={`${items.length} saved`}>
          <div className="overflow-hidden rounded-lg bg-card">
            <Table className="min-w-[960px] text-xs">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-40">Saved</TableHead>
                  <TableHead>Experiment</TableHead>
                  {COLS.map((c) => (
                    <TableHead key={c.label} className="text-right">
                      <span className="num text-foreground">{c.label}</span>
                      <span className="num block text-[10px] font-normal text-muted-foreground">{c.unit}</span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="num whitespace-nowrap text-muted-foreground">{dateTime(r.createdAt)}</TableCell>
                    <TableCell className="max-w-64 truncate font-medium">
                      {EXPERIMENT_TITLES[r.experimentId] ?? r.experimentId}
                    </TableCell>
                    {COLS.map((c) => (
                      <TableCell key={c.label} className={`num text-right ${c.label === 'η' ? 'font-semibold' : ''}`}>
                        {c.get(r.data)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Block>
      )}
    </div>
  );
}
