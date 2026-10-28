import { ApiError, getToken } from '@/lib/account';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const authHeader = (): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// The backend holds the ElevenLabs key and mints a short-lived signed URL, so the key never reaches the browser.
export async function fetchSignedUrl(): Promise<string> {
  const res = await fetch(`${BASE}/voice/signed-url`, { headers: authHeader() });
  const body = (await res.json().catch(() => null)) as { signedUrl?: string; message?: string } | null;
  if (!res.ok) throw new ApiError(res.status, body?.message ?? `Request failed (${res.status})`);
  if (!body?.signedUrl) throw new Error('The server returned no voice session');
  return body.signedUrl;
}

// One assistant reply as audio. The backend speaks it in the agent's voice.
export async function fetchSpeech(text: string): Promise<Blob> {
  const res = await fetch(`${BASE}/voice/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new ApiError(res.status, `Could not speak the reply (${res.status})`);
  return res.blob();
}
