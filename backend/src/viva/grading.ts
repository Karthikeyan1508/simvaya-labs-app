import { isPartId, partLabel, PART_ALIASES } from './part-aliases';
import { type Question, type StoredAnswer } from './types';

// Pure grading. The service layer does the storage.

const DEFAULT_TOLERANCE = 0.05;

export interface Graded {
  correct: boolean | null;
  score: number | null;
  feedback?: string | null; // from the marker, for explain answers
}

export interface Result extends Graded {
  questionId: number;
  points: number;
  expected?: string;
  explanation?: string; // the model answer
}

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Correct if the normalised answer equals or contains one of the part's aliases.
export function matchesPart(text: string, partId: string): boolean {
  const answer = normalise(text);
  if (!answer) return false;
  return (PART_ALIASES[partId] ?? []).some((alias) => answer.includes(normalise(alias)));
}

// Relative tolerance: 0.05 means within 5% of expected. Undefined tolerance uses 0.05.
export function withinTolerance(value: number, expected: number, tolerance = DEFAULT_TOLERANCE): boolean {
  if (!Number.isFinite(value) || !Number.isFinite(expected)) return false;
  return Math.abs(value - expected) <= tolerance * Math.abs(expected);
}

// Null for explain, which the marker grades.
export function isCorrect(q: Question, a: StoredAnswer): boolean | null {
  switch (q.kind) {
    case 'explain':
      return null;
    case 'mcq':
    case 'formula':
      return 'option' in a && a.option === q.answer;
    case 'point':
      return 'partId' in a && a.partId === q.partId;
    case 'step':
      return 'step' in a && a.step === q.step;
    case 'highlight':
      return 'text' in a && !!q.partId && matchesPart(a.text, q.partId);
    case 'calc':
    case 'graph':
      return 'value' in a && withinTolerance(a.value, q.expected ?? NaN, q.tolerance);
  }
}

// An unanswered auto-graded question counts as wrong. Explain stays null until it is marked.
export function gradeAnswer(q: Question, answer: StoredAnswer | null): Graded {
  if (q.kind === 'explain') return { correct: null, score: null };
  const correct = answer !== null && isCorrect(q, answer) === true;
  return { correct, score: correct ? q.points : 0 };
}

// Checks a raw answer payload for its question kind. Null means the payload does not fit.
export function parseAnswer(q: Question, raw: unknown): StoredAnswer | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  switch (q.kind) {
    case 'explain':
      return typeof r.text === 'string' && r.text.length <= 5000 ? { text: r.text } : null;
    case 'highlight':
      return typeof r.text === 'string' && r.text.length <= 200 ? { text: r.text } : null;
    case 'mcq':
    case 'formula': {
      const n = r.option;
      return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < (q.options?.length ?? 0)
        ? { option: n }
        : null;
    }
    case 'point':
      return isPartId(r.partId) ? { partId: r.partId } : null;
    case 'step': {
      const n = r.step;
      return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 9 ? { step: n } : null;
    }
    case 'calc':
    case 'graph': {
      const v = r.value;
      return typeof v === 'number' && Number.isFinite(v) ? { value: v } : null;
    }
  }
}

export function maxScore(questions: Question[]): number {
  return questions.reduce((sum, q) => sum + q.points, 0);
}

// Attempt totals from the graded rows. Pending review while any explain question has no score.
export function attemptTotals(
  questions: Question[],
  graded: Map<number, Graded>,
): { score: number; pendingReview: boolean } {
  let score = 0;
  let pendingReview = false;
  for (const q of questions) {
    const s = graded.get(q.id)?.score ?? null;
    if (s !== null) score += s;
    else if (q.kind === 'explain') pendingReview = true;
  }
  return { score: Math.round(score * 100) / 100, pendingReview };
}

// The correct answer as text. Only sent after submit.
export function expectedText(q: Question): string | undefined {
  switch (q.kind) {
    case 'mcq':
    case 'formula':
      return q.options?.[q.answer ?? -1];
    case 'point':
    case 'highlight':
      return q.partId ? partLabel(q.partId) : undefined;
    case 'step':
      return `Step ${q.step}`;
    case 'calc':
    case 'graph':
      return [q.expected, q.unit].filter((v) => v !== undefined && v !== '').join(' ');
    case 'explain':
      return undefined;
  }
}

export function resultFor(q: Question, g: Graded | undefined): Result {
  return {
    questionId: q.id,
    correct: g?.correct ?? null,
    score: g?.score ?? null,
    feedback: g?.feedback ?? null,
    points: q.points,
    expected: expectedText(q),
    explanation: q.explanation,
  };
}
