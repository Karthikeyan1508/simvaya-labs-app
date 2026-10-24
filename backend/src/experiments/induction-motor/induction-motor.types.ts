// Backend copy of the shared induction motor types. Must match frontend/lib/induction.ts field for field.

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
