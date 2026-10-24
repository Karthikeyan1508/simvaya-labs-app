import { PELTON_WHEEL } from '../experiments/pelton-wheel/pelton-wheel.content';
import {
  calculate,
  simulate,
  stallLoadKg,
  sweep,
  type CalcInput,
} from '../experiments/pelton-wheel/pelton-wheel.physics';
import { type DraftQuestion, VIVA_KINDS, type VivaKind } from './types';

// Template generator. The same seed gives the same questions. Expected values come from calculate and sweep.

export type Counts = Partial<Record<VivaKind, number>>;
export type Rand = () => number;
export type Base = Omit<DraftQuestion, 'points' | 'source'>;

// mulberry32: a small seeded generator.
export function seeded(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(rand: Rand, items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const round = (v: number, digits: number) => {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};

const CALC_QUANTITIES: {
  label: string;
  unit: string;
  field: 'headVenturiM' | 'qActM3s' | 'torqueNm' | 'bhpKw' | 'ipKw' | 'etaPct' | 'netLoadKg';
  step: string;
}[] = [
  { label: 'venturi head H', unit: 'm', field: 'headVenturiM', step: 'hv' },
  { label: 'actual discharge Qact', unit: 'm3/s', field: 'qActM3s', step: 'q' },
  { label: 'brake torque', unit: 'N m', field: 'torqueNm', step: 'torque' },
  { label: 'brake horsepower', unit: 'kW', field: 'bhpKw', step: 'bhp' },
  { label: 'input horsepower', unit: 'kW', field: 'ipKw', step: 'ip' },
  { label: 'efficiency', unit: '%', field: 'etaPct', step: 'eta' },
  { label: 'result load T', unit: 'kg', field: 'netLoadKg', step: 'net' },
];

// One random rig setting, read the way a student would read it, then run through calculate.
function sampleRun(rand: Rand) {
  const nozzleStep = 1 + Math.floor(rand() * 8);
  const net = stallLoadKg(nozzleStep) * (0.3 + rand() * 0.5);
  const deadWeightKg = net >= 1 ? round(net - 1, 1) : 0;
  const springKg = net >= 1 ? 0 : round(1 - net, 1);
  const r = simulate({ pumpOn: true, nozzleStep, deadWeightKg, springKg });
  const input: CalcInput = { deadWeightKg, springKg, p1: r.p1, p2: r.p2, pp: r.pp, speedRpm: r.speedRpm };
  return { nozzleStep, input, result: calculate(input) };
}

const readingsText = (r: CalcInput) =>
  `Dead weights T1 = ${r.deadWeightKg} kg, spring balance T2 = ${r.springKg} kg, P1 = ${r.p1} kg/cm2, ` +
  `P2 = ${r.p2} kg/cm2, Pp = ${r.pp} kg/cm2, speed = ${r.speedRpm} rpm.`;

// One maker per kind. Decks are shuffled once per call so every question in a set is different where it can be.
function makers(rand: Rand): Record<VivaKind, (i: number) => Base> {
  const parts = shuffle(rand, PELTON_WHEEL.components);
  const described = parts.filter((c) => c.description);
  const highlightOrder = shuffle(rand, PELTON_WHEEL.components);
  const steps = shuffle(rand, PELTON_WHEEL.procedure);
  const explainBank = shuffle(rand, [
    { prompt: 'Explain the principle of operation of a Pelton wheel.', explanation: PELTON_WHEEL.theory },
    {
      prompt: 'Explain why the net load on the brake is T = T1 + T0 - T2.',
      explanation: 'T1 is the dead weight, T0 = 1 kg is the fixed hanger and T2 is the spring balance reading that opposes them.',
    },
    ...described.map((c) => ({
      prompt: `Explain the role of the ${c.label} in the test rig.`,
      explanation: [c.description, ...c.specs].join(' '),
    })),
  ]);

  return {
    explain: (i) => ({ kind: 'explain', ...explainBank[i % explainBank.length] }),

    mcq: (i) => {
      const c = described[i % described.length];
      const others = shuffle(
        rand,
        PELTON_WHEEL.components.filter((x) => x.id !== c.id),
      )
        .slice(0, 3)
        .map((x) => x.label);
      const options = shuffle(rand, [c.label, ...others]);
      return {
        kind: 'mcq',
        prompt: `Which part matches this description? "${c.description}"`,
        options,
        answer: options.indexOf(c.label),
        explanation: `${c.label}: ${c.description}`,
      };
    },

    formula: () => {
      const { result } = sampleRun(rand);
      const target = result.steps[Math.floor(rand() * result.steps.length)];
      const others = shuffle(
        rand,
        result.steps.filter((s) => s.key !== target.key),
      )
        .slice(0, 3)
        .map((s) => s.formula);
      const options = shuffle(rand, [target.formula, ...others]);
      return {
        kind: 'formula',
        prompt: `Which formula is used to find the ${target.label.toLowerCase()}?`,
        options,
        answer: options.indexOf(target.formula),
        explanation: `${target.label}: ${target.formula}`,
      };
    },

    point: (i) => {
      const c = parts[i % parts.length];
      return {
        kind: 'point',
        prompt: `Click the ${c.label} on the rig.`,
        partId: c.id,
        explanation: `${c.label}: ${c.description}`,
      };
    },

    highlight: (i) => {
      const c = highlightOrder[i % highlightOrder.length];
      return {
        kind: 'highlight',
        prompt: 'Name the part that is highlighted on the rig.',
        partId: c.id,
        explanation: `The highlighted part is the ${c.label}.`,
      };
    },

    step: (i) => {
      const s = steps[i % steps.length];
      return {
        kind: 'step',
        prompt: `Which procedure step is this? "${s.text}"`,
        step: s.step,
        explanation: `Step ${s.step}: ${s.text}`,
      };
    },

    calc: () => {
      const { input, result } = sampleRun(rand);
      const m = CALC_QUANTITIES[Math.floor(rand() * CALC_QUANTITIES.length)];
      const s = result.steps.find((x) => x.key === m.step)!;
      return {
        kind: 'calc',
        prompt: `The rig reads: ${readingsText(input)} Find the ${m.label} (${m.unit}).`,
        expected: result[m.field],
        unit: m.unit,
        tolerance: 0.05,
        explanation: `${s.formula}; ${s.substituted}`,
      };
    },

    graph: () => {
      const nozzleStep = 1 + Math.floor(rand() * 8);
      const rows = sweep(nozzleStep, 20);
      const byEta = rand() < 0.5;
      const yKey = byEta ? 'etaPct' : 'bhpKw';
      const best = rows.reduce((a, b) => (b[yKey] > a[yKey] ? b : a));
      const graph = {
        x: rows.map((r) => r.netLoadKg),
        y: rows.map((r) => r[yKey]),
        xLabel: 'Net load T (kg)',
        yLabel: byEta ? 'Efficiency (%)' : 'Brake power (kW)',
        peakX: best.netLoadKg,
      };
      return byEta
        ? {
            kind: 'graph',
            prompt: `The graph shows efficiency against net load at nozzle ${nozzleStep}/8. At what net load (kg) is efficiency highest?`,
            expected: best.netLoadKg,
            unit: 'kg',
            tolerance: 0.1,
            graph,
            explanation: `Efficiency peaks at ${best.etaPct}% when T = ${best.netLoadKg} kg.`,
          }
        : {
            kind: 'graph',
            prompt: `The graph shows brake power against net load at nozzle ${nozzleStep}/8. What is the highest brake power (kW)?`,
            expected: best.bhpKw,
            unit: 'kW',
            tolerance: 0.05,
            graph,
            explanation: `Brake power peaks at ${best.bhpKw} kW when T = ${best.netLoadKg} kg.`,
          };
    },
  };
}

// Builds `counts` questions of each kind, shuffled together. Same seed, same output.
export function templateQuestions(counts: Counts, seed: number): DraftQuestion[] {
  const rand = seeded(seed);
  const make = makers(rand);
  const out: DraftQuestion[] = [];
  for (const kind of VIVA_KINDS) {
    for (let i = 0; i < (counts[kind] ?? 0); i++) {
      out.push({ ...make[kind](i), points: 1, source: 'template' });
    }
  }
  return shuffle(rand, out);
}
