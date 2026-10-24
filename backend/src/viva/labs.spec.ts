import { parseDraft } from './draft';
import { isCorrect, parseAnswer, resultFor } from './grading';
import { generateWithGroq } from './groq-generator';
import { LABS, labFor } from './labs';
import { labTemplateQuestions } from './lab-templates';
import { generateSelfAssessment } from './self-assessment';
import { EXPERIMENT_IDS, type Question } from './types';

const SEEDS = Array.from({ length: 25 }, (_, i) => i + 1);
const NEW_LABS = EXPERIMENT_IDS.filter((id) => id !== 'pelton-wheel');

const reply = (content: unknown) =>
  new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

describe('lab viva shapes', () => {
  it('gives every lab eight questions', () => {
    for (const id of EXPERIMENT_IDS) {
      expect(Object.values(LABS[id].counts).reduce((s, n) => s + (n ?? 0), 0)).toBe(8);
    }
  });

  it('asks only the kinds each lab supports', () => {
    expect([...LABS['pelton-wheel'].kinds].sort()).toEqual(
      ['calc', 'explain', 'formula', 'graph', 'highlight', 'mcq', 'point', 'step'],
    );
    expect([...LABS['induction-motor'].kinds].sort()).toEqual(['calc', 'explain', 'formula', 'highlight', 'mcq', 'point']);
    expect([...LABS['zener-regulator'].kinds].sort()).toEqual(['calc', 'explain', 'formula', 'highlight', 'mcq', 'point', 'step']);
    expect([...LABS['sorting-visualiser'].kinds].sort()).toEqual(['calc', 'explain', 'formula', 'mcq']);
    for (const id of EXPERIMENT_IDS) {
      for (const k of Object.keys(LABS[id].counts)) expect(LABS[id].kinds).toContain(k);
    }
  });

  it('falls back to the Pelton wheel for an unknown stored lab', () => {
    expect(labFor('no-such-lab').id).toBe('pelton-wheel');
    expect(labFor('sorting-visualiser').id).toBe('sorting-visualiser');
  });

  describe.each(EXPERIMENT_IDS)('templates for %s', (id) => {
    const lab = LABS[id];

    it('makes valid questions, each with a model answer, from the lab only', () => {
      for (const seed of SEEDS) {
        const qs = labTemplateQuestions(lab, lab.counts, seed);
        expect(qs).toHaveLength(8);
        for (const q of qs) {
          expect(lab.kinds).toContain(q.kind);
          expect(q.source).toBe('template');
          expect(typeof parseDraft(q, lab.parts)).not.toBe('string');
          expect(q.explanation?.trim()).toBeTruthy();
        }
      }
    });

    it('is stable for a seed', () => {
      expect(JSON.stringify(labTemplateQuestions(lab, lab.counts, 7))).toBe(
        JSON.stringify(labTemplateQuestions(lab, lab.counts, 7)),
      );
    });

    it('keeps mcq and formula answers in range', () => {
      for (const seed of SEEDS) {
        for (const q of labTemplateQuestions(lab, lab.counts, seed).filter((x) => x.kind === 'mcq' || x.kind === 'formula')) {
          expect(q.options!.length).toBeGreaterThanOrEqual(2);
          expect(q.answer).toBeGreaterThanOrEqual(0);
          expect(q.answer).toBeLessThan(q.options!.length);
        }
      }
    });
  });

  it('uses only parts of the lab for point and highlight', () => {
    for (const id of NEW_LABS) {
      const lab = LABS[id];
      for (const seed of SEEDS) {
        for (const q of labTemplateQuestions(lab, lab.counts, seed).filter((x) => x.kind === 'point' || x.kind === 'highlight')) {
          expect(Object.keys(lab.parts.labels)).toContain(q.partId);
          expect(Object.keys(lab.parts.aliases)).toContain(q.partId);
        }
      }
    }
  });

  it('keeps step questions within the lab procedure', () => {
    for (const seed of SEEDS) {
      for (const q of labTemplateQuestions(LABS['zener-regulator'], LABS['zener-regulator'].counts, seed)) {
        if (q.kind === 'step') {
          expect(q.step).toBeGreaterThanOrEqual(1);
          expect(q.step).toBeLessThanOrEqual(8);
        }
      }
    }
  });

  it('gives calc questions values that match the lab formulas', () => {
    const zener = LABS['zener-regulator'];
    for (const seed of SEEDS) {
      for (const q of labTemplateQuestions(zener, zener.counts, seed).filter((x) => x.kind === 'calc')) {
        expect(Number.isFinite(q.expected)).toBe(true);
        expect(q.unit === 'mA' || q.unit === 'mW').toBe(true);
        if (q.unit === 'mA') expect(q.expected).toBeGreaterThan(0);
      }
    }
    const sorting = LABS['sorting-visualiser'];
    for (const seed of SEEDS) {
      for (const q of labTemplateQuestions(sorting, sorting.counts, seed).filter((x) => x.kind === 'calc')) {
        const n = Number(/(\d+)/.exec(q.prompt)![1]);
        expect([n - 1, (n * (n - 1)) / 2]).toContain(q.expected);
        expect(n).toBeGreaterThanOrEqual(6);
        expect(n).toBeLessThanOrEqual(30);
      }
    }
  });
});

