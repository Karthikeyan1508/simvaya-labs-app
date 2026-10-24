import { templateQuestions } from './question-bank';
import { toStudentQuestion } from './student-view';
import { VIVA_KINDS, type Question, type VivaKind } from './types';

// Keys a student must never receive before submit.
const FORBIDDEN = ['answer', 'expected', 'tolerance', 'explanation', 'peakX', 'aliases', 'partId', 'step', 'source'];

function keysOf(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((v) => keysOf(v, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      out.push(k);
      keysOf(v, out);
    }
  }
  return out;
}

describe('student view', () => {
  it('strips every answer key from every kind', () => {
    const counts = Object.fromEntries(VIVA_KINDS.map((k) => [k, 3])) as Record<VivaKind, number>;
    const questions: Question[] = templateQuestions(counts, 7).map((q, i) => ({ ...q, id: i + 1 }));
    expect(new Set(questions.map((q) => q.kind))).toEqual(new Set(VIVA_KINDS));

    for (const q of questions) {
      const keys = keysOf(toStudentQuestion(q));
      for (const bad of FORBIDDEN) expect(keys).not.toContain(bad);
    }
  });

  it('removes the answer, tolerance, explanation and peak from a hand-built question', () => {
    const calc: Question = {
      id: 1,
      kind: 'calc',
      prompt: 'Find H',
      points: 1,
      expected: 2.5,
      tolerance: 0.05,
      unit: 'm',
      explanation: 'H = 10 x P',
      source: 'manual',
    };
    expect(toStudentQuestion(calc)).toEqual({ id: 1, kind: 'calc', prompt: 'Find H', points: 1, unit: 'm' });
  });

  it('removes the point target but keeps the highlighted part for highlight questions', () => {
    const point = toStudentQuestion({ id: 1, kind: 'point', prompt: 'Click the pump', points: 1, partId: 'pump' });
    expect(point).toEqual({ id: 1, kind: 'point', prompt: 'Click the pump', points: 1 });

    const hl = toStudentQuestion({ id: 2, kind: 'highlight', prompt: 'Name it', points: 1, partId: 'runner' });
    expect(hl.highlightPartId).toBe('runner');
    expect(keysOf(hl)).not.toContain('partId');
  });

  it('removes the peak from graph questions and keeps the sweep data', () => {
    const graph = toStudentQuestion({
      id: 3,
      kind: 'graph',
      prompt: 'Peak?',
      points: 1,
      expected: 20,
      tolerance: 0.1,
      unit: 'kg',
      graph: { x: [1, 2, 3], y: [4, 5, 4], xLabel: 'T', yLabel: 'eta', peakX: 2 },
    });
    expect(graph.graph).toEqual({ x: [1, 2, 3], y: [4, 5, 4], xLabel: 'T', yLabel: 'eta' });
    expect(keysOf(graph)).not.toContain('peakX');
  });

  it('keeps the mcq options without revealing which one is right', () => {
    const mcq = toStudentQuestion({ id: 4, kind: 'mcq', prompt: 'Pick', points: 1, options: ['a', 'b'], answer: 1 });
    expect(mcq.options).toEqual(['a', 'b']);
    expect(keysOf(mcq)).not.toContain('answer');
  });
});
