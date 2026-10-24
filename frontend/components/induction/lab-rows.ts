'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { saveRecording } from '@/lib/account';
import {
  rawKey,
  rowsToCsv,
  type DerivedReadings,
  type ObservationRow,
  type RawReadings,
} from '@/lib/induction';
import { calculateInduction } from '@/lib/induction-api';

const EXPERIMENT = 'induction-motor';

type Calc = { key: string; derived: DerivedReadings };

// Observation numbers always count up from 1 in table order.
const renumber = (rows: ObservationRow[]) => rows.map((r, i) => (r.observation === i + 1 ? r : { ...r, observation: i + 1 }));

// The observation table: captured readings, edits, deletes with one undo, calculated values and CSV export.
// Calculated values come from the backend and are keyed to the raw readings they were made from, so an edit
// shows a pending value until the new calculation arrives.
export function useObservationRows({ onError }: { onError: (message: string) => void }) {
  const [rows, setRows] = useState<ObservationRow[]>([]);
  const [calc, setCalc] = useState<Record<number, Calc>>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [lastDeleted, setLastDeleted] = useState<{ row: ObservationRow; index: number } | null>(null);
  const [exported, setExported] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const nextId = useRef(1);
  const inflight = useRef(new Set<string>());
  const busy = useRef(false);

  // After a change, calculate each row whose readings have no matching value yet. Waits 300 ms so typing does not flood the backend.
  useEffect(() => {
    const todo = rows.filter((r) => {
      const key = rawKey(r.raw);
      return calc[r.id]?.key !== key && !inflight.current.has(`${r.id}|${key}`);
    });
    if (todo.length === 0) return;
    const timer = window.setTimeout(() => {
      for (const r of todo) {
        const key = rawKey(r.raw);
        const tag = `${r.id}|${key}`;
        inflight.current.add(tag);
        calculateInduction(r.raw)
          .then((derived) => setCalc((c) => ({ ...c, [r.id]: { key, derived } })))
          .catch((e: Error) => onError(e.message))
          .finally(() => inflight.current.delete(tag));
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [rows, calc, onError]);

  const derivedOf = useCallback(
    (r: ObservationRow): DerivedReadings | null => {
      const c = calc[r.id];
      return c && c.key === rawKey(r.raw) ? c.derived : null;
    },
    [calc],
  );

  // Copies the current simulated readings into a new row. Waits for the calculation so the saved row is complete.
  const capture = async (raw: RawReadings) => {
    if (busy.current) return;
    busy.current = true;
    setCapturing(true);
    try {
      const derived = await calculateInduction(raw);
      const id = nextId.current++;
      const row: ObservationRow = { id, observation: rows.length + 1, raw, derived, note: '', source: 'simulated' };
      setCalc((c) => ({ ...c, [id]: { key: rawKey(raw), derived } }));
      setRows((prev) => renumber([...prev, row]));
      setSelectedId(id);
      saveRecording(EXPERIMENT, row).catch((e: Error) => onError(`Could not save the row to your account: ${e.message}`));
    } catch (e) {
      onError((e as Error).message);
    } finally {
      busy.current = false;
      setCapturing(false);
    }
  };

  // Any edit to a raw value makes the row a manual one. The saved copy keeps the captured values.
  const setRaw = (id: number, field: keyof RawReadings, value: number) =>
    setRows((prev) =>
      prev.map((r): ObservationRow => (r.id === id ? { ...r, raw: { ...r.raw, [field]: value }, source: 'manual' } : r)),
    );

  const setNote = (id: number, note: string) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, note } : r)));

  const remove = (id: number) => {
    const index = rows.findIndex((r) => r.id === id);
    if (index < 0) return;
    setLastDeleted({ row: rows[index], index });
    setRows(renumber(rows.filter((r) => r.id !== id)));
    if (selectedId === id) setSelectedId(null);
  };

  const restore = () => {
    if (!lastDeleted) return;
    const { row, index } = lastDeleted;
    setRows((prev) => {
      const next = [...prev];
      next.splice(Math.min(index, next.length), 0, row);
      return renumber(next);
    });
    setLastDeleted(null);
  };

  const exportCsv = () => {
    const text = rowsToCsv(rows, derivedOf);
    const url = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'induction-motor-observations.csv';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExported(true);
  };

  return {
    rows,
    derivedOf,
    selectedId,
    select: setSelectedId,
    capturing,
    capture,
    setRaw,
    setNote,
    remove,
    lastDeleted,
    restore,
    exportCsv,
    exported,
  };
}

export type RowsApi = ReturnType<typeof useObservationRows>;
