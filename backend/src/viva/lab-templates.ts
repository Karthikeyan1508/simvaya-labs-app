import { INDUCTION_MOTOR, NAMEPLATE } from '../experiments/induction-motor/induction-motor.content';
import { SORTING_VISUALISER } from '../experiments/sorting-visualiser/sorting-visualiser.content';
import { ZENER_REGULATOR } from '../experiments/zener-regulator/zener-regulator.content';
import type { LabViva } from './labs';
import { type Base, type Counts, type Rand, seeded, shuffle, templateQuestions } from './question-bank';
import { type DraftQuestion, type ExperimentId, VIVA_KINDS, type VivaKind } from './types';

// Template questions for each lab. The Pelton wheel keeps its own maker in question-bank.ts. The others read only the
// lab's own text and its own numbers. The same seed gives the same questions.

type Makers = Partial<Record<VivaKind, (i: number) => Base>>;
type Part = { id: string; label: string; description: string; specs: string[] };
type Formula = { label: string; formula: string; note?: string };

const round = (v: number, digits: number) => {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};

const pick = <T>(rand: Rand, items: readonly T[]): T => items[Math.floor(rand() * items.length)];

// Explain answers take their model answer from the lab text. Each item has its own prompt.
const explainMaker = (rand: Rand, bank: { prompt: string; explanation: string }[]) => {
  const order = shuffle(rand, bank);
  return (i: number): Base => ({ kind: 'explain', ...order[i % order.length] });
};

