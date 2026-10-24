// Shared types for the three-phase induction motor load test. The backend returns the same shapes.

// Every physical part the student can select, on the 3D bench, the circuit or the panel.
export const COMPONENT_IDS = [
  'housing',
  'stator',
  'rotor',
  'shaft',
  'bearing_de',
  'bearing_nde',
  'fan',
  'terminal_box',
  'feet',
  'brake_drum',
  'spring_balances',
  'supply_panel',
  'starter',
  'estop',
  'voltmeter',
  'ammeter',
  'wattmeter_w1',
  'wattmeter_w2',
  'speed_sensor',
] as const;

export type ComponentId = (typeof COMPONENT_IDS)[number];

export const isComponentId = (v: string): v is ComponentId => (COMPONENT_IDS as readonly string[]).includes(v);

// Nameplate values. The shipped configuration is illustrative until faculty supply the real ratings.
export interface Nameplate {
  ratedPowerKw: number;
  lineVoltageV: number;
  ratedCurrentA: number;
  frequencyHz: number;
  poles: number;
  ratedSpeedRpm: number;
  ratedPowerFactor: number;
  ratedEfficiencyPct: number;
  connection: 'delta' | 'star';
  illustrative: boolean;
}

export interface ComponentInfo {
  id: ComponentId;
  label: string;
  description: string;
  specs: string[];
}

export interface ProcedureStage {
  id: 'intro' | 'apparatus' | 'circuit' | 'safety' | 'no_load' | 'loading' | 'unload' | 'analyse' | 'viva' | 'report';
  title: string;
  text: string;
}

export interface ExperimentInfo {
  id: 'induction-motor';
  title: string;
  aim: string;
  apparatus: string[];
  theory: string[];
  nameplate: Nameplate;
  brake: { radiusM: number; beltThicknessM: number; tareKg: number };
  components: ComponentInfo[];
  stages: ProcedureStage[];
  safetyChecks: string[];
  references: { title: string; source: string; note: string }[];
}

// Codes used in the warnings list. The UI turns each code into a sentence.
export type SimWarning = 'over_rated_current' | 'overload_torque';

// Simulated readings for a running motor at a given load. All zeros when the motor is stopped.
export interface SimReadings {
  running: boolean;
  VL: number; // line-to-line voltage, V
  IL: number; // line current, A
  W1: number; // wattmeter W1, W (signed)
  W2: number; // wattmeter W2, W (signed)
  pinW: number; // W1 + W2, W
  pf: number; // power factor, 0 to 1
  speedRpm: number;
  syncRpm: number;
  slipPct: number;
  torqueNm: number; // torque at the shaft, N·m
  poutW: number; // shaft output, W
  etaPct: number; // efficiency, %
  s1Kg: number; // spring balance S1, kg-equivalent
  s2Kg: number; // spring balance S2, kg-equivalent
  warnings: SimWarning[];
}

// What the student records for one observation: the raw readings, before any calculation.
export interface RawReadings {
  VL: number;
  IL: number;
  W1: number;
  W2: number;
  s1Kg: number;
  s2Kg: number;
  speedRpm: number;
}

// Values calculated from the raw readings by the backend, never typed by the student.
export interface DerivedReadings {
  syncRpm: number;
  slipPct: number | null;
  torqueNm: number | null;
  poutW: number | null;
  pinW: number | null;
  pf: number | null;
  etaPct: number | null;
  valid: boolean;
  issues: string[];
}

export interface ObservationRow {
  id: number;
  observation: number;
  raw: RawReadings;
  derived: DerivedReadings;
  note: string;
  source: 'simulated' | 'manual';
}

// ---- Lab helpers. The types above are unchanged. ----

export const LOAD_MAX_KG = 40; // the backend accepts 0 to 40 kg

const G = 9.81; // m/s², as in the torque and power formulas

// Shaft torque from the balance readings: T = 9.81 (S1 - S2)(R + t/2), in N·m.
export const brakeTorqueNm = (s1Kg: number, s2Kg: number, brake: ExperimentInfo['brake']) =>
  G * (s1Kg - s2Kg) * (brake.radiusM + brake.beltThicknessM / 2);

