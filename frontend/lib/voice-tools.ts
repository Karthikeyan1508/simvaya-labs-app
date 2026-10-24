import type { ViewName } from '@/components/pelton/views';
import { VIEW_LABEL } from '@/lib/lab-logic';
import type { ComponentInfo, ExperimentDef, Readings } from '@/lib/types';

// The lab state and setters the voice tools use. The lab page rebuilds this on every render,
// and the tools read it through a getter, so a tool call always sees the current state.
export interface LabBridge {
  exp: ExperimentDef | null;
  pumpOn: boolean;
  nozzleStep: number;
  deadWeightKg: number;
  springKg: number;
  netLoadKg: number;
  readings: Readings;
  setExplode: (amount: number) => void;
  setView: (name: ViewName) => void;
  setSelected: (id: string | null) => void;
  setVoiceHighlight: (ids: string[] | null) => void;
  setPumpOn: (on: boolean) => void;
  setNozzleStep: (step: number) => void;
  goToStep: (index: number) => void;
  showScene: () => void;
}

export type VoiceToolName =
  | 'explode_model'
  | 'reassemble_model'
  | 'focus_part'
  | 'highlight_parts'
  | 'clear_highlight'
  | 'set_view'
  | 'explain_part'
  | 'read_readings'
  | 'set_pump'
  | 'set_nozzle'
  | 'go_to_step'
  | 'explain_topic';

export type VoiceToolHandler = (params: Record<string, unknown>) => string;
export type VoiceTools = Record<VoiceToolName, VoiceToolHandler>;

export const VOICE_VIEWS = ['iso', 'front', 'side', 'top'] as const satisfies readonly ViewName[];
export const VOICE_TOPICS = ['principle', 'venturi', 'efficiency', 'load', 'procedure'] as const;
export type VoiceTopic = (typeof VOICE_TOPICS)[number];

// Camera preset that frames each part. Parts not listed keep the current view.
const FOCUS_VIEW: Partial<Record<string, ViewName>> = {
  nozzle: 'nozzle',
  spear: 'nozzle',
  venturi: 'venturi',
  gauge_p1: 'gauges',
  gauge_p2: 'gauges',
  gauge_p3: 'gauges',
  brake_drum: 'brake',
  rope: 'brake',
  deadweights: 'brake',
  spring: 'brake',
};

const LOADING = 'The lab content is still loading. Ask again in a moment.';

