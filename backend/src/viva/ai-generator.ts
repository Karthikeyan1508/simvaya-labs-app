import { PELTON_WHEEL } from '../experiments/pelton-wheel/pelton-wheel.content';
import { parseDraft } from './draft';
import type { Counts } from './question-bank';
import { type DraftQuestion, type VivaKind } from './types';

const API_URL = 'https://api.anthropic.com/v1/messages';

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
export async function generateWithClaude(opts: {
  apiKey: string;
  model: string;
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
    'Reply with a JSON array only. No prose, no code fence.',
    `Facts (JSON): ${JSON.stringify(facts)}`,
  ].join('\n\n');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': opts.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: 8000,
      system: 'You write viva questions for a mechanical engineering lab. Use only the facts given.',
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const body = (await res.json()) as { content?: { type?: string; text?: string }[] };
  const text = (body.content ?? []).map((b) => (b.type === 'text' ? (b.text ?? '') : '')).join('');
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end < start) throw new Error('reply had no JSON array');
  const items: unknown = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(items)) throw new Error('reply was not an array');

  const used: Partial<Record<VivaKind, number>> = {};
  const questions: DraftQuestion[] = [];
  let dropped = 0;
  for (const item of items) {
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
