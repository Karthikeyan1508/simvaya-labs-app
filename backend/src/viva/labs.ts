import { INDUCTION_MOTOR, NAMEPLATE } from '../experiments/induction-motor/induction-motor.content';
import { PELTON_WHEEL } from '../experiments/pelton-wheel/pelton-wheel.content';
import { SORTING_VISUALISER } from '../experiments/sorting-visualiser/sorting-visualiser.content';
import { ZENER_REGULATOR } from '../experiments/zener-regulator/zener-regulator.content';
import { PELTON_PARTS, type PartTable } from './part-aliases';
import type { Counts } from './question-bank';
import { type ExperimentId, VIVA_KINDS, type VivaKind } from './types';

// One lab as the viva generators see it. Every fact is the lab's own text. Nothing is added here.
export interface LabViva {
  id: ExperimentId;
  name: string; // "Write these viva questions for {name}"
  subject: string; // "an electronics" gives "an electronics lab" and "You mark an electronics viva answer"
  kinds: VivaKind[]; // the kinds the lab supports. The Groq prompt lists only these.
  counts: Counts; // the eight questions a self-assessment asks, by kind. Only these kinds are generated.
  agenticOrg: boolean; // the AgenticOrg agent is set up for the Pelton wheel only
  facts: unknown; // sent to Groq as the only source of truth
  physics: string; // the formulas Groq may use
  calcRule?: string; // replaces the generic calc rule in the Groq prompt
  parts: PartTable; // point and highlight questions name one of these parts
}

const partsOf = (components: { id: string; label: string }[], aliases: Record<string, string[]>): PartTable => ({
  labels: Object.fromEntries(components.map((c) => [c.id, c.label])),
  aliases,
});

const pickFields = <T extends { id: string; label: string; description: string; specs: string[] }>(items: T[]) =>
  items.map(({ id, label, description, specs }) => ({ id, label, description, specs }));

// Grading only. Extra names a student may say for each part of the induction motor. Never sent to students.
const INDUCTION_ALIASES: Record<string, string[]> = {
  housing: ['housing', 'frame', 'ribbed housing', 'motor frame'],
  stator: ['stator', 'stator core', 'stator winding', 'winding'],
  rotor: ['rotor', 'squirrel cage', 'cage rotor', 'rotor bars'],
  shaft: ['shaft'],
  bearing_de: ['drive end bearing', 'de bearing', 'drive bearing'],
  bearing_nde: ['non drive end bearing', 'nde bearing', 'fan end bearing'],
  fan: ['fan', 'cooling fan'],
  terminal_box: ['terminal box', 'terminals', 'junction box'],
  feet: ['feet', 'mounting feet', 'foot'],
  brake_drum: ['brake drum', 'drum', 'brake'],
  spring_balances: ['spring balance', 'spring balances', 's1', 's2'],
  supply_panel: ['supply panel', 'panel'],
  starter: ['starter'],
  estop: ['emergency stop', 'estop', 'e stop', 'red button'],
  voltmeter: ['voltmeter', 'vl meter'],
  ammeter: ['ammeter', 'ammeter il', 'current meter'],
  wattmeter_w1: ['wattmeter w1', 'w1'],
  wattmeter_w2: ['wattmeter w2', 'w2'],
  speed_sensor: ['tachometer', 'tacho', 'speed sensor', 'speed meter', 'rev counter'],
};

// Grading only, as above, for the Zener bench.
const ZENER_ALIASES: Record<string, string[]> = {
  supply: ['supply', 'dc supply', 'variable supply', 'power supply'],
  rheostat: ['rheostat', 'load', 'load resistor', 'rl', 'variable resistor'],
  resistor: ['series resistor', 'rs', 'series resistance'],
  zener: ['zener diode', 'diode', '1n4733a'],
  vs_meter: ['voltmeter vs', 'vs meter', 'vs'],
  vout_meter: ['voltmeter vout', 'vout meter', 'vout', 'output voltmeter'],
  ammeter: ['ammeter', 'ammeter iz', 'iz meter', 'current meter'],
  switch: ['switch', 'supply switch', 'on off switch'],
};

