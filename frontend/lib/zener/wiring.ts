// Point-to-point wiring for the Zener lab's "Wire it yourself" mode. Each part has fixed terminals; a wire joins two.
// The reference circuit is the regulator of solver.ts, so the expected values come from the same solver as Simulate.
import type { OperatingPoint } from './solver';

export type PartKind = 'supply' | 'resistor' | 'zener' | 'load' | 'meter';
export interface PartPos {
  x: number;
  y: number;
}
export interface Wiring {
  parts: Partial<Record<PartKind, PartPos>>; // one of each part on the bench
  wires: [string, string][]; // terminal id pairs, e.g. "supply.+" to "resistor.a"
}
export const EMPTY_WIRING: Wiring = { parts: {}, wires: [] };

export const PART_NAME: Record<PartKind, string> = {
  supply: 'DC supply',
  resistor: 'Series resistor Rs',
  zener: 'Zener diode',
  load: 'Load resistor RL',
  meter: 'Multimeter',
};

export const TERMINALS: Record<PartKind, { key: string; name: string }[]> = {
  supply: [
    { key: '+', name: 'Supply +' },
    { key: '-', name: 'Supply −' },
  ],
  resistor: [
    { key: 'a', name: 'Rs end A' },
    { key: 'b', name: 'Rs end B' },
  ],
  zener: [
    { key: 'anode', name: 'Zener anode' },
    { key: 'cathode', name: 'Zener cathode' },
  ],
  load: [
    { key: 'a', name: 'RL end A' },
    { key: 'b', name: 'RL end B' },
  ],
  meter: [
    { key: 'red', name: 'Meter red probe' },
    { key: 'black', name: 'Meter black probe' },
  ],
};

export const KINDS_ORDER: PartKind[] = ['supply', 'resistor', 'zener', 'load', 'meter'];
export const termId = (kind: PartKind, key: string) => `${kind}.${key}`;
export const partOf = (t: string) => t.split('.')[0] as PartKind;
export const termName = (t: string) => {
  const [kind, key] = t.split('.') as [PartKind, string];
  return TERMINALS[kind].find((x) => x.key === key)?.name ?? t;
};

// Electrical nodes of the reference circuit for this load setting. Each node is a list of terminals that must share a net.
export function referenceNets(rl: number | null): { name: string; terms: string[] }[] {
  const load = rl === null ? [] : [termId('load', 'a')];
  const loadGnd = rl === null ? [] : [termId('load', 'b')];
  return [
    { name: 'Supply +', terms: [termId('supply', '+'), termId('resistor', 'a')] },
    { name: 'Vout', terms: [termId('resistor', 'b'), termId('zener', 'cathode'), ...load] },
    { name: 'ground', terms: [termId('supply', '-'), termId('zener', 'anode'), ...loadGnd] },
  ];
}

export function requiredParts(rl: number | null): PartKind[] {
  return rl === null ? ['supply', 'resistor', 'zener'] : ['supply', 'resistor', 'zener', 'load'];
}

// Union-find over terminals: the nets the student's wires make. Returns the root lookup.
function netsOf(wires: [string, string][]) {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const p = parent.get(x);
    if (p === undefined || p === x) return x;
    const r = find(p);
    parent.set(x, r);
    return r;
  };
  for (const [a, b] of wires) parent.set(find(a), find(b));
  return find;
}

// Why a wire cannot be added, or null when it can.
export function joinError(w: Wiring, a: string, b: string): string | null {
  if (a === b) return 'A wire must join two different terminals.';
  if ([a, b].sort().join() === [termId('supply', '+'), termId('supply', '-')].sort().join())
    return 'Dead short: supply + and − must not be joined directly.';
  if (w.wires.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) return 'Those two terminals are already joined.';
  return null;
}

export interface CheckReport {
  correct: string[]; // connections that match the reference
  missing: string[]; // parts not placed and connections not made
  wrong: string[]; // terminals joined that must stay apart
  extra: string[]; // wired terminals this setting does not use
  ok: boolean; // no missing, wrong or extra items
}

// Compares the student's nets with the reference nets for this load setting.
export function checkWiring(w: Wiring, rl: number | null): CheckReport {
  const nets = referenceNets(rl);
  const find = netsOf(w.wires);
  const placed = (t: string) => Boolean(w.parts[partOf(t)]);
  const label = new Map<string, string>();
  for (const n of nets) for (const t of n.terms) label.set(t, n.name);

  const correct: string[] = [];
  const missing: string[] = requiredParts(rl)
    .filter((k) => !w.parts[k])
    .map((k) => `Place the ${PART_NAME[k]}.`);
  for (const n of nets) {
    const present = n.terms.filter(placed);
    for (const t of present.slice(1)) {
      const line = `${termName(present[0])} to ${termName(t)}`;
      if (find(present[0]) === find(t)) correct.push(line);
      else missing.push(`Missing wire: ${line}.`);
    }
  }

  // Group the wired terminals by the nets they now share.
  const groups = new Map<string, string[]>();
  for (const t of new Set(w.wires.flat())) {
    const r = find(t);
    groups.set(r, [...(groups.get(r) ?? []), t]);
  }
  const wrong: string[] = [];
  const extra: string[] = [];
  for (const g of groups.values()) {
    const labelled = g.filter((t) => label.has(t));
    const a = labelled[0];
    const b = labelled.find((t) => label.get(t) !== label.get(a));
    if (a && b) wrong.push(`Wrong: ${termName(a)} is joined to ${termName(b)}. They must stay apart.`);
    // Meter probes may go anywhere; other terminals not in this setting are extra.
    for (const t of g) if (!label.has(t) && partOf(t) !== 'meter') extra.push(`Extra: ${termName(t)} is wired in, but this setting does not use it.`);
  }

  return { correct, missing, wrong, extra, ok: !missing.length && !wrong.length && !extra.length };
}

// What the multimeter shows: the node voltage at its probes, from the student's own nets, once the circuit is correct.
export function meterReading(w: Wiring, rl: number | null, op: OperatingPoint | null, supplyV: number): string {
  const red = termId('meter', 'red');
  const black = termId('meter', 'black');
  const wired = (t: string) => w.wires.some(([a, b]) => a === t || b === t);
  if (!wired(red) || !wired(black)) return 'open circuit';
  if (!checkWiring(w, rl).ok || !op) return 'no reading';

  const find = netsOf(w.wires);
  const nodeOf = (probe: string) => {
    const names = referenceNets(rl)
      .filter((n) => n.terms.some((t) => find(t) === find(probe)))
      .map((n) => n.name);
    return names.length === 1 ? names[0] : null;
  };
  const a = nodeOf(red);
  const b = nodeOf(black);
  if (!a || !b) return 'open circuit';
  const volts: Record<string, number> = { 'Supply +': supplyV, Vout: op.vOut, ground: 0 };
  return `${(volts[a] - volts[b]).toFixed(2)} V`;
}

// Expected values at the current setting, from the same solver as the Simulate mode.
export function expectedText(op: OperatingPoint | null): string {
  if (!op) return 'No expected values for this setting.';
  return `Vout ${op.vOut.toFixed(2)} V, Iz ${(op.iZ * 1000).toFixed(1)} mA, Pz ${(op.pZ * 1000).toFixed(0)} mW.`;
}
