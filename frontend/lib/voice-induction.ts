// Voice assistant for the induction motor load test: the prompt, the topics and the tool set. The tools answer the same
// names as the Pelton ones. Where the rig has no such control, the handler says so in one short line.
import { isComponentId, warningText, type ComponentId, type ExperimentInfo, type SimReadings } from './induction.ts';
import { bool, isOneOf, LOADING, partIds, partOf, partText, str, unknownPart, whole, type VoiceLabBridge, type VoiceTools } from './voice-lab.ts';

export const INDUCTION_FIRST_MESSAGE =
  "Hello, I'm your lab assistant for the three-phase induction motor. Do you have any doubts about the apparatus or the procedure?";

export const INDUCTION_VIEWS = ['scene', 'circuit'] as const;
export type InductionView = (typeof INDUCTION_VIEWS)[number];
export const INDUCTION_VIEW_LABEL: Record<InductionView, string> = {
  scene: 'the 3D bench',
  circuit: 'the circuit diagram',
};

export const INDUCTION_TOPICS = ['principle', 'torque', 'input_power', 'efficiency', 'procedure'] as const;
export type InductionTopic = (typeof INDUCTION_TOPICS)[number];

// Parts drawn on the circuit diagram. Every other part is shown on the 3D bench.
const CIRCUIT_PARTS: readonly ComponentId[] = [
  'supply_panel',
  'starter',
  'estop',
  'voltmeter',
  'ammeter',
  'wattmeter_w1',
  'wattmeter_w2',
];

// The rig state the tools read and the controls they drive. The lab's rig hook has all of these.
export interface InductionRigState {
  sim: SimReadings;
  supplyOn: boolean;
  running: boolean;
  emergency: boolean;
  paused: boolean;
  loadKg: number;
  canStart: boolean;
  start: () => void;
  stop: () => void;
}

// The lab state and setters the induction tools use. The lab rebuilds it on every render.
export interface InductionVoiceBridge extends VoiceLabBridge {
  exp: ExperimentInfo | null;
  armed: boolean; // every safety check is acknowledged
  rig: InductionRigState;
  view: InductionView;
  setView: (v: InductionView) => void;
  setCutaway: (on: boolean) => void;
  setPart: (id: ComponentId | null) => void;
  showSimulation: () => void;
  goToStage: (index: number) => void;
}

// Theory paragraphs are read by position, in the order the backend content lists them.
export function inductionTopicText(exp: ExperimentInfo, topic: InductionTopic): string {
  const t = exp.theory;
  switch (topic) {
    case 'principle':
      return t.slice(0, 2).join(' ');
    case 'torque':
      return t[2] ?? '';
    case 'input_power':
      return t[3] ?? '';
    case 'efficiency':
      return t[4] ?? '';
    case 'procedure':
      return `Aim: ${exp.aim} Steps: ${exp.stages.map((s) => `${s.title}: ${s.text}`).join(' ')}`;
  }
}

export function inductionReadingsText(rig: InductionRigState, exp: ExperimentInfo | null): string {
  const s = rig.sim;
  const state = rig.emergency
    ? 'The emergency stop is active.'
    : rig.paused
      ? 'The rig is paused.'
      : rig.running
        ? 'The motor is running.'
        : 'The motor is stopped.';
  const warnings = exp ? s.warnings.map((w) => `${warningText(w, exp.nameplate)}.`) : [];
  return [
    `Supply ${rig.supplyOn ? 'on' : 'off'}. ${state} Load ${rig.loadKg} kg on the brake.`,
    `Line voltage ${s.VL.toFixed(0)} V, line current ${s.IL.toFixed(2)} A.`,
    `Wattmeters W1 ${s.W1.toFixed(0)} W and W2 ${s.W2.toFixed(0)} W, input power ${s.pinW.toFixed(0)} W, power factor ${s.pf.toFixed(3)}.`,
    `Speed ${s.speedRpm.toFixed(0)} rpm, slip ${s.slipPct.toFixed(2)} %, torque ${s.torqueNm.toFixed(2)} N m.`,
    `Output power ${s.poutW.toFixed(0)} W, efficiency ${s.etaPct.toFixed(1)} %.`,
    'These readings are simulated, not measured.',
    ...warnings,
  ].join(' ');
}

