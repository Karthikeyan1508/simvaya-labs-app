'use client';

import { Check, Download, Table2, Trash2, Undo2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { SectionHead } from '@/components/lab/section-head';
import { Button } from '@/components/ui/button';
import { rawError, type DerivedReadings, type ObservationRow, type RawReadings, type SimReadings } from '@/lib/induction';
import { rawFromSim } from '@/lib/induction-api';
import { cn } from '@/lib/utils';
import type { RowsApi } from './lab-rows';

const COLUMNS: { label: string; unit: string }[] = [
  { label: 'VL', unit: 'V' },
  { label: 'IL', unit: 'A' },
  { label: 'W1', unit: 'W' },
  { label: 'W2', unit: 'W' },
  { label: 'Pin', unit: 'W' },
  { label: 'S1', unit: 'kg' },
  { label: 'S2', unit: 'kg' },
  { label: 'T', unit: 'N·m' },
  { label: 'N', unit: 'rpm' },
  { label: 'Ns', unit: 'rpm' },
  { label: 'slip', unit: '%' },
  { label: 'Pout', unit: 'W' },
  { label: 'pf', unit: '' },
  { label: 'η', unit: '%' },
];

export function ObservationsSection({
  api,
  sim,
  canCapture,
  captureHint,
}: {
  api: RowsApi;
  sim: SimReadings;
  canCapture: boolean;
  captureHint: string;
}) {
  const { rows, lastDeleted } = api;

  return (
    <div className="space-y-6">
      <SectionHead
        title="Observations"
        subtitle="One row per reading. Edit the raw readings if you need to. The calculated columns come from the backend, and any row you change is marked manual."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => api.capture(rawFromSim(sim))} disabled={!canCapture || api.capturing}>
          Capture reading
        </Button>
        <Button variant="outline" onClick={api.exportCsv} disabled={rows.length === 0}>
          <Download /> Export CSV
        </Button>
        {api.exported && (
          <span className="flex items-center gap-1 text-xs text-primary">
            <Check className="size-3.5" /> CSV downloaded
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          {canCapture ? 'Copies the current simulated readings into a new row.' : captureHint}
        </span>
      </div>

      {lastDeleted && (
        <div className="flex items-center justify-between gap-3 rounded-md bg-foreground/[0.035] px-3 py-2 text-sm">
          <span>Row {lastDeleted.row.observation} deleted.</span>
          <Button variant="ghost" size="sm" onClick={api.restore}>
            <Undo2 /> Undo
          </Button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="surface-gradient flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <span className="orange-gradient grid size-12 place-items-center rounded-2xl text-primary-foreground">
            <Table2 className="size-5" />
          </span>
          <p className="text-sm font-semibold">No observations yet</p>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            Supply and start the motor, set a load, then capture a reading. Begin with a no-load reading.
          </p>
        </div>
      ) : (
        <div className="max-w-full overflow-x-auto rounded-lg border border-border/70 bg-card">
          <table className="num w-full min-w-[1180px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/70 text-left">
                <th className="px-3 py-2.5 font-medium">#</th>
                {COLUMNS.map((c) => (
                  <th key={c.label} className="px-2 py-2.5 text-right font-medium">
                    <span className="text-foreground">{c.label}</span>
                    <span className="block text-[10px] font-normal text-muted-foreground">{c.unit}</span>
                  </th>
                ))}
                <th className="px-3 py-2.5 font-medium">Note</th>
                <th className="px-2 py-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            {rows.map((r) => (
              <ObsRows key={r.id} row={r} api={api} />
            ))}
          </table>
        </div>
      )}
    </div>
  );
}

