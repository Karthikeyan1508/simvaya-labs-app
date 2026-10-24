import { AgenticOrgError, agenticOrgConfig, runAgent } from './agenticorg';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('agenticOrgConfig', () => {
  it('needs a key, reads either key name, and defaults to the hackathon host', () => {
    expect(agenticOrgConfig({})).toBeNull();
    expect(agenticOrgConfig({ AGENTIC_ORG_KEY: 'k1' })).toEqual({
      baseUrl: 'https://agenticorg.hackathon.pinelabs.com',
      apiKey: 'k1',
    });
    expect(agenticOrgConfig({ AGENTICORG_API_KEY: 'k2', AGENTICORG_BASE_URL: 'https://example.test/' })).toEqual({
      baseUrl: 'https://example.test',
      apiKey: 'k2',
    });
  });
});

describe('runAgent', () => {
  const cfg = { baseUrl: 'https://agenticorg.hackathon.pinelabs.com', apiKey: 'secret-key' };
  const id = '11111111-2222-4333-8444-555555555555';

  it('posts to the agent UUID route with the bearer key and returns the result', async () => {
    const fetchMock = jest.fn(async () => json(200, { status: 'completed', confidence: 0.9, output: { text: 'ok' } }));
    const out = await runAgent(cfg, id, { task: 'draft' }, fetchMock as unknown as typeof fetch);

    expect(out).toEqual({ status: 'completed', confidence: 0.9, output: { text: 'ok' } });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://agenticorg.hackathon.pinelabs.com/api/v1/agents/${id}/run`);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secret-key');
    expect(JSON.parse(init.body as string)).toEqual({ action: 'process', inputs: { task: 'draft' }, context: {} });
  });

  it('passes a waiting-for-approval status through instead of treating it as success', async () => {
    const fetchMock = jest.fn(async () => json(200, { status: 'hitl_triggered', output: null }));
    const out = await runAgent(cfg, id, {}, fetchMock as unknown as typeof fetch);
    expect(out.status).toBe('hitl_triggered');
  });

  it('throws with the HTTP status when AgenticOrg refuses the call', async () => {
    const fetchMock = jest.fn(async () => json(404, { error: { message: 'Resource not found' } }));
    await expect(runAgent(cfg, id, {}, fetchMock as unknown as typeof fetch)).rejects.toMatchObject({
      httpStatus: 404,
      message: 'Resource not found',
    });
    await expect(runAgent(cfg, id, {}, fetchMock as unknown as typeof fetch)).rejects.toBeInstanceOf(AgenticOrgError);
  });
});
