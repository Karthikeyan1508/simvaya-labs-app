import type { Request, Response } from 'express';

export const SESSION_COOKIE = 'simvaya_session';
const MAX_AGE_MS = 30 * 86_400_000;

// Off unless SESSION_COOKIE=true, so default behaviour stays bearer-only.
export const cookieSessionsOn = () => process.env.SESSION_COOKIE === 'true';

export function readCookie(header: string | undefined, name: string): string {
  for (const part of (header ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return '';
}

const isHttps = (req: Request) => req.secure || req.headers['x-forwarded-proto'] === 'https';

const flags = (req: Request) => {
  const https = isHttps(req);
  return { httpOnly: true, secure: https, sameSite: https ? ('none' as const) : ('lax' as const), path: '/' };
};

export function setSessionCookie(req: Request, res: Response, token: string) {
  if (cookieSessionsOn()) res.cookie(SESSION_COOKIE, token, { ...flags(req), maxAge: MAX_AGE_MS });
}

export function clearSessionCookie(req: Request, res: Response) {
  if (cookieSessionsOn()) res.clearCookie(SESSION_COOKIE, flags(req));
}

// Bearer header wins; the cookie is the fallback.
export function tokenFromRequest(req: Request): string {
  const header = req.headers.authorization ?? '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return cookieSessionsOn() ? readCookie(req.headers.cookie, SESSION_COOKIE) : '';
}
