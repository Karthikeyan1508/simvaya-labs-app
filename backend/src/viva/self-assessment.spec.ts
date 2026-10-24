import { generateSelfAssessment, markExplain, SELF_ASSESSMENT_COUNTS } from './self-assessment';
import type { Question } from './types';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const groqReply = (content: unknown) => json(200, { choices: [{ message: { content: JSON.stringify(content) } }] });

const explain = (prompt: string) => ({ kind: 'explain', prompt, points: 1, explanation: 'model answer' });
const mcq = { kind: 'mcq', prompt: 'Which part?', options: ['Runner', 'Nozzle'], answer: 0 };

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

describe('generateSelfAssessment', () => {
  it('falls back to templates when neither AgenticOrg nor Groq is set up', async () => {
    const out = await generateSelfAssessment();
    expect(out.source).toBe('template');
    expect(out.questions).toHaveLength(Object.values(SELF_ASSESSMENT_COUNTS).reduce((s, n) => s + n, 0));
    expect(out.note).toContain('Templates were used.');
  });

  it('accepts a held AgenticOrg run and adds a note', async () => {
    process.env.AGENTIC_ORG_KEY = 'agentic-key';
    process.env.AGENTICORG_VIVA_AGENT_ID = '11111111-2222-4333-8444-555555555555';
    global.fetch = jest.fn(async () =>
      json(200, { status: 'hitl_triggered', output: { questions: [explain('Why a jet?'), mcq] } }),
    ) as unknown as typeof fetch;

    const out = await generateSelfAssessment();
    expect(out.source).toBe('agenticorg');
    expect(out.questions).toHaveLength(2);
    expect(out.note).toContain('held this run for approval');
  });

  it('moves from a failed AgenticOrg run to Groq and says why', async () => {
    process.env.AGENTIC_ORG_KEY = 'agentic-key';
    process.env.AGENTICORG_VIVA_AGENT_ID = '11111111-2222-4333-8444-555555555555';
    process.env.GROQ_API_KEY = 'gsk_test';
    global.fetch = jest.fn(async (url: string) =>
      url.includes('agenticorg')
        ? json(500, { error: { message: 'boom' } })
        : groqReply({ questions: [explain('Why a jet?')] }),
    ) as unknown as typeof fetch;

    const out = await generateSelfAssessment({ explain: 1 });
    expect(out.source).toBe('groq');
    expect(out.questions).toHaveLength(1);
    expect(out.note).toContain('AgenticOrg could not produce questions (boom)');
  });
});

describe('markExplain', () => {
  const q: Question = { id: 7, kind: 'explain', prompt: 'Explain the jet.', points: 2, explanation: 'model answer' };

  it('scores by the marker fraction of the points and keeps its feedback', async () => {
    process.env.GROQ_API_KEY = 'gsk_test';
    global.fetch = jest.fn(async () => groqReply({ score: 0.8, feedback: 'Good, add the pressure drop.' })) as unknown as typeof fetch;

    const mark = await markExplain(q, 'The jet turns pressure into speed.');
    expect(mark).toEqual({ score: 1.6, correct: true, feedback: 'Good, add the pressure drop.' });
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body as string);
    expect(JSON.stringify(body.messages)).toContain('model answer');
  });

  it('returns null when Groq fails, so the answer stays pending review', async () => {
    process.env.GROQ_API_KEY = 'gsk_test';
    global.fetch = jest.fn(async () => new Response('nope', { status: 503 })) as unknown as typeof fetch;
    expect(await markExplain(q, 'An answer')).toBeNull();
  });

  it('scores an empty answer 0 without calling Groq', async () => {
    process.env.GROQ_API_KEY = 'gsk_test';
    global.fetch = jest.fn() as unknown as typeof fetch;
    expect(await markExplain(q, '   ')).toEqual({ score: 0, correct: false, feedback: 'No answer was given.' });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