describe('Groq questions for each lab', () => {
  it.each(NEW_LABS)('keeps the lab template questions in the same shape and asks only supported kinds (%s)', async (id) => {
    const lab = LABS[id];
    const items = labTemplateQuestions(lab, lab.counts, 3);
    // A valid graph question the lab does not ask for: skipped, not counted as dropped.
    const graph = { kind: 'graph', prompt: 'x', points: 1, expected: 1, unit: 'kg', graph: { x: [1, 2, 3], y: [1, 2, 3], xLabel: 'a', yLabel: 'b' } };
    const fetchMock = jest.fn(async () => reply({ questions: [...items, graph] }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const out = await generateWithGroq({ apiKey: 'k', counts: lab.counts, lab });
    expect(out.dropped).toBe(0);
    expect(out.questions).toHaveLength(8);
    for (const q of out.questions) expect(lab.kinds).toContain(q.kind);
  });

  it.each(NEW_LABS)('sends the lab name, its facts and its own rules only (%s)', async (id) => {
    const lab = LABS[id];
    const fetchMock = jest.fn(async () => reply({ questions: [] }));
    global.fetch = fetchMock as unknown as typeof fetch;
    await generateWithGroq({ apiKey: 'k', counts: lab.counts, lab });

    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    const text = JSON.stringify(body.messages);
    expect(text).toContain(lab.name);
    expect(text).not.toContain('Pelton');
    expect(text).not.toContain('T1, T2');
    expect(text).toContain(lab.physics);
    expect(text.includes('- graph:')).toBe(false);
  });

  it.each(NEW_LABS)('drops a point question that names a part of another lab (%s)', async (id) => {
    const lab = LABS[id];
    global.fetch = jest.fn(async () =>
      reply({ questions: [{ kind: 'point', prompt: 'Click the pump.', partId: 'pump', points: 1, explanation: 'x' }] }),
    ) as unknown as typeof fetch;
    const out = await generateWithGroq({ apiKey: 'k', counts: { point: 1 }, lab });
    expect(out.questions).toHaveLength(0);
    expect(out.dropped).toBe(1);
  });
});

describe('grading by lab', () => {
  const point = (partId: string): Question => ({ id: 1, kind: 'point', prompt: 'Click it.', points: 1, partId });

  it('names the part from the lab of the question', () => {
    // "ammeter" is a part in two labs with different names.
    expect(resultFor(point('ammeter'), undefined, LABS['zener-regulator'].parts).expected).toBe('Ammeter Iz');
    expect(resultFor(point('ammeter'), undefined, LABS['induction-motor'].parts).expected).toBe('Ammeter (IL)');
  });

  it('checks a highlight answer against the lab aliases', () => {
    const hl: Question = { id: 2, kind: 'highlight', prompt: 'Name it.', points: 1, partId: 'stator' };
    expect(isCorrect(hl, { text: 'stator winding' }, LABS['induction-motor'].parts)).toBe(true);
    expect(isCorrect(hl, { text: 'rotor' }, LABS['induction-motor'].parts)).toBe(false);
  });

  it('refuses a part id that the lab does not have', () => {
    expect(parseAnswer(point('pump'), { partId: 'pump' }, LABS['induction-motor'].parts)).toBeNull();
    expect(parseAnswer(point('zener'), { partId: 'zener' }, LABS['zener-regulator'].parts)).toEqual({ partId: 'zener' });
  });
});

describe('self-assessment for each lab without AI keys', () => {
  const KEYS = ['AGENTIC_ORG_KEY', 'AGENTICORG_API_KEY', 'AGENTICORG_VIVA_AGENT_ID', 'GROQ_API_KEY'] as const;
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
    for (const k of KEYS) delete process.env[k];
  });

  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it.each(EXPERIMENT_IDS)('falls back to the lab templates (%s)', async (id) => {
    const lab = LABS[id];
    const out = await generateSelfAssessment(lab.counts, lab);
    expect(out.source).toBe('template');
    expect(out.questions).toHaveLength(8);
    expect(out.note).toContain('Templates were used.');
  });

  it('does not call AgenticOrg for a lab other than the Pelton wheel', async () => {
    process.env.AGENTIC_ORG_KEY = 'agentic-key';
    process.env.AGENTICORG_VIVA_AGENT_ID = '11111111-2222-4333-8444-555555555555';
    global.fetch = jest.fn() as unknown as typeof fetch;
    const out = await generateSelfAssessment(LABS['zener-regulator'].counts, LABS['zener-regulator']);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(out.note).toContain('AgenticOrg is only set up for the Pelton wheel');
  });
});
