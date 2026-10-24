// Voice assistant for the Zener regulator bench: the prompt, the topics and the tool set. The tools answer the same
// names as the Pelton ones. Where the bench has no such control, the handler says so in one short line.
import { ZENER_VIEW_LABEL, ZENER_VIEW_NAMES, type ZenerViewName } from '../components/zener/zener-views.ts';
import { MANUAL_NOTE, ZENER_AIM, ZENER_APPARATUS, ZENER_PARTS, ZENER_RELATIONS, ZENER_STEPS, ZENER_THEORY, ZENER_TITLE } from './zener/content.ts';
import type { OperatingPoint } from './zener/solver.ts';
import { bool, isOneOf, partIds, partOf, partText, str, unknownPart, whole, type VoiceLabBridge, type VoiceTools } from './voice-lab.ts';

export const ZENER_FIRST_MESSAGE =
  "Hello, I'm your lab assistant for the Zener diode regulator. Do you have any doubts about the apparatus or the procedure?";

// The lab state and setters the Zener tools use. The lab rebuilds it on every render.
export interface ZenerVoiceBridge extends VoiceLabBridge {
  vs: number;
  rl: number | null;
  switchOn: boolean;
  op: OperatingPoint | null; // the solver result for the current setting; null when the setting is not valid
  setSwitch: (on: boolean) => void;
  setView: (name: ZenerViewName) => void;
  setSelected: (id: string | null) => void;
  goToStep: (index: number) => void;
  showSimulation: () => void;
}

export const ZENER_TOPICS = ['principle', 'formulas', 'sample_table', 'procedure'] as const;
export type ZenerTopic = (typeof ZENER_TOPICS)[number];

// Camera preset that frames a part. Parts not listed keep the current view.
const FOCUS_VIEW: Partial<Record<string, ZenerViewName>> = {
  vs_meter: 'meters',
  vout_meter: 'meters',
  ammeter: 'meters',
  zener: 'regulator',
  resistor: 'regulator',
  supply: 'supply',
  rheostat: 'rheostat',
};
export const zenerFocusView = (id: string): ZenerViewName | undefined => FOCUS_VIEW[id];

export function zenerTopicText(topic: ZenerTopic): string {
  switch (topic) {
    case 'principle':
      return ZENER_THEORY.join(' ');
    case 'formulas':
      return ZENER_RELATIONS.map((r) => `${r.label}: ${r.value}.`).join(' ');
    case 'sample_table':
      return MANUAL_NOTE;
    case 'procedure':
      return `Aim: ${ZENER_AIM} Steps: ${ZENER_STEPS.map((s, i) => `${i + 1}. ${s.text}`).join(' ')}`;
  }
}

// What the meters show now. With the switch open every reading is zero.
export function zenerReadingsText(b: Pick<ZenerVoiceBridge, 'vs' | 'rl' | 'switchOn' | 'op'>): string {
  const setting = `Supply switch ${b.switchOn ? 'on' : 'off'}. Supply ${b.vs.toFixed(1)} V, ${b.rl === null ? 'no load' : `load ${b.rl} ohm`}.`;
  if (!b.switchOn) return `${setting} Every meter reads zero.`;
  if (!b.op) return `${setting} This setting is not valid.`;
  const { vOut, iZ, iL, regulating } = b.op;
  return [
    setting,
    `Vout ${vOut.toFixed(2)} V. Across Rs ${(b.vs - vOut).toFixed(2)} V.`,
    `Zener current ${(iZ * 1000).toFixed(1)} mA. Load current ${(iL * 1000).toFixed(1)} mA.`,
    regulating ? 'The Zener is regulating.' : 'The Zener is not regulating.',
  ].join(' ');
}

