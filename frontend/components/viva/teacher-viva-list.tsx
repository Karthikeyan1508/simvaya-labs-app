'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/app/page-header';
import { buttonVariants } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EXPERIMENT_TITLES } from '@/lib/account';
import { cn } from '@/lib/utils';
import { errorMessage, listVivas, type VivaSummary } from '@/lib/viva';
import { StatusBadge, formatDate } from './shared';

export function TeacherVivaList() {
  const [vivas, setVivas] = useState<VivaSummary[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listVivas().then(setVivas).catch((e: unknown) => setError(errorMessage(e)));
  }, []);

  return (
    <div className="space-y-10">
      <PageHeader
        title="Vivas"
        description="Build a viva, publish it to students, and grade what they submit."
        actions={
          <Link href="/teacher/viva/new" className={buttonVariants({ size: 'sm' })}>
            <Plus /> New viva
          </Link>
        }
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!vivas && !error && <p className="text-sm text-muted-foreground">Loading vivas…</p>}

      {vivas?.length === 0 && (
        <div className="glass rounded-lg p-8 text-center md:p-12">
          <p className="font-medium">No vivas yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Create one to send questions to students. Quick send uses templates; AI draft lets you review every question first.
          </p>
          <Link href="/teacher/viva/new" className={cn(buttonVariants({ size: 'sm' }), 'mt-6')}>
            <Plus /> New viva
          </Link>
        </div>
      )}

      {vivas && vivas.length > 0 && (
        <div className="glass overflow-x-auto rounded-lg">
          <Table className="min-w-[640px] text-sm">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Viva</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Questions</TableHead>
                <TableHead className="text-right">Attempts</TableHead>
                <TableHead className="text-right">Submitted</TableHead>
                <TableHead className="text-right">Published</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vivas.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <Link href={`/teacher/viva/${v.id}`} className="font-medium hover:underline">
                      {v.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{EXPERIMENT_TITLES[v.experimentId] ?? v.experimentId}</p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={v.status} />
                  </TableCell>
                  <TableCell className="num text-right">{v.questionCount}</TableCell>
                  <TableCell className="num text-right">{v.attemptCount}</TableCell>
                  <TableCell className="num text-right">{v.submittedCount}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatDate(v.publishedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
