// Regulation figures from the lab procedure: line regulation (Vout against input voltage at one load) and load
// regulation (Vout from no load to full load at one input voltage). Pure functions over the recorded readings.
import { solve, RS_OHM, VZ_V } from './solver.ts';

export interface Reading {
  vs: number;
  rl: number | null; // null = no load
  vOut: number;
}

export interface LineRegulation {
  value: number; // V/V
  rl: number | null;
  vsSpan: [number, number];
}

export interface LoadRegulation {
  pct: number;
  vs: number;
  vNl: number;
  vFl: number;
  rlFull: number;
}

// Line regulation in V/V for one load: the change in Vout over the widest input span recorded at that load.
export function lineRegulation(rows: Reading[]): LineRegulation | null {
  const byLoad = new Map<string, Reading[]>();
  for (const r of rows) {
    const k = String(r.rl);
    byLoad.set(k, [...(byLoad.get(k) ?? []), r]);
  }
  let best: (LineRegulation & { span: number }) | null = null;
  for (const group of byLoad.values()) {
    const sorted = [...group].sort((a, b) => a.vs - b.vs);
    const lo = sorted[0];
    const hi = sorted[sorted.length - 1];
    const span = hi.vs - lo.vs;
    if (span <= 0) continue;
    if (!best || span > best.span) {
      best = { value: (hi.vOut - lo.vOut) / span, rl: lo.rl, vsSpan: [lo.vs, hi.vs], span };
    }
  }
  return best && { value: best.value, rl: best.rl, vsSpan: best.vsSpan };
}

// Load regulation in percent, the procedure's formula: (V_NL - V_FL) / V_FL x 100, at one input voltage.
// V_NL is the no-load reading, V_FL the reading at the lowest load resistance recorded at that input.
export function loadRegulation(rows: Reading[]): LoadRegulation | null {
  const vsValues = [...new Set(rows.map((r) => r.vs))];
  let best: LoadRegulation | null = null;
  for (const vs of vsValues) {
    const at = rows.filter((r) => r.vs === vs);
    const nl = at.find((r) => r.rl === null);
    const loaded = at.filter((r): r is Reading & { rl: number } => r.rl !== null).sort((a, b) => a.rl - b.rl);
    if (!nl || loaded.length === 0 || loaded[0].vOut === 0) continue;
    const fl = loaded[0];
    best = { pct: ((nl.vOut - fl.vOut) / fl.vOut) * 100, vs, vNl: nl.vOut, vFl: fl.vOut, rlFull: fl.rl };
  }
  return best;
}

// Output against load current at one input voltage, for the load-regulation graph.
export function loadCurve(vs: number, rls: number[]): { x: number; y: number }[] {
  return rls
    .map((rl) => solve({ vs, rs: RS_OHM, vz: VZ_V, rl }))
    .flatMap((r) => (r.ok ? [{ x: r.iL * 1000, y: r.vOut }] : []))
    .sort((a, b) => a.x - b.x);
}
