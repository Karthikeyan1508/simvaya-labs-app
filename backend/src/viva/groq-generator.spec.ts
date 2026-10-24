import { generateWithGroq } from './groq-generator';

const reply = (content: string) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

describe('generateWithGroq', () => {
  const explain = (prompt: string) => ({ kind: 'explain', prompt, points: 1, explanation: 'model answer' });

  it('sends a JSON-mode chat request with the key as a bearer token', async () => {
    const fetchMock = jest.fn(async () => reply(JSON.stringify({ questions: [] })));
    global.fetch = fetchMock as unknown as typeof fetch;
    await generateWithGroq({ apiKey: 'gsk_test', counts: { explain: 1 } });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer gsk_test');
    const body = JSON.parse(init.body as string);
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.model).toBe('openai/gpt-oss-120b');
  });

  it('keeps only the asked-for number per kind and counts the invalid items it drops', async () => {
    const items = [
      explain('Why does the Pelton wheel need a jet?'),
      explain('What does the venturi meter measure?'),
      { kind: 'not-a-kind', prompt: 'broken' },
    ];
    global.fetch = jest.fn(async () => reply(JSON.stringify({ questions: items }))) as unknown as typeof fetch;

    const out = await generateWithGroq({ apiKey: 'k', counts: { explain: 1 } });
    expect(out.questions).toHaveLength(1);
    expect(out.questions[0].source).toBe('ai');
    expect(out.dropped).toBe(1);
  });

  it('throws when Groq answers with an error, so the caller falls back to templates', async () => {
    global.fetch = jest.fn(async () => new Response('nope', { status: 429 })) as unknown as typeof fetch;
    await expect(generateWithGroq({ apiKey: 'k', counts: { explain: 1 } })).rejects.toThrow('HTTP 429');
  });
});