const PELTON: LabViva = {
  id: 'pelton-wheel',
  name: 'the Pelton wheel lab',
  subject: 'a mechanical engineering',
  kinds: [...VIVA_KINDS],
  counts: { explain: 2, mcq: 1, formula: 1, point: 1, highlight: 1, step: 1, calc: 1 },
  agenticOrg: true,
  facts: {
    theory: PELTON_WHEEL.theory,
    components: pickFields(PELTON_WHEEL.components),
    procedure: PELTON_WHEEL.procedure,
  },
  physics:
    'Physics: H = 10 x P, P = P2 - P1, Qact = 0.0055 x sqrt(H), T = T1 + T0 - T2 with T0 = 1 kg, tau = T x 9.81 x 0.415 / 2, eta = BHP / IHP x 100.',
  calcRule:
    '- calc: the prompt gives the readings (T1, T2, P1, P2, Pp, speed) and asks for one value. expected (number), unit, tolerance 0.05.',
  parts: PELTON_PARTS,
};

const INDUCTION: LabViva = {
  id: 'induction-motor',
  name: 'the three-phase induction motor lab',
  subject: 'an electrical engineering',
  // No step kind: the induction procedure has ten stages, not numbered steps 1 to 9. No graph: the viva has no graph generator.
  kinds: ['explain', 'mcq', 'formula', 'point', 'highlight', 'calc'],
  counts: { explain: 2, mcq: 2, formula: 1, point: 1, highlight: 1, calc: 1 },
  agenticOrg: false,
  facts: {
    aim: INDUCTION_MOTOR.aim,
    theory: INDUCTION_MOTOR.theory,
    nameplate: NAMEPLATE,
    components: pickFields(INDUCTION_MOTOR.components),
    procedure: INDUCTION_MOTOR.stages.map(({ title, text }) => ({ title, text })),
  },
  physics:
    'Physics: Ns = 120 f / P, slip s = (Ns - N) / Ns, T = g (S1 - S2)(R + t/2), P_out = 2 pi N T / 60, eta = 100 P_out / P_in, pf = P_in / (sqrt(3) V_L I_L).',
  parts: partsOf(INDUCTION_MOTOR.components, INDUCTION_ALIASES),
};

const ZENER: LabViva = {
  id: 'zener-regulator',
  name: 'the Zener voltage regulator lab',
  subject: 'an electronics',
  kinds: ['explain', 'mcq', 'formula', 'point', 'highlight', 'step', 'calc'],
  counts: { explain: 2, mcq: 1, formula: 1, point: 1, highlight: 1, step: 1, calc: 1 },
  agenticOrg: false,
  facts: {
    aim: ZENER_REGULATOR.aim,
    theory: ZENER_REGULATOR.theory,
    components: pickFields(ZENER_REGULATOR.components),
    procedure: ZENER_REGULATOR.steps.map((text, i) => ({ step: i + 1, text })),
  },
  physics: 'Physics: Vs = Vin - Vout, Iz = (Vs - Vz) / Rs - IL, Pz = Vz x Iz, with Vz = 5.1 V and Rs = 220 ohm.',
  parts: partsOf(ZENER_REGULATOR.components, ZENER_ALIASES),
};

// No parts, no steps and no graph in this lab. Its questions are explain, mcq, formula and calc.
const SORTING: LabViva = {
  id: 'sorting-visualiser',
  name: 'the sorting visualiser lab (quick sort)',
  subject: 'a computer science',
  kinds: ['explain', 'mcq', 'formula', 'calc'],
  counts: { explain: 2, mcq: 3, formula: 2, calc: 1 },
  agenticOrg: false,
  facts: {
    aim: SORTING_VISUALISER.aim,
    theory: SORTING_VISUALISER.theory,
    equations: SORTING_VISUALISER.equations,
  },
  physics:
    'Physics: one partition of a segment of n items makes n - 1 comparisons. The worst case makes n(n - 1) / 2 comparisons with the last element as pivot.',
  parts: { labels: {}, aliases: {} },
};

export const LABS: Record<ExperimentId, LabViva> = {
  'pelton-wheel': PELTON,
  'induction-motor': INDUCTION,
  'zener-regulator': ZENER,
  'sorting-visualiser': SORTING,
};

// The lab for a stored viva. Unknown ids fall back to the Pelton wheel, which was the only lab before this list.
export const labFor = (experimentId: string): LabViva =>
  (LABS as Record<string, LabViva | undefined>)[experimentId] ?? PELTON;
