'use client';

import { Plus, Trash2 } from 'lucide-react';
import { SectionHead } from '@/components/lab/section-head';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { averageComparisons, balancedComparisons, worstComparisons, type Preset, type SortStep } from './engine';

export interface RecordedRun {
  id: number;
  n: number;
  preset: Preset;
  comparisons: number;
  swaps: number;
}

const PRESET_LABEL: Record<Preset, string> = { random: 'Random', nearly: 'Nearly sorted', reversed: 'Reversed' };

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-foreground/[0.035] p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="num mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Formula({ label, expr, value, note }: { label: string; expr: string; value: string; note: string }) {
  return (
    <div className="rounded-md bg-foreground/[0.035] p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="num mt-2 text-sm">{expr}</p>
      <p className="num mt-1 text-xl font-semibold text-primary">{value}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

export function SortCalculations({
  n,
  preset,
  steps,
  runs,
  onRecord,
  onClear,
}: {
  n: number;
  preset: Preset;
  steps: SortStep[];
  runs: RecordedRun[];
  onRecord: () => void;
  onClear: () => void;
}) {
  // The whole run, not only the steps played so far.
  const comparisons = steps.filter((s) => s.type === 'compare').length;
  const swaps = steps.filter((s) => s.type === 'swap').length;
  const average = averageComparisons(n);
  const ratio = average > 0 ? comparisons / average : 0;

  return (
    <div className="space-y-8">
      <SectionHead
        title="Calculations"
        subtitle="Count the work of this run, then compare it with the formulas."
        actions={
          <Button onClick={onRecord} size="sm">
            <Plus /> Record run
          </Button>
        }
      />

      <div className="grid max-w-3xl gap-3 sm:grid-cols-3">
        <Stat label={`Items · ${PRESET_LABEL[preset]}`} value={n} />
        <Stat label="Comparisons" value={comparisons} />
        <Stat label="Swaps" value={swaps} />
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Formulas for {n} items</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Formula
            label="Best case"
            expr="n log₂ n"
            value={balancedComparisons(n).toFixed(1)}
            note="Every pivot splits the segment in half."
          />
          <Formula
            label="Average case"
            expr="2(n + 1)H(n) − 4n"
            value={average.toFixed(1)}
            note={`This run made ${ratio.toFixed(2)} times the average.`}
          />
          <Formula
            label="Worst case"
            expr="n(n − 1) / 2"
            value={worstComparisons(n).toFixed(0)}
            note="The pivot is always the smallest or largest item."
          />
        </div>
      </section>

      <section className="max-w-3xl space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Recorded runs</h3>
          {runs.length > 0 && (
            <Button variant="outline" size="sm" onClick={onClear}>
              <Trash2 /> Clear
            </Button>
          )}
        </div>
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Press Record run to add this run to the table.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Input</TableHead>
                  <TableHead className="text-right">Comparisons</TableHead>
                  <TableHead className="text-right">Swaps</TableHead>
                  <TableHead className="text-right">Average</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="num">{r.id}</TableCell>
                    <TableCell className="num">{r.n}</TableCell>
                    <TableCell>{PRESET_LABEL[r.preset]}</TableCell>
                    <TableCell className="num text-right">{r.comparisons}</TableCell>
                    <TableCell className="num text-right">{r.swaps}</TableCell>
                    <TableCell className="num text-right">{averageComparisons(r.n).toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