function ObsRows({ row: r, api }: { row: ObservationRow; api: RowsApi }) {
  const d = api.derivedOf(r);
  const active = api.selectedId === r.id;
  const pending = d === null;

  return (
    <tbody className={cn(pending && 'opacity-70')}>
      <tr
        onClick={() => api.select(r.id)}
        className={cn('cursor-pointer border-t border-border/50 transition-colors', active ? 'bg-primary/10' : 'hover:bg-foreground/[0.04]')}
      >
        <td className="relative px-3 py-2 align-top font-semibold">
          {active && <span className="orange-gradient absolute inset-y-0 left-0 w-[3px]" />}
          <span className="flex items-center gap-2">
            {r.observation}
            <span
              className={cn(
                'rounded-sm px-1 text-[10px] font-normal',
                r.source === 'simulated' ? 'bg-primary/10 text-primary' : 'bg-foreground/[0.06] text-muted-foreground',
              )}
            >
              {r.source}
            </span>
          </span>
        </td>
        <RawCell row={r} field="VL" label="VL" api={api} />
        <RawCell row={r} field="IL" label="IL" api={api} />
        <RawCell row={r} field="W1" label="W1" api={api} />
        <RawCell row={r} field="W2" label="W2" api={api} />
        <CalcCell d={d} pick={(x) => x.pinW} digits={1} />
        <RawCell row={r} field="s1Kg" label="S1" api={api} />
        <RawCell row={r} field="s2Kg" label="S2" api={api} />
        <CalcCell d={d} pick={(x) => x.torqueNm} digits={3} />
        <RawCell row={r} field="speedRpm" label="N" api={api} />
        <CalcCell d={d} pick={(x) => x.syncRpm} digits={0} />
        <CalcCell d={d} pick={(x) => x.slipPct} digits={2} />
        <CalcCell d={d} pick={(x) => x.poutW} digits={1} />
        <CalcCell d={d} pick={(x) => x.pf} digits={3} />
        <CalcCell d={d} pick={(x) => x.etaPct} digits={2} strong />
        <td className="px-3 py-2 align-top">
          <NoteCell value={r.note} onCommit={(note) => api.setNote(r.id, note)} />
        </td>
        <td className="px-2 py-2 align-top">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete observation ${r.observation}`}
            onClick={(e) => {
              e.stopPropagation();
              api.remove(r.id);
            }}
          >
            <Trash2 />
          </Button>
        </td>
      </tr>
      {d && d.issues.length > 0 && (
        <tr>
          <td colSpan={17} className={cn('px-4 pb-2 text-[11px]', d.valid ? 'text-muted-foreground' : 'text-destructive')}>
            {d.issues.join('. ')}
          </td>
        </tr>
      )}
    </tbody>
  );
}

// A calculated value. Shows "…" while the calculation for the current readings is pending.
function CalcCell({
  d,
  pick,
  digits,
  strong,
}: {
  d: DerivedReadings | null;
  pick: (d: DerivedReadings) => number | null;
  digits: number;
  strong?: boolean;
}) {
  const v = d ? pick(d) : null;
  return (
    <td className={cn('px-2 py-2 text-right align-top tabular-nums', strong && 'font-semibold')}>
      {d === null ? (
        <span className="text-muted-foreground">…</span>
      ) : v === null || !Number.isFinite(v) ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        v.toFixed(digits)
      )}
    </td>
  );
}

// A raw reading typed by the student. Checks the range on each key, commits on blur or Enter, Escape cancels.
function RawCell({
  row,
  field,
  label,
  api,
}: {
  row: ObservationRow;
  field: keyof RawReadings;
  label: string;
  api: RowsApi;
}) {
  const value = row.raw[field];
  return <RawInput key={`${row.id}-${field}-${value}`} value={value} field={field} label={label} onCommit={(v) => api.setRaw(row.id, field, v)} />;
}

function RawInput({
  value,
  field,
  label,
  onCommit,
}: {
  value: number;
  field: keyof RawReadings;
  label: string;
  onCommit: (v: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  const commit = () => {
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    const msg = rawError(field, draft);
    setError(msg);
    if (!msg && Number(draft) !== value) onCommit(Number(draft));
  };

  return (
    <td className="px-2 py-1.5 align-top">
      <input
        type="number"
        step="any"
        inputMode="decimal"
        aria-label={`${label} for this observation`}
        aria-invalid={error !== null}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setError(rawError(field, e.target.value));
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            cancelled.current = true;
            setDraft(String(value));
            setError(null);
            e.currentTarget.blur();
          }
        }}
        className={cn(
          'num w-20 rounded-md border bg-transparent px-2 py-1 text-right outline-none focus-visible:border-primary',
          error ? 'border-destructive' : 'border-border/70',
        )}
      />
      {error && <span className="mt-1 block max-w-[9rem] text-[10px] leading-tight text-destructive">{error}</span>}
    </td>
  );
}

function NoteCell({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  return (
    <input
      type="text"
      maxLength={120}
      aria-label="Note for this observation"
      defaultValue={value}
      onBlur={(e) => {
        if (e.target.value !== value) onCommit(e.target.value);
      }}
      placeholder="Note"
      className="w-40 rounded-md border border-border/70 bg-transparent px-2 py-1 text-left font-sans text-xs outline-none focus-visible:border-primary"
    />
  );
}