// Point, highlight and multiple choice on a bench of parts. Same rules as the Pelton maker.
function partMakers(rand: Rand, parts: Part[]): Pick<Makers, 'point' | 'highlight' | 'mcq'> {
  const pointOrder = shuffle(rand, parts);
  const highlightOrder = shuffle(rand, parts);
  const mcqOrder = shuffle(rand, parts);
  return {
    point: (i) => {
      const c = pointOrder[i % pointOrder.length];
      return { kind: 'point', prompt: `Click the ${c.label} on the rig.`, partId: c.id, explanation: `${c.label}: ${c.description}` };
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
    mcq: (i) => {
      const c = mcqOrder[i % mcqOrder.length];
      const others = shuffle(rand, parts.filter((x) => x.id !== c.id))
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
  };
}

// One formula is the answer. Three other formulas from the same lab are the wrong options.
function formulaMaker(rand: Rand, rows: Formula[], ask: (label: string) => string): (i: number) => Base {
  const order = shuffle(rand, rows);
  return (i) => {
    const target = order[i % order.length];
    const others = shuffle(rand, rows.filter((r) => r !== target))
      .slice(0, 3)
      .map((r) => r.formula);
    const options = shuffle(rand, [target.formula, ...others]);
    return {
      kind: 'formula',
      prompt: ask(target.label),
      options,
      answer: options.indexOf(target.formula),
      explanation: `${target.label}: ${target.formula}${target.note ? ` (${target.note})` : ''}`,
    };
  };
}

// The induction motor: formulas and nameplate values from the lab text. Calc asks for one value from the nameplate.
function inductionMakers(rand: Rand): Makers {
  const t = INDUCTION_MOTOR.theory;
  const { frequencyHz: f, poles: P, ratedSpeedRpm: N, ratedPowerKw: kW } = NAMEPLATE;
  const Ns = (120 * f) / P;
  const slip = ((Ns - N) / Ns) * 100;
  const torque = (kW * 1000 * 60) / (2 * Math.PI * N);
  const quantities = [
    {
      label: 'synchronous speed',
      unit: 'rpm',
      expected: round(Ns, 0),
      explanation: `Ns = 120 f / P = 120 x ${f} / ${P} = ${round(Ns, 0)} rpm.`,
    },
    {
      label: 'slip',
      unit: '%',
      expected: round(slip, 2),
      explanation: `s = (Ns - N) / Ns = (${round(Ns, 0)} - ${N}) / ${round(Ns, 0)} = ${round(slip, 2)} %.`,
    },
    {
      label: 'rated shaft torque',
      unit: 'N m',
      expected: round(torque, 2),
      explanation: `T = 60 P_out / (2 pi N) = 60 x ${kW * 1000} / (2 pi x ${N}) = ${round(torque, 2)} N m.`,
    },
  ];
  return {
    explain: explainMaker(rand, [
      { prompt: 'Explain how the stator field makes the rotor turn.', explanation: `${t[0]} ${t[1]}` },
      { prompt: 'Explain why the rotor runs slower than the field, and what slip is.', explanation: t[1] },
      { prompt: 'Explain how the shaft torque is found on the rope brake.', explanation: t[2] },
      { prompt: 'Explain how the two wattmeters give the input power.', explanation: t[3] },
    ]),
    ...partMakers(rand, INDUCTION_MOTOR.components),
    formula: formulaMaker(
      rand,
      [
        { label: 'synchronous speed', formula: 'Ns = 120 f / P' },
        { label: 'slip', formula: 's = (Ns - N) / Ns' },
        { label: 'shaft torque', formula: 'T = g(S1 - S2)(R + t/2)' },
        { label: 'output power', formula: 'P_out = 2 pi N T / 60' },
        { label: 'efficiency', formula: 'eta = 100 P_out / P_in' },
        { label: 'power factor', formula: 'pf = P_in / (sqrt(3) V_L I_L)' },
      ],
      (label) => `Which formula is used to find the ${label}?`,
    ),
    calc: () => {
      const q = pick(rand, quantities);
      return {
        kind: 'calc',
        prompt: `The lab nameplate (illustrative) gives ${kW} kW, ${N} rpm, ${f} Hz and ${P} poles. Find the ${q.label} (${q.unit}).`,
        expected: q.expected,
        unit: q.unit,
        tolerance: 0.05,
        explanation: q.explanation,
      };
    },
  };
}

// The Zener regulator: the bench, the eight procedure steps and the three formulas from the lab text. Calc uses the
// lab's own supply voltages and loads, and only the combinations where the Zener conducts.
function zenerMakers(rand: Rand): Makers {
  const t = ZENER_REGULATOR.theory;
  const { vz, rsOhm } = ZENER_REGULATOR;
  const resistor = ZENER_REGULATOR.components.find((c) => c.id === 'resistor')!;
  const steps = ZENER_REGULATOR.steps.map((text, i) => ({ step: i + 1, text }));
  const runs = ZENER_REGULATOR.inputsV.flatMap((vin) =>
    ZENER_REGULATOR.loadsOhm.map((rl) => ({ vin, rl, izMa: round(((vin - vz) / rsOhm - vz / rl) * 1000, 2) })),
  ).filter((r) => r.izMa > 0);
  return {
    explain: explainMaker(rand, [
      { prompt: 'Explain how a Zener diode holds a steady voltage.', explanation: t[0] },
      { prompt: 'Explain how the shunt regulator keeps the output steady when the load changes.', explanation: t[1] },
      { prompt: 'What limits the Zener power and the series resistor in this circuit?', explanation: t[2] },
      {
        prompt: 'Explain the role of the series resistor Rs in the regulator.',
        explanation: resistor.description,
      },
    ]),
    ...partMakers(rand, ZENER_REGULATOR.components),
    formula: formulaMaker(rand, ZENER_REGULATOR.formulas, (label) => `Which formula is used to find the ${label}?`),
    step: (() => {
      const order = shuffle(rand, steps);
      return (i: number): Base => {
        const s = order[i % order.length];
        return {
          kind: 'step',
          prompt: `Which procedure step is this? "${s.text}"`,
          step: s.step,
          explanation: `Step ${s.step}: ${s.text}`,
        };
      };
    })(),
    calc: () => {
      const r = pick(rand, runs);
      const vs = round(r.vin - vz, 2);
      const q = pick(rand, [
        {
          label: 'Zener current Iz',
          unit: 'mA',
          expected: r.izMa,
          explanation: `Vs = Vin - Vout = ${r.vin} - ${vz} = ${vs} V. Iz = Vs / Rs - IL = ${vs} / ${rsOhm} - ${vz} / ${r.rl} = ${r.izMa} mA.`,
        },
        {
          label: 'Zener power Pz',
          unit: 'mW',
          expected: round(vz * r.izMa, 1),
          explanation: `Pz = Vz x Iz = ${vz} x ${r.izMa} = ${round(vz * r.izMa, 1)} mW.`,
        },
      ]);
      return {
        kind: 'calc',
        prompt: `The supply is ${r.vin} V, the series resistor Rs is ${rsOhm} Ω and the load RL is ${r.rl} Ω. The output is at the Zener voltage of ${vz} V. Find the ${q.label} (${q.unit}).`,
        expected: q.expected,
        unit: q.unit,
        tolerance: 0.05,
        explanation: q.explanation,
      };
    },
  };
}

// Quick sort: explain from the lab's theory, multiple choice from the lab quiz, formulas from the cost table. Calc
// uses the visualiser's own range of 6 to 30 values.
function sortingMakers(rand: Rand): Makers {
  const t = SORTING_VISUALISER.theory;
  const { min, max } = SORTING_VISUALISER.sizeRange;
  const quiz = shuffle(rand, SORTING_VISUALISER.quiz);
  return {
    explain: explainMaker(rand, [
      { prompt: 'Explain the idea behind quick sort.', explanation: t[0] },
      { prompt: 'Explain the Lomuto partition that this visualiser uses.', explanation: t[1] },
      { prompt: 'Why do a sorted or reversed array cost the most with this pivot?', explanation: t[2] },
    ]),
    mcq: (i) => {
      const x = quiz[i % quiz.length];
      return { kind: 'mcq', prompt: x.q, options: [...x.options], answer: x.answer, explanation: x.why };
    },
    formula: formulaMaker(
      rand,
      SORTING_VISUALISER.equations.map((e) => ({ label: e.label, formula: e.expr, note: e.note })),
      (label) => `Which formula gives the ${label.toLowerCase()}?`,
    ),
    calc: () => {
      const n = min + Math.floor(rand() * (max - min + 1));
      const q = pick(rand, [
        {
          prompt: `An array of ${n} distinct values is already in order, and the last element is the pivot. How many comparisons does the worst case take?`,
          expected: (n * (n - 1)) / 2,
          explanation: `C(n) = n(n - 1) / 2 = ${n} x ${n - 1} / 2 = ${(n * (n - 1)) / 2} comparisons.`,
        },
        {
          prompt: `One partition works on a segment of ${n} items. How many comparisons does it make?`,
          expected: n - 1,
          explanation: `Partition cost = n - 1 = ${n} - 1 = ${n - 1} comparisons.`,
        },
      ]);
      return { kind: 'calc', prompt: q.prompt, expected: q.expected, unit: 'comparisons', tolerance: 0.05, explanation: q.explanation };
    },
  };
}

const MAKERS: Record<Exclude<ExperimentId, 'pelton-wheel'>, (rand: Rand) => Makers> = {
  'induction-motor': inductionMakers,
  'zener-regulator': zenerMakers,
  'sorting-visualiser': sortingMakers,
};

// Builds counts questions of each kind for the lab, shuffled together. A kind the lab has no maker for throws, so a
// bad count can never produce a question the lab does not support.
export function labTemplateQuestions(lab: LabViva, counts: Counts, seed: number): DraftQuestion[] {
  if (lab.id === 'pelton-wheel') return templateQuestions(counts, seed);
  const rand = seeded(seed);
  const make = MAKERS[lab.id](rand);
  const out: DraftQuestion[] = [];
  for (const kind of VIVA_KINDS) {
    for (let i = 0; i < (counts[kind] ?? 0); i++) {
      const maker = make[kind];
      if (!maker) throw new Error(`${lab.id} has no ${kind} template`);
      out.push({ ...maker(i), points: 1, source: 'template' });
    }
  }
  return shuffle(rand, out);
}
