import type { NextFunction, Request, Response } from 'express';

// One line per request: method, path without query, status, ms. Never the body, headers or query string.
export const requestLine = (method: string, url: string, status: number, ms: number) =>
  `${method} ${url.split('?')[0]} ${status} ${ms}ms`;

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const t = Date.now();
  res.on('finish', () => console.log(requestLine(req.method, req.originalUrl, res.statusCode, Date.now() - t)));
  next();
}

// Error text can echo a secret (a failed upstream call, a pasted header). Scrub the usual shapes before logging.
export function redact(text: string): string {
  return text
    .replace(/(bearer\s+)[^\s"',]+/gi, '$1[redacted]')
    .replace(
      /((?:api[_-]?key|token|secret|password|authorization|idToken)["']?\s*[:=]\s*["']?)[^\s"',&]+/gi,
      '$1[redacted]',
    )
    .replace(/\b(?:sk_|gsk_)[A-Za-z0-9_-]{8,}/g, '[redacted]')
    .replace(/\b[a-f0-9]{64}\b/gi, '[redacted]');
}

export const errorLine = (method: string, url: string, err: unknown) =>
  redact(`${method} ${url.split('?')[0]} failed: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
