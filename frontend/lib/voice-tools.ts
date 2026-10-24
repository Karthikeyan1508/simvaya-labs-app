import type { ViewName } from '@/components/pelton/views';
import { VIEW_LABEL } from '@/lib/lab-logic';
import type { ExperimentDef, Readings } from '@/lib/types';
import {
  bool,
  isOneOf,
  LOADING,
  num,
  partIds,
  partOf,
  partText,
  str,
  unknownPart,
  whole,
  type VoiceLabBridge,
  type VoiceTools,
} from '@/lib/voice-lab';

export type { VoiceLabBridge, VoicePart, VoiceTools, VoiceToolFactory, VoiceToolHandler, VoiceToolName } from '@/lib/voice-lab';

// The lab state and setters the voice tools use. The lab page rebuilds this on every render,
// and the tools read it through a getter, so a tool call always sees the current state.
export interface LabBridge extends VoiceLabBridge {
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
  setPumpOn: (on: boolean) => void;
  setNozzleStep: (step: number) => void;
  goToStep: (index: number) => void;
  showScene: () => void;
}

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

const expPart = (b: LabBridge, id: string) => partOf(b.exp?.components ?? null, id);

// Efficiency and load formulas are not in the experiment payload, so they follow pelton-wheel.physics.ts.
export function topicText(exp: ExperimentDef, topic: VoiceTopic): string {
  switch (topic) {
    case 'principle':
      return exp.theory;
    case 'venturi': {
      const v = partOf(exp.components, 'venturi');
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
      const c = expPart(b, str(p.partId));
      if (!c) return unknownPart(b.exp.components);
      b.showScene();
      b.setSelected(c.id);
      const view = FOCUS_VIEW[c.id];
      if (view) b.setView(view);
      return `${c.label} is selected.`;
    },

    highlight_parts(p) {
      const b = get();
      if (!b.exp) return LOADING;
      const ids = partIds(b.exp.components, p.partIds);
      if (ids.length === 0) return unknownPart(b.exp.components);
      b.showScene();
      b.setVoiceHighlight(ids);
      return `Highlighted ${ids.map((id) => expPart(b, id)?.label ?? id).join(', ')}.`;
    },

    clear_highlight() {
      get().setVoiceHighlight(null);
      return 'Highlight cleared.';
    },

    set_view(p) {
      const b = get();
      const view = str(p.view);
      if (!isOneOf(VOICE_VIEWS, view)) return `View must be one of: ${VOICE_VIEWS.join(', ')}.`;
      b.showScene();
      b.setView(view);
      return `Camera set to ${VIEW_LABEL[view]}.`;
    },

    explain_part(p) {
      const b = get();
      if (!b.exp) return LOADING;
      const c = expPart(b, str(p.partId));
      return c ? partText(c) : unknownPart(b.exp.components);
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
      if (!isOneOf(VOICE_TOPICS, topic)) return `Topic must be one of: ${VOICE_TOPICS.join(', ')}.`;
      return topicText(b.exp, topic);
    },
  };
}
