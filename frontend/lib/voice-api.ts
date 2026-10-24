import { ApiError, getToken } from '@/lib/account';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// The backend holds the ElevenLabs key and mints a short-lived signed URL, so the key never reaches the browser.
export async function fetchSignedUrl(): Promise<string> {
  const token = getToken();
  const res = await fetch(`${BASE}/voice/signed-url`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const body = (await res.json().catch(() => null)) as { signedUrl?: string; message?: string } | null;
  if (!res.ok) throw new ApiError(res.status, body?.message ?? `Request failed (${res.status})`);
  if (!body?.signedUrl) throw new Error('The server returned no voice session');
  return body.signedUrl;
}
