import { PELTON_WHEEL } from '../experiments/pelton-wheel/pelton-wheel.content';
import { parseDraft } from './draft';
import type { Counts } from './question-bank';
import { type DraftQuestion, type VivaKind } from './types';

// Groq's OpenAI-compatible chat API. Teacher AI drafts come from here; the teacher still reviews every question.
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-oss-120b';

const RULES = `Each item is an object with: kind, prompt, points (use 1), explanation (a short model answer), and:
- explain: nothing extra. The student writes a free-text answer.
- mcq: options (2 to 6 strings) and answer (0-based index of the correct option).
- formula: options (formulas as text) and answer (0-based index).
- point: partId (a part id from the facts). The prompt asks the student to click that part.
- highlight: partId (a part id from the facts). The prompt asks the student to name the part shown highlighted.
- step: step (1 to 9), the procedure step the prompt quotes.
- calc: the prompt gives the readings (T1, T2, P1, P2, Pp, speed) and asks for one value. expected (number), unit, tolerance 0.05.
- graph: the prompt describes a graph. graph: { x: number[], y: number[], xLabel, yLabel, peakX }, expected (number the student should read), unit, tolerance 0.1.
Physics: H = 10 x P, P = P2 - P1, Qact = 0.0055 x sqrt(H), T = T1 + T0 - T2 with T0 = 1 kg, tau = T x 9.81 x 0.415 / 2, eta = BHP / IHP x 100.`;

export interface AiResult {
  questions: DraftQuestion[];
  dropped: number; // items that failed validation
}

// Throws on any HTTP, network or parse failure. The caller falls back to templates.
export async function generateWithGroq(opts: {
  apiKey: string;
  model?: string;
  counts: Counts;
  instructions?: string;
}): Promise<AiResult> {
  const wanted = Object.entries(opts.counts)
    .filter(([, n]) => n && n > 0)
    .map(([kind, n]) => `${n} x ${kind}`)
    .join(', ');
  const facts = {
    theory: PELTON_WHEEL.theory,
    components: PELTON_WHEEL.components.map(({ id, label, description, specs }) => ({ id, label, description, specs })),
    procedure: PELTON_WHEEL.procedure,
  };
  const prompt = [
    `Write these viva questions for the Pelton wheel lab: ${wanted}.`,
    `Teacher's instructions: ${opts.instructions?.trim() || 'none'}`,
    RULES,
    'Reply with a JSON object only, in the form {"questions": [ ... ]}. No prose.',
    `Facts (JSON): ${JSON.stringify(facts)}`,
  ].join('\n\n');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model || DEFAULT_MODEL,
      messages: [
        { role: 'system', content: 'You write viva questions for a mechanical engineering lab. Use only the facts given. Reply with JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 4000,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = body.choices?.[0]?.message?.content ?? '';
  const parsed = JSON.parse(text) as { questions?: unknown };
  if (!Array.isArray(parsed.questions)) throw new Error('reply had no questions array');

  const used: Partial<Record<VivaKind, number>> = {};
  const questions: DraftQuestion[] = [];
  let dropped = 0;
  for (const item of parsed.questions) {
    const q = parseDraft(item);
    if (typeof q === 'string') {
      dropped++;
      continue;
    }
    const cap = opts.counts[q.kind] ?? 0;
    if ((used[q.kind] ?? 0) >= cap) continue;
    used[q.kind] = (used[q.kind] ?? 0) + 1;
    questions.push({ ...q, source: 'ai' });
  }
  return { questions, dropped };
}