export function buildInductionPrompt(exp: ExperimentInfo): string {
  const n = exp.nameplate;
  const parts = exp.components.map((c) => `- [${c.id}] ${c.label}: ${c.description}${c.specs.length ? ` (${c.specs.join('; ')})` : ''}`);
  const stages = exp.stages.map((s, i) => `${i + 1}. ${s.title}: ${s.text}`);
  return [
    `You are the lab assistant for the Simvaya virtual lab. The student is working on: ${exp.title}.`,
    `Aim: ${exp.aim}`,
    `Theory: ${exp.theory.join(' ')}`,
    `Apparatus: ${exp.apparatus.join('; ')}.`,
    `Nameplate (illustrative, not the real rating plate): ${n.ratedPowerKw} kW, ${n.lineVoltageV} V, ${n.ratedCurrentA} A, ${n.ratedSpeedRpm} rpm, ${n.poles} poles, ${n.frequencyHz} Hz.`,
    '',
    'Parts of the bench (use these ids with the tools):',
    ...parts,
    '',
    'Procedure stages (go_to_step opens one):',
    ...stages,
    '',
    'How to work:',
    '- After your greeting, ask whether the student has doubts about the apparatus or the procedure, then listen.',
    '- Keep answers short: two to four sentences unless they ask for more.',
    '- When you discuss a part, show it: call focus_part for one part, or highlight_parts for several. Call set_view with scene for the 3D bench or circuit for the circuit diagram.',
    '- For facts about one part, call explain_part. For the principle, torque, input_power, efficiency or procedure, call explain_topic. Do not make up numbers.',
    '- For the current readings, call read_readings, and say they are simulated.',
    '- set_pump starts or stops the motor. Use it only when the student asks. A start is refused until the safety checks are acknowledged, the supply is on and the emergency stop is reset: say the reason it gives.',
    '- explode_model makes the frame see-through to show the stator and rotor. reassemble_model closes the frame again.',
    '- set_nozzle does not apply to this rig. The student sets the load with the Increase load and Decrease load buttons, and the supply with the Supply button.',
    '- Use they/them for the student unless they tell you otherwise.',
  ].join('\n');
}

// Handlers take the agent's arguments as they arrive, so every one is checked here.
export function buildInductionVoiceTools(get: () => InductionVoiceBridge): VoiceTools {
  return {
    explode_model() {
      const b = get();
      b.showSimulation();
      b.setView('scene');
      b.setCutaway(true);
      return 'Frame made see-through to show the stator and rotor.';
    },

    reassemble_model() {
      get().setCutaway(false);
      return 'Frame closed again.';
    },

    focus_part(p) {
      const b = get();
      if (!b.exp) return LOADING;
      const c = partOf(b.parts, str(p.partId));
      if (!c || !isComponentId(c.id)) return unknownPart(b.parts);
      b.showSimulation();
      b.setPart(c.id);
      b.setView((CIRCUIT_PARTS as readonly string[]).includes(c.id) ? 'circuit' : 'scene');
      return `${c.label} is selected.`;
    },

    highlight_parts(p) {
      const b = get();
      if (!b.exp) return LOADING;
      const ids = partIds(b.parts, p.partIds);
      if (ids.length === 0) return unknownPart(b.parts);
      b.showSimulation();
      b.setVoiceHighlight(ids);
      return `Highlighted ${ids.map((id) => partOf(b.parts, id)?.label ?? id).join(', ')}.`;
    },

    clear_highlight() {
      get().setVoiceHighlight(null);
      return 'Highlight cleared.';
    },

    set_view(p) {
      const b = get();
      const view = str(p.view);
      if (!isOneOf(INDUCTION_VIEWS, view)) return `View must be one of: ${INDUCTION_VIEWS.join(', ')}.`;
      b.showSimulation();
      b.setView(view);
      return `Showing ${INDUCTION_VIEW_LABEL[view]}.`;
    },

    explain_part(p) {
      const b = get();
      if (!b.exp) return LOADING;
      const c = partOf(b.parts, str(p.partId));
      return c ? partText(c) : unknownPart(b.parts);
    },

    read_readings() {
      const b = get();
      return inductionReadingsText(b.rig, b.exp);
    },

    set_pump(p) {
      const b = get();
      const on = bool(p.on);
      if (on === null) return 'Say whether the motor is to run or stop.';
      const { rig } = b;
      b.showSimulation();
      if (!on) {
        rig.stop();
        return 'Motor stopped.';
      }
      if (rig.emergency) return 'The emergency stop is active. Reset the rig first.';
      if (rig.running) return 'The motor is already running.';
      if (rig.paused) return 'The motor is paused. Resume it with the pause button.';
      if (!b.armed) return 'Acknowledge the safety checks in the procedure before the motor runs.';
      if (!rig.supplyOn) return 'Switch the supply on first.';
      if (!rig.canStart) return 'The motor cannot start now.';
      rig.start();
      return 'Motor started.';
    },

    set_nozzle() {
      return 'This rig has no nozzle. The student sets the load on the brake drum.';
    },

    go_to_step(p) {
      const b = get();
      if (!b.exp) return LOADING;
      const stages = b.exp.stages;
      const n = whole(p.step, 1, stages.length);
      if (n === null) return `Step must be a whole number from 1 to ${stages.length}.`;
      b.goToStage(n - 1);
      return `Step ${n}: ${stages[n - 1].title}. ${stages[n - 1].text}`;
    },

    explain_topic(p) {
      const b = get();
      if (!b.exp) return LOADING;
      const topic = str(p.topic);
      if (!isOneOf(INDUCTION_TOPICS, topic)) return `Topic must be one of: ${INDUCTION_TOPICS.join(', ')}.`;
      return inductionTopicText(b.exp, topic);
    },
  };
}
