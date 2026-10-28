import { errorLine, redact, requestLine } from './logging';

describe('request logging', () => {
  it('drops the query string', () => {
    expect(requestLine('GET', '/auth/me?token=abc&x=1', 200, 5)).toBe('GET /auth/me 200 5ms');
  });
  it('redacts bearer tokens, keys and 64-hex session tokens', () => {
    const hex = 'a'.repeat(64);
    const msg = `bad Authorization: Bearer ${hex} key sk_abcdef123456 {"apiKey":"zzz999"} gsk_ABCDEFGH1234 ${hex}`;
    const out = errorLine('POST', '/voice/speak?k=1', new Error(msg));
    for (const secret of [hex, 'sk_abcdef123456', 'zzz999', 'gsk_ABCDEFGH1234']) expect(out).not.toContain(secret);
    expect(out).toContain('POST /voice/speak failed');
    expect(out).not.toContain('k=1');
  });
  it('leaves plain text alone', () => {
    expect(redact('connection refused')).toBe('connection refused');
  });
});
