import {
  attemptTotals,
  expectedText,
  gradeAnswer,
  isCorrect,
  matchesPart,
  maxScore,
  parseAnswer,
  withinTolerance,
} from './grading';
import type { Question } from './types';

const q = (over: Partial<Question> & Pick<Question, 'kind'>): Question => ({
  id: 1,
  prompt: 'p',
  points: 1,
  ...over,
});

describe('viva grading', () => {
  it('matches highlight answers ignoring case and punctuation', () => {
    expect(matchesPart('The PELTON-Runner!', 'runner')).toBe(true);
    expect(matchesPart('  buckets, ', 'runner')).toBe(true);
    expect(matchesPart('nozzle', 'runner')).toBe(false);
    expect(matchesPart('   ', 'runner')).toBe(false);
  });

  it('grades a highlight question by the part aliases', () => {
    const hl = q({ kind: 'highlight', partId: 'brake_drum' });
    expect(isCorrect(hl, { text: 'brake drum' })).toBe(true);
    expect(isCorrect(hl, { text: 'Drum' })).toBe(true);
    expect(isCorrect(hl, { text: 'rope' })).toBe(false);
  });

  it('grades mcq and formula by option index', () => {
    const mcq = q({ kind: 'mcq', options: ['a', 'b', 'c'], answer: 2 });
    expect(gradeAnswer(mcq, { option: 2 })).toEqual({ correct: true, score: 1 });
    expect(gradeAnswer(mcq, { option: 0 })).toEqual({ correct: false, score: 0 });
    expect(gradeAnswer(mcq, null)).toEqual({ correct: false, score: 0 });
  });

  it('grades point and step by exact match', () => {
    expect(isCorrect(q({ kind: 'point', partId: 'pump' }), { partId: 'pump' })).toBe(true);
    expect(isCorrect(q({ kind: 'point', partId: 'pump' }), { partId: 'nozzle' })).toBe(false);
    expect(isCorrect(q({ kind: 'step', step: 4 }), { step: 4 })).toBe(true);
    expect(isCorrect(q({ kind: 'step', step: 4 }), { step: 5 })).toBe(false);
  });

  it('uses relative tolerance for calc and graph', () => {
    expect(withinTolerance(10.4, 10, 0.05)).toBe(true);
    expect(withinTolerance(10.6, 10, 0.05)).toBe(false);
    expect(withinTolerance(10.6, 10, 0.1)).toBe(true);
    expect(withinTolerance(Number.NaN, 10, 0.05)).toBe(false);
  });

  it('defaults to 5 percent when the tolerance is missing', () => {
    const calc = q({ kind: 'calc', expected: 10, points: 2 });
    expect(gradeAnswer(calc, { value: 10.4 })).toEqual({ correct: true, score: 2 });
    expect(gradeAnswer(calc, { value: 10.6 })).toEqual({ correct: false, score: 0 });
    const graph = q({ kind: 'graph', expected: 10, tolerance: 0.1 });
    expect(isCorrect(graph, { value: 10.6 })).toBe(true);
  });

  it('leaves explain for the teacher', () => {
    expect(gradeAnswer(q({ kind: 'explain' }), { text: 'anything' })).toEqual({ correct: null, score: null });
  });

  it('rejects answer payloads that do not fit the question', () => {
    const mcq = q({ kind: 'mcq', options: ['a', 'b'], answer: 0 });
    expect(parseAnswer(mcq, { option: 2 })).toBeNull();
    expect(parseAnswer(mcq, { option: 1.5 })).toBeNull();
    expect(parseAnswer(q({ kind: 'step', step: 1 }), { step: 10 })).toBeNull();
    expect(parseAnswer(q({ kind: 'point', partId: 'pump' }), { partId: 'nope' })).toBeNull();
    expect(parseAnswer(q({ kind: 'calc', expected: 1 }), { value: 'abc' })).toBeNull();
    expect(parseAnswer(q({ kind: 'highlight', partId: 'pump' }), { text: 'pump' })).toEqual({ text: 'pump' });
  });

  it('totals an attempt and flags explain answers still to grade', () => {
    const questions = [
      q({ id: 1, kind: 'explain', points: 2 }),
      q({ id: 2, kind: 'mcq', options: ['a', 'b'], answer: 0, points: 1 }),
    ];
    expect(maxScore(questions)).toBe(3);

    const before = attemptTotals(questions, new Map([[2, { correct: true, score: 1 }]]));
    expect(before).toEqual({ score: 1, pendingReview: true });

    const after = attemptTotals(
      questions,
      new Map([
        [1, { correct: null, score: 2 }],
        [2, { correct: true, score: 1 }],
      ]),
    );
    expect(after).toEqual({ score: 3, pendingReview: false });
  });

  it('gives the expected answer as text', () => {
    expect(expectedText(q({ kind: 'mcq', options: ['x', 'y'], answer: 1 }))).toBe('y');
    expect(expectedText(q({ kind: 'step', step: 3 }))).toBe('Step 3');
    expect(expectedText(q({ kind: 'point', partId: 'pump' }))).toBe('Centrifugal pump');
    expect(expectedText(q({ kind: 'calc', expected: 2.5, unit: 'kW' }))).toBe('2.5 kW');
    expect(expectedText(q({ kind: 'explain' }))).toBeUndefined();
  });
});
