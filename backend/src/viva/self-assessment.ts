import { agenticOrgConfig, runAgent } from '../agenticorg/agenticorg';
import { parseDraft } from './draft';
import { generateWithGroq, markExplainWithGroq } from './groq-generator';
import { LABS, type LabViva } from './labs';
import { labTemplateQuestions } from './lab-templates';
import { type Counts } from './question-bank';
import { VIVA_KINDS, type DraftQuestion, type Question } from './types';


// A self-assessment asks eight questions. Explain answers are marked by Groq; the other kinds are marked by the app.
// The Pelton wheel's counts. Each lab has its own in labs.ts.
export const SELF_ASSESSMENT_COUNTS: Counts = LABS['pelton-wheel'].counts;

export type QuestionSource = 'agenticorg' | 'groq' | 'template';
export interface GeneratedSelfAssessment {
  source: QuestionSource;
  note?: string;
  questions: DraftQuestion[];
}

// What the AgenticOrg agent is asked to write. It replies with {"questions": [...]}.
export function selfAssessmentTask(counts: Counts): string {
  const asked = Object.entries(counts)
    .map(([kind, n]) => `${n} ${kind}`)
    .join(', ');
  return [
    'Write viva questions for the Pelton wheel lab as JSON only: {"questions":[...]}.',
    `Each question has kind (one of ${VIVA_KINDS.join(', ')}), prompt, points (a whole number), explanation (a short model answer) and the fields its kind needs.`,
    `Ask for: ${asked}.`,
  ].join('\n');
}

// The agent's output may be an object with questions, or the same JSON as text.
function questionsFromOutput(output: unknown): unknown[] {
  if (typeof output === 'string') return questionsFromOutput(tryJson(output));
  if (output && typeof output === 'object') {
    const o = output as { questions?: unknown; text?: unknown };
    if (Array.isArray(o.questions)) return o.questions;
    if (typeof o.text === 'string') return questionsFromOutput(tryJson(o.text));
  }
  return [];
}

const tryJson = (s: string): unknown => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

const reason = (err: unknown) => (err instanceof Error ? err.message : 'unknown error');

// A usable result, or the reason this source was skipped.
type Attempt = { questions: DraftQuestion[]; note?: string } | { why: string };

async function viaAgenticOrg(counts: Counts, lab: LabViva): Promise<Attempt> {
  if (!lab.agenticOrg) return { why: 'AgenticOrg is only set up for the Pelton wheel' };
  const cfg = agenticOrgConfig();
  const agentId = process.env.AGENTICORG_VIVA_AGENT_ID;
  if (!cfg || !agentId) return { why: 'AgenticOrg is not set up (AGENTIC_ORG_KEY and AGENTICORG_VIVA_AGENT_ID)' };
  try {
    const run = await runAgent(cfg, agentId, { task: selfAssessmentTask(counts) });
    if (run.status !== 'completed' && run.status !== 'hitl_triggered') {
      return { why: `The AgenticOrg run ended with status ${run.status}` };
    }
    const parsed = questionsFromOutput(run.output).map((item) => parseDraft(item));
    const questions = parsed.filter((q): q is DraftQuestion => typeof q !== 'string');
    if (questions.length === 0) {
      const shape = run.output && typeof run.output === 'object' ? Object.keys(run.output).join('|') : typeof run.output;
      console.warn(`[Viva] AgenticOrg output had no valid questions (status ${run.status}, shape ${shape})`);
      return { why: 'AgenticOrg returned no valid questions' };
    }
    const dropped = parsed.length - questions.length;
    const notes = [
      // hitl_triggered: AgenticOrg held the run for approval. Its output is still usable.
      run.status === 'hitl_triggered' ? 'AgenticOrg held this run for approval. The questions were used as they are.' : '',
      dropped > 0 ? `${dropped} invalid question(s) were dropped.` : '',
    ].filter(Boolean);
    return { questions, note: notes.join(' ') || undefined };
  } catch (err) {
    console.warn(`[Viva] AgenticOrg self-assessment failed: ${reason(err)}`);
    return { why: `AgenticOrg could not produce questions (${reason(err)})` };
  }
}

async function viaGroq(counts: Counts, lab: LabViva): Promise<Attempt> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { why: 'GROQ_API_KEY is not set' };
  try {
    const { questions, dropped } = await generateWithGroq({ apiKey, model: process.env.GROQ_MODEL, counts, lab });
    if (questions.length === 0) return { why: 'Groq returned no valid questions' };
    const want = Object.values(counts).reduce((s, n) => s + (n ?? 0), 0);
    const notes = [
      dropped > 0 ? `${dropped} invalid question(s) were dropped.` : '',
      questions.length < want ? `Groq gave ${questions.length} of ${want} requested questions.` : '',
    ].filter(Boolean);
    return { questions, note: notes.join(' ') || undefined };
  } catch (err) {
    console.warn(`[Viva] Groq self-assessment failed: ${reason(err)}`);
    return { why: `Groq could not generate questions (${reason(err)})` };
  }
}

// AgenticOrg first, then Groq, then templates. Each skipped source says why in the note.
export async function generateSelfAssessment(
  counts: Counts = SELF_ASSESSMENT_COUNTS,
  lab: LabViva = LABS['pelton-wheel'],
): Promise<GeneratedSelfAssessment> {
  const skipped: string[] = [];
  for (const [source, attempt] of [
    ['agenticorg', viaAgenticOrg],
    ['groq', viaGroq],
  ] as const) {
    const out = await attempt(counts, lab);
    if ('why' in out) {
      skipped.push(`${out.why}.`);
      continue;
    }
    return { source, note: [...skipped, out.note].filter(Boolean).join(' ') || undefined, questions: out.questions };
  }
  const seed = Math.floor(Math.random() * 2 ** 31);
  return {
    source: 'template',
    note: [...skipped, 'Templates were used.'].join(' '),
    questions: labTemplateQuestions(lab, counts, seed),
  };
}

export interface ExplainResult {
  score: number;
  correct: boolean;
  feedback: string;
}

// Marks one explain answer against its model answer (the question's explanation). An empty answer scores 0 without a call.
// Null when Groq is not set up or fails, so the answer stays pending review.
export async function markExplain(q: Question, answer: string, lab: LabViva = LABS['pelton-wheel']): Promise<ExplainResult | null> {
  if (!answer.trim()) return { score: 0, correct: false, feedback: 'No answer was given.' };
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  try {
    const mark = await markExplainWithGroq({
      apiKey,
      model: process.env.GROQ_MODEL,
      prompt: q.prompt,
      modelAnswer: q.explanation,
      answer,
      subject: lab.subject,
    });
    return {
      score: Math.round(mark.fraction * q.points * 100) / 100,
      correct: mark.fraction >= 0.5,
      feedback: mark.feedback,
    };
  } catch (err) {
    console.warn(`[Viva] Groq could not mark question ${q.id}: ${reason(err)}`);
    return null;
  }
}