export function buildZenerPrompt(): string {
  const parts = ZENER_PARTS.map((c) => `- [${c.id}] ${c.label}: ${c.description}${c.specs.length ? ` (${c.specs.join('; ')})` : ''}`);
  const steps = ZENER_STEPS.map((s, i) => `${i + 1}. ${s.text} (parts: ${s.highlight.join(', ') || 'none'})`);
  return [
    `You are the lab assistant for the Simvaya virtual lab. The student is working on: ${ZENER_TITLE}.`,
    `Aim: ${ZENER_AIM}`,
    `Theory: ${ZENER_THEORY.join(' ')}`,
    `Apparatus: ${ZENER_APPARATUS.join('; ')}.`,
    '',
    'Parts of the bench (use these ids with the tools):',
    ...parts,
    '',
    'Procedure:',
    ...steps,
    '',
    'How to work:',
    '- After your greeting, ask whether the student has doubts about the apparatus or the procedure, then listen.',
    '- Keep answers short: two to four sentences unless they ask for more.',
    `- When you discuss a part, show it: call focus_part for one part, or highlight_parts for several. Call set_view for an angle: ${ZENER_VIEW_NAMES.join(', ')}.`,
    '- For facts about one part, call explain_part. For the principle, the formulas, the sample table or the procedure, call explain_topic. Do not make up numbers.',
    '- For current numbers, call read_readings.',
    '- set_pump opens or closes the supply switch. Use it only when the student asks.',
    '- The supply voltage and the load resistor are set by the student with the sliders on the control desk. You cannot move them: tell the student which slider to move.',
    '- explode_model, reassemble_model and set_nozzle do not apply to this bench. They answer with a short message: say it and go on.',
    '- Use they/them for the student unless they tell you otherwise.',
  ].join('\n');
}

export const ZENER_VOICE_PROMPT = buildZenerPrompt();

// Handlers take the agent's arguments as they arrive, so every one is checked here.
export function buildZenerVoiceTools(get: () => ZenerVoiceBridge): VoiceTools {
  return {
    explode_model() {
      return 'This bench has no model to pull apart. Use focus_part to point at a part.';
    },

    reassemble_model() {
      return 'Nothing is pulled apart on this bench.';
    },

    focus_part(p) {
      const b = get();
      const c = partOf(b.parts, str(p.partId));
      if (!c) return unknownPart(b.parts);
      b.showSimulation();
      b.setSelected(c.id);
      const view = zenerFocusView(c.id);
      if (view) b.setView(view);
      return `${c.label} is selected.`;
    },

    highlight_parts(p) {
      const b = get();
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
      if (!isOneOf(ZENER_VIEW_NAMES, view)) return `View must be one of: ${ZENER_VIEW_NAMES.join(', ')}.`;
      b.showSimulation();
      b.setView(view);
      return `Camera set to ${ZENER_VIEW_LABEL[view]}.`;
    },

    explain_part(p) {
      const b = get();
      const c = partOf(b.parts, str(p.partId));
      return c ? partText(c) : unknownPart(b.parts);
    },

    read_readings() {
      return zenerReadingsText(get());
    },

    set_pump(p) {
      const b = get();
      const on = bool(p.on);
      if (on === null) return 'Say whether the supply switch is on or off.';
      b.showSimulation();
      b.setSwitch(on);
      return `Supply switch is ${on ? 'on' : 'off'}.`;
    },

    set_nozzle() {
      return 'This bench has no nozzle. The student sets the supply and the load with the sliders.';
    },

    go_to_step(p) {
      const b = get();
      const n = whole(p.step, 1, ZENER_STEPS.length);
      if (n === null) return `Step must be a whole number from 1 to ${ZENER_STEPS.length}.`;
      b.showSimulation();
      b.goToStep(n - 1);
      return `Step ${n}: ${ZENER_STEPS[n - 1].text}`;
    },

    explain_topic(p) {
      const topic = str(p.topic);
      if (!isOneOf(ZENER_TOPICS, topic)) return `Topic must be one of: ${ZENER_TOPICS.join(', ')}.`;
      return zenerTopicText(topic);
    },
  };
}
