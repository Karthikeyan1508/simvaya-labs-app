// AgenticOrg client for agent runs. Plain fetch, no SDK: the run endpoint takes the agent's UUID.
// The SDK defaults to app.agenticorg.ai, so the hackathon host must be set explicitly.

const DEFAULT_BASE_URL = 'https://agenticorg.hackathon.pinelabs.com';
const RUN_TIMEOUT_MS = 120_000;

export type RunStatus = 'completed' | 'failed' | 'hitl_triggered' | 'budget_exceeded';

export interface RunResult {
  status: RunStatus | string;
  confidence: number | null;
  output: unknown;
}

export class AgenticOrgError extends Error {
  constructor(
    readonly httpStatus: number,
    message: string,
  ) {
    super(message);
  }
}

export interface AgenticOrgConfig {
  baseUrl: string;
  apiKey: string;
}

// Reads the env. AGENTICORG_API_KEY is the SDK's name; AGENTIC_ORG_KEY is the name used in this project's env files.
export function agenticOrgConfig(env: NodeJS.ProcessEnv = process.env): AgenticOrgConfig | null {
  const apiKey = env.AGENTICORG_API_KEY || env.AGENTIC_ORG_KEY;
  if (!apiKey) return null;
  const baseUrl = (env.AGENTICORG_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
  return { baseUrl, apiKey };
}

// One synchronous run. Long runs need run-async; the viva drafts are short enough for this.
export async function runAgent(
  cfg: AgenticOrgConfig,
  agentId: string,
  inputs: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch,
): Promise<RunResult> {
  const res = await fetchImpl(`${cfg.baseUrl}/api/v1/agents/${encodeURIComponent(agentId)}/run`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'process', inputs, context: {} }),
    signal: AbortSignal.timeout(RUN_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new AgenticOrgError(res.status, body?.error?.message ?? `AgenticOrg answered ${res.status}`);
  }
  const data = (await res.json()) as { status?: string; confidence?: number; output?: unknown };
  return {
    status: data.status ?? 'unknown',
    confidence: typeof data.confidence === 'number' ? data.confidence : null,
    output: data.output ?? null,
  };
}