// Rated shaft torque: T = 60 P / (2 pi N), in N·m.
export const ratedTorqueNm = (n: Nameplate) => (60 * n.ratedPowerKw * 1000) / (2 * Math.PI * n.ratedSpeedRpm);

// Load on the brake as a fraction of rated torque, capped at 1.5 (the range the bench draws).
export const loadFraction = (loadKg: number, brake: ExperimentInfo['brake'], n: Nameplate) =>
  Math.min(1.5, brakeTorqueNm(loadKg, 0, brake) / ratedTorqueNm(n));

// Plain words for a warning code from the simulation.
export const warningText = (code: SimWarning, n: Nameplate) =>
  code === 'over_rated_current'
    ? `Current is above the rated ${n.ratedCurrentA} A`
    : 'Load torque is above 1.25 times rated';

// Range for each typed reading. The backend checks the physics; these only catch typing mistakes.
export const RAW_LIMITS: Record<keyof RawReadings, { min: number; max: number }> = {
  VL: { min: 0, max: 1000 },
  IL: { min: 0, max: 50 },
  W1: { min: -5000, max: 5000 },
  W2: { min: -5000, max: 5000 },
  s1Kg: { min: 0, max: 100 },
  s2Kg: { min: 0, max: 100 },
  speedRpm: { min: 0, max: 3000 },
};

// Message for a typed value, or null when it is a number inside its range.
export function rawError(field: keyof RawReadings, text: string): string | null {
  if (text.trim() === '') return 'Enter a number';
  const v = Number(text);
  if (!Number.isFinite(v)) return 'Enter a number';
  const { min, max } = RAW_LIMITS[field];
  return v < min || v > max ? `Use a value from ${min} to ${max}` : null;
}

// Identifies one set of raw readings, so a calculated value can be matched to the reading it came from.
export const rawKey = (r: RawReadings) => [r.VL, r.IL, r.W1, r.W2, r.s1Kg, r.s2Kg, r.speedRpm].join('|');

const csvNumber = (v: number | null | undefined, digits: number) =>
  v === null || v === undefined || !Number.isFinite(v) ? '' : v.toFixed(digits);

// Note text can hold anything the student types. A leading = or + is quoted so a spreadsheet does not run it.
const csvText = (s: string) => {
  const t = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

const CSV_HEADER = [
  'Observation',
  'VL (V)',
  'IL (A)',
  'W1 (W)',
  'W2 (W)',
  'Pin (W)',
  'S1 (kg)',
  'S2 (kg)',
  'T (Nm)',
  'N (rpm)',
  'Ns (rpm)',
  'Slip (%)',
  'Pout (W)',
  'pf',
  'Efficiency (%)',
  'Source',
  'Check',
  'Note',
];

// One line per observation, with the units in the header. Calculated columns come from derivedOf and stay blank if not ready.
export function rowsToCsv(rows: ObservationRow[], derivedOf: (r: ObservationRow) => DerivedReadings | null) {
  const lines = [CSV_HEADER.join(',')];
  for (const r of rows) {
    const d = derivedOf(r);
    const check = d ? (d.valid ? 'ok' : d.issues.join('; ')) : '';
    lines.push(
      [
        String(r.observation),
        csvNumber(r.raw.VL, 1),
        csvNumber(r.raw.IL, 3),
        csvNumber(r.raw.W1, 1),
        csvNumber(r.raw.W2, 1),
        csvNumber(d?.pinW, 1),
        csvNumber(r.raw.s1Kg, 2),
        csvNumber(r.raw.s2Kg, 2),
        csvNumber(d?.torqueNm, 3),
        csvNumber(r.raw.speedRpm, 1),
        csvNumber(d?.syncRpm, 0),
        csvNumber(d?.slipPct, 3),
        csvNumber(d?.poutW, 1),
        csvNumber(d?.pf, 3),
        csvNumber(d?.etaPct, 2),
        r.source,
        csvText(check),
        csvText(r.note),
      ].join(','),
    );
  }
  return lines.join('\r\n') + '\r\n';
}
