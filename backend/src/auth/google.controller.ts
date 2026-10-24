import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { createGoogleUser, createSession, insertActivity, userByEmail } from '../db/repo';

// Google sign-in (OpenID Connect, authorization code flow). The session it issues is the same token password login uses.
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const STATE_COOKIE = 'simvaya_oauth_state';
const STATE_PATH = '/auth/google';

interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

function googleConfig(): GoogleConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  return clientId && clientSecret && redirectUri ? { clientId, clientSecret, redirectUri } : null;
}

// Where the browser goes after sign-in. Set FRONTEND_URL to the web app's origin.
const frontendUrl = () => (process.env.FRONTEND_URL ?? 'http://localhost:3100').replace(/\/$/, '');

// Reads the claims from the ID token. The token came straight from Google's token endpoint over TLS, so the
// issuer, audience, expiry and verified-email checks below are what decide whether to trust it.
function idTokenClaims(idToken: string | undefined, clientId: string): { email: string; name: string } | null {
  if (!idToken) return null;
  const part = idToken.split('.')[1];
  if (!part) return null;
  let p: { iss?: string; aud?: string; exp?: number; email?: string; email_verified?: boolean | string; name?: string };
  try {
    p = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  const issuerOk = p.iss === 'https://accounts.google.com' || p.iss === 'accounts.google.com';
  const expiresLater = typeof p.exp === 'number' && p.exp * 1000 > Date.now();
  const verified = p.email_verified === true || p.email_verified === 'true';
  if (!issuerOk || p.aud !== clientId || !expiresLater || !verified || typeof p.email !== 'string') return null;
  const email = p.email.toLowerCase();
  return { email, name: p.name?.trim() || email.split('@')[0] };
}

function cookieValue(req: Request, name: string): string | undefined {
  const raw = req.headers.cookie ?? '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

@Controller('auth/google')
export class GoogleAuthController {
  // Starts the flow. A random state goes in a short-lived cookie and must come back unchanged (CSRF check).
  @Get()
  start(@Res() res: Response) {
    const cfg = googleConfig();
    if (!cfg) return res.redirect(`${frontendUrl()}/login?error=google-not-configured`);
    const state = randomBytes(16).toString('hex');
    res.cookie(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: cfg.redirectUri.startsWith('https://'),
      maxAge: 10 * 60 * 1000,
      path: STATE_PATH,
    });
    const url = new URL(AUTH_URL);
    url.search = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: cfg.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    }).toString();
    return res.redirect(url.toString());
  }

  @Get('callback')
  async callback(
    @Req() req: Request,
    @Res() res: Response,
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error') error?: string,
  ) {
    const fail = (why: string) => res.redirect(`${frontendUrl()}/login?error=${why}`);
    const cfg = googleConfig();
    if (!cfg) return fail('google-not-configured');
    const expected = cookieValue(req, STATE_COOKIE);
    res.clearCookie(STATE_COOKIE, { path: STATE_PATH });
    if (error) return fail('google-denied');
    if (!code || !state || !expected || state !== expected) return fail('google-state');

    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: cfg.redirectUri,
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    if (!tokenRes?.ok) return fail('google-token');
    const body = (await tokenRes.json().catch(() => null)) as { id_token?: string } | null;
    const claims = idTokenClaims(body?.id_token, cfg.clientId);
    if (!claims) return fail('google-token');

    // The first Google sign-in creates the account. A teacher email that already exists keeps its teacher role.
    const user = (await userByEmail(claims.email)) ?? (await createGoogleUser(claims.email, claims.name));
    const token = await createSession(user.id);
    await insertActivity(user.id, 'signed_in', null);
    // The token goes in the URL fragment: browsers do not send it to the server, so it stays out of logs.
    return res.redirect(`${frontendUrl()}/auth/callback#token=${token}`);
  }
}
