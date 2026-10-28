import type { ComponentInfo } from '@/lib/types';
import type { SpokenAnswer, StudentQuestion } from '@/lib/viva';
import { KIND_LABEL } from '@/lib/viva';

// Prompt and tool helpers for the oral viva. No answer keys go to the agent: the student view has none.

// The agent also owns the lab tools. The interview has no lab to drive, but a call to a tool the page did not register
// ends the whole session, so every lab tool gets a stand-in that answers with a short message.
const LAB_TOOLS = [
  'explode_model',
  'reassemble_model',
  'focus_part',
  'highlight_parts',
  'clear_highlight',
  'set_view',
  'explain_part',
  'read_readings',
  'set_pump',
  'set_nozzle',
  'go_to_step',
  'explain_topic',
  'set_control',
];
export const labToolStandIns = (): Record<string, () => string> =>
  Object.fromEntries(LAB_TOOLS.map((name) => [name, () => 'There is no lab on screen during the viva. Carry on with the questions.']));

export const firstMessageFor = (title: string, count: number) =>
  `Hello, I'm your examiner for ${title}. There are ${count} questions. Are you ready to begin?`;

// The answer field the agent must fill for each question kind. Matches save_viva_answer in ElevenLabs.
const FIELD: Record<StudentQuestion['kind'], string> = {
  explain: 'text',
  highlight: 'text',
  mcq: 'option (0-based index)',
  formula: 'option (0-based index)',
  point: 'part_id',
  step: 'step (1-9)',
  calc: 'value',
  graph: 'value',
};

export function interviewPrompt(title: string, questions: StudentQuestion[], parts: ComponentInfo[]): string {
  const partList = parts.map((p) => `${p.id} = ${p.label}`).join('; ');
  const lines = questions.map((q, i) => {
    const bits = [`${i + 1}. [${KIND_LABEL[q.kind]}] ${q.prompt}`];
    if (q.options?.length) bits.push(`Options: ${q.options.map((o, k) => `${k} = ${o}`).join('; ')}.`);
    if (q.unit) bits.push(`Answer in ${q.unit}.`);
    if (q.highlightPartId) bits.push(`The highlighted part is ${q.highlightPartId}.`);
    if (q.graph) {
      const pts = q.graph.x.map((x, k) => `(${x}, ${q.graph!.y[k]})`).join(', ');
      bits.push(`Graph: ${q.graph.yLabel} against ${q.graph.xLabel}, points ${pts}.`);
    }
    if (q.kind === 'point') bits.push(`Ask the student to name the part. Part ids: ${partList}.`);
    bits.push(`Save with ${FIELD[q.kind]}.`);
    return bits.join(' ');
  });
  return [
    `You are the examiner for the viva "${title}" in a virtual engineering lab. You interview one student. Your messages are read aloud to the student, who answers in writing (dictated or typed).`,
    'How to run the interview:',
    '- Ask the questions in order, one at a time, by number. Read each question naturally.',
    '- Read the full answer, then call save_viva_answer with question_number and the answer in the field the question names. Then give one short acknowledgement and ask the next question.',
    '- For multiple-choice and formula questions the options are shown on the student\'s screen. They choose one, and their message names it ("I choose option 1: ..."). Say which option you heard, ask one short follow-up such as why they chose it, listen to the reply, then save the option index. Never say whether the choice is right.',
    '- If an answer is vague or missing, ask one short follow-up on the same question. If it is still unclear, save what you have and move on.',
    '- Never say whether an answer is right or wrong and never give the correct answer. The answers are reviewed after the interview.',
    '- After the last answer, or when the student asks to stop, call finish_viva and thank the student.',
    '- Keep each turn to two or three sentences unless the student asks for more.',
    '- Do not use the lab model tools in this interview.',
    '',
    'Questions:',
    ...lines,
  ].join('\n');
}

// The tool arguments arrive as the model wrote them. Turn them into the typed payload the backend checks.
export function spokenPayload(args: Record<string, unknown>): SpokenAnswer {
  const num = (v: unknown) =>
    typeof v === 'number' && Number.isFinite(v)
      ? v
      : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))
        ? Number(v)
        : undefined;
  const out: SpokenAnswer = { questionNumber: num(args.question_number) ?? 0 };
  if (typeof args.text === 'string') out.text = args.text.slice(0, 5000);
  const option = num(args.option);
  if (option !== undefined) out.option = Math.trunc(option);
  const value = num(args.value);
  if (value !== undefined) out.value = value;
  const step = num(args.step);
  if (step !== undefined) out.step = Math.trunc(step);
  if (typeof args.part_id === 'string') out.partId = args.part_id.slice(0, 64);
  return out;
}