function num(v: unknown): number | null {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

// A whole number in range. The model sometimes sends 3.0 or "3".
function whole(v: unknown, min: number, max: number): number | null {
  const n = num(v);
  if (n === null) return null;
  const r = Math.round(n);
  return r >= min && r <= max ? r : null;
}

function bool(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === 'on') return true;
  if (v === 'false' || v === 'off') return false;
  return null;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

const isVoiceView = (v: string): v is (typeof VOICE_VIEWS)[number] => (VOICE_VIEWS as readonly string[]).includes(v);
const isVoiceTopic = (v: string): v is VoiceTopic => (VOICE_TOPICS as readonly string[]).includes(v);

const partOf = (exp: ExperimentDef | null, id: string): ComponentInfo | undefined =>
  exp?.components.find((c) => c.id === id);

function partText(c: ComponentInfo): string {
  return `${c.label}. ${c.description}${c.specs.length ? ` Specs: ${c.specs.join('; ')}.` : ''}`;
}

// Efficiency and load formulas are not in the experiment payload, so they follow pelton-wheel.physics.ts.
export function topicText(exp: ExperimentDef, topic: VoiceTopic): string {
  switch (topic) {
    case 'principle':
      return exp.theory;
    case 'venturi': {
      const v = partOf(exp, 'venturi');
      return v ? `${v.description} ${v.specs.join('; ')}.` : exp.theory;
    }
    case 'efficiency':
      return 'Efficiency is eta = BHP / IHP x 100. BHP = tau x omega / 1000 in kW, with brake torque tau = T x g x D/2 in N m and omega = 2 pi N / 60. IHP = rho x g x Qact x Hi / 1000 in kW, with Qact from the venturi and Hi = Pp x 10 m.';
    case 'load':
      return 'The net load is T = T1 + T0 - T2 in kg: T1 are the dead weights, T0 is the 1 kg hanger, and T2 is the spring balance reading. The brake torque is tau = T x g x D/2, where D is the 415 mm effective diameter of the drum with rope.';
    case 'procedure':
      return `Aim: ${exp.aim} Steps: ${exp.procedure.map((s) => `${s.step}. ${s.text}`).join(' ')}`;
  }
}

export function readingsText(b: LabBridge): string {
  const r = b.readings;
  return [
    `Pump ${b.pumpOn ? 'on' : 'off'}. Nozzle ${b.nozzleStep} of 8.`,
    `Shaft speed ${Math.round(r.speedRpm)} rpm.`,
    `Pressures: venturi throat P1 ${r.p1.toFixed(2)}, venturi inlet P2 ${r.p2.toFixed(2)}, penstock Pp ${r.pp.toFixed(2)} kg/cm2.`,
    `Load: dead weights ${b.deadWeightKg} kg, spring balance ${b.springKg} kg, net load ${b.netLoadKg.toFixed(2)} kg.`,
  ].join(' ');
}

// Handlers take the agent's arguments as they arrive, so every one is checked here.
// Each returns the short text the agent reads back.
export function buildVoiceTools(get: () => LabBridge): VoiceTools {
  const unknownPart = (b: LabBridge) => `Unknown part. Use one of: ${b.exp?.components.map((c) => c.id).join(', ')}.`;

  return {
    explode_model(p) {
      const b = get();
      const amount = Math.min(1, Math.max(0, num(p.amount) ?? 0.5));
      b.showScene();
      b.setExplode(amount);
      return `Model pulled apart to ${Math.round(amount * 100)} percent.`;
    },

    reassemble_model() {
      const b = get();
      b.showScene();
      b.setExplode(0);
      return 'Model put back together.';
    },

    focus_part(p) {
      const b = get();
      if (!b.exp) return LOADING;
      const c = partOf(b.exp, str(p.partId));
      if (!c) return unknownPart(b);
      b.showScene();
      b.setSelected(c.id);
      const view = FOCUS_VIEW[c.id];
      if (view) b.setView(view);
      return `${c.label} is selected.`;
    },

    highlight_parts(p) {
      const b = get();
      if (!b.exp) return LOADING;
      const ids = [...new Set((Array.isArray(p.partIds) ? p.partIds : []).map(str))].filter((id) => partOf(b.exp, id));
      if (ids.length === 0) return unknownPart(b);
      b.showScene();
      b.setVoiceHighlight(ids);
      return `Highlighted ${ids.map((id) => partOf(b.exp, id)?.label ?? id).join(', ')}.`;
    },

    clear_highlight() {
      get().setVoiceHighlight(null);
      return 'Highlight cleared.';
    },

    set_view(p) {
      const b = get();
      const view = str(p.view);
      if (!isVoiceView(view)) return `View must be one of: ${VOICE_VIEWS.join(', ')}.`;
      b.showScene();
      b.setView(view);
      return `Camera set to ${VIEW_LABEL[view]}.`;
    },

    explain_part(p) {
      const b = get();
      if (!b.exp) return LOADING;
      const c = partOf(b.exp, str(p.partId));
      return c ? partText(c) : unknownPart(b);
    },

    read_readings() {
      return readingsText(get());
    },

    set_pump(p) {
      const b = get();
      const on = bool(p.on);
      if (on === null) return 'Say whether the pump is on or off.';
      b.showScene();
      b.setPumpOn(on);
      return `Pump is ${on ? 'on' : 'off'}.`;
    },

    set_nozzle(p) {
      const b = get();
      const step = whole(p.step, 1, 8);
      if (step === null) return 'Nozzle step must be a whole number from 1 to 8.';
      b.showScene();
      b.setNozzleStep(step);
      return `Nozzle set to ${step} of 8.`;
    },

    go_to_step(p) {
      const b = get();
      if (!b.exp) return LOADING;
      const total = b.exp.procedure.length;
      const n = whole(p.step, 1, total);
      if (n === null) return `Step must be a whole number from 1 to ${total}.`;
      b.showScene();
      b.goToStep(n - 1);
      return `Step ${n}: ${b.exp.procedure[n - 1].text}`;
    },

    explain_topic(p) {
      const b = get();
      if (!b.exp) return LOADING;
      const topic = str(p.topic);
      if (!isVoiceTopic(topic)) return `Topic must be one of: ${VOICE_TOPICS.join(', ')}.`;
      return topicText(b.exp, topic);
    },
  };
}
