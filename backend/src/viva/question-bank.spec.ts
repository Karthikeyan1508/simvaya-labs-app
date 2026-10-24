import { PELTON_WHEEL } from '../experiments/pelton-wheel/pelton-wheel.content';
import { parseDraft } from './draft';
import { PART_ALIASES } from './part-aliases';
import { templateQuestions, type Counts } from './question-bank';
import { VIVA_KINDS, type DraftQuestion, type VivaKind } from './types';

const ALL: Counts = Object.fromEntries(VIVA_KINDS.map((k) => [k, 4])) as Record<VivaKind, number>;
const PART_IDS = PELTON_WHEEL.components.map((c) => c.id);

describe('viva question bank', () => {
  const qs = templateQuestions(ALL, 42);

  it('generates every kind with the requested count', () => {
    for (const kind of VIVA_KINDS) {
      expect(qs.filter((q) => q.kind === kind)).toHaveLength(4);
    }
    expect(qs).toHaveLength(VIVA_KINDS.length * 4);
  });

  it('gives finite expected values for calc and graph', () => {
    const numeric = qs.filter((q) => q.kind === 'calc' || q.kind === 'graph');
    expect(numeric.length).toBeGreaterThan(0);
    for (const q of numeric) {
      expect(Number.isFinite(q.expected)).toBe(true);
      expect(q.unit).toBeTruthy();
    }
  });

  it('takes graph peakX from the sweep data, and the expected value from peakX or the peak y', () => {
    const graphs = qs.filter((q) => q.kind === 'graph');
    for (const q of graphs) {
      const g = q.graph!;
      const y = g.y;
      const top = Math.max(...y);
      expect(g.x).toHaveLength(y.length);
      expect(g.x[y.indexOf(top)]).toBe(g.peakX);
      expect([g.peakX, top]).toContain(q.expected);
    }
  });

  it('uses only real part ids for point and highlight, and every part has aliases', () => {
    expect(Object.keys(PART_ALIASES).sort()).toEqual([...PART_IDS].sort());
    for (const q of qs.filter((x) => x.kind === 'point' || x.kind === 'highlight')) {
      expect(PART_IDS).toContain(q.partId);
      expect(PART_ALIASES[q.partId!].length).toBeGreaterThan(0);
    }
  });

  it('keeps mcq and formula answers in range and steps within 1 to 9', () => {
    for (const q of qs.filter((x) => x.kind === 'mcq' || x.kind === 'formula')) {
      expect(q.options!.length).toBeGreaterThanOrEqual(2);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(q.options!.length);
    }
    for (const q of qs.filter((x) => x.kind === 'step')) {
      expect(q.step).toBeGreaterThanOrEqual(1);
      expect(q.step).toBeLessThanOrEqual(9);
    }
  });

  it('passes the same rules the AI output and the teacher are checked against', () => {
    for (const q of qs) {
      expect(typeof parseDraft(q)).not.toBe('string');
    }
  });

  it('is stable for a fixed seed and changes with the seed', () => {
    const again = templateQuestions(ALL, 42);
    const other = templateQuestions(ALL, 43);
    expect(JSON.stringify(again)).toBe(JSON.stringify(qs));
    expect(JSON.stringify(other)).not.toBe(JSON.stringify(qs));
  });

  it('refuses broken drafts', () => {
    const base = { prompt: 'x', points: 1 };
    const bad: unknown[] = [
      { ...base, kind: 'nope' },
      { ...base, kind: 'mcq', options: ['a', 'b'], answer: 5 },
      { ...base, kind: 'formula', options: ['a'], answer: 0 },
      { ...base, kind: 'step', step: 10 },
      { ...base, kind: 'point', partId: 'not-a-part' },
      { ...base, kind: 'highlight' },
      { ...base, kind: 'calc', expected: Number.NaN },
      { ...base, kind: 'calc', expected: 1, tolerance: 5 },
      { ...base, kind: 'graph', expected: 1, graph: { x: [1, 2], y: [1, 2], xLabel: 'x', yLabel: 'y' } },
      { ...base, kind: 'graph', expected: 1, graph: { x: [1, 2, 3], y: [1, 2], xLabel: 'x', yLabel: 'y' } },
      { ...base, prompt: '', kind: 'explain' },
    ];
    for (const raw of bad) {
      expect(typeof parseDraft(raw)).toBe('string');
    }
  });

  it('accepts a clean draft and strips unknown fields', () => {
    const out = parseDraft({ kind: 'explain', prompt: ' Explain. ', hack: 1, id: 9 }) as DraftQuestion;
    expect(out).toEqual({ kind: 'explain', prompt: 'Explain.', points: 1, source: 'manual' });
  });
});
