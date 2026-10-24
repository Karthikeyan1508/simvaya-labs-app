export interface ComponentInfo {
  id: string;
  label: string;
  description: string;
  specs: string[];
}

export interface ProcedureStep {
  step: number;
  text: string;
  highlight: string[];
  setup?: { pumpOn?: boolean };
}

export interface ExperimentDef {
  id: string;
  title: string;
  aim: string;
  apparatus: string[];
  theory: string;
  components: ComponentInfo[];
  procedure: ProcedureStep[];
}

export interface RigState {
  pumpOn: boolean;
  nozzleStep: number;
  deadWeightKg: number;
  springKg: number;
  speedRpm: number;
  p1: number;
  p2: number;
  pp: number;
}

export interface Readings {
  p1: number;
  p2: number;
  pp: number;
  speedRpm: number;
  springKg: number;
}

export interface CalcStep {
  key: string;
  label: string;
  formula: string;
  substituted: string;
  value: number;
  unit: string;
}

export interface CalcResult {
  dpKgCm2: number;
  headVenturiM: number;
  qActM3s: number;
  headPenstockM: number;
  headInletM: number;
  netLoadKg: number;
  torqueNm: number;
  bhpKw: number;
  ipKw: number;
  etaPct: number;
  steps: CalcStep[];
}

export interface ObservationRow extends CalcResult {
  deadWeightKg: number;
  springKg: number;
  p1: number;
  p2: number;
  pp: number;
  speedRpm: number;
}
