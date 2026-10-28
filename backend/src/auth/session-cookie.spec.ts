import { clearSessionCookie, readCookie, setSessionCookie, tokenFromRequest } from './session-cookie';

const req = (headers: Record<string, string>, secure = false) => ({ headers, secure }) as never;
const res = () => ({ cookie: jest.fn(), clearCookie: jest.fn() });

afterEach(() => delete process.env.SESSION_COOKIE);

describe('session cookie', () => {
  it('parses the named cookie', () => {
    expect(readCookie('a=1; simvaya_session=tok%20x; b=2', 'simvaya_session')).toBe('tok x');
    expect(readCookie(undefined, 'simvaya_session')).toBe('');
  });
  it('bearer works with the flag off, cookie is ignored', () => {
    expect(tokenFromRequest(req({ authorization: 'Bearer abc' }))).toBe('abc');
    expect(tokenFromRequest(req({ cookie: 'simvaya_session=c' }))).toBe('');
  });
  it('cookie accepted when on; bearer wins', () => {
    process.env.SESSION_COOKIE = 'true';
    expect(tokenFromRequest(req({ cookie: 'simvaya_session=c' }))).toBe('c');
    expect(tokenFromRequest(req({ authorization: 'Bearer b', cookie: 'simvaya_session=c' }))).toBe('b');
  });
  it('sets nothing by default', () => {
    const r = res();
    setSessionCookie(req({}), r as never, 't');
    clearSessionCookie(req({}), r as never);
    expect(r.cookie).not.toHaveBeenCalled();
    expect(r.clearCookie).not.toHaveBeenCalled();
  });
  it('None+Secure on https (also via proxy header), Lax on http', () => {
    process.env.SESSION_COOKIE = 'true';
    const a = res();
    setSessionCookie(req({ 'x-forwarded-proto': 'https' }), a as never, 't');
    expect(a.cookie).toHaveBeenCalledWith(
      'simvaya_session',
      't',
      expect.objectContaining({ httpOnly: true, secure: true, sameSite: 'none', path: '/' }),
    );
    const b = res();
    setSessionCookie(req({}), b as never, 't');
    expect(b.cookie.mock.calls[0][2]).toMatchObject({ secure: false, sameSite: 'lax' });
  });
  it('logout clears the cookie when on', () => {
    process.env.SESSION_COOKIE = 'true';
    const r = res();
    clearSessionCookie(req({}), r as never);
    expect(r.clearCookie).toHaveBeenCalledWith('simvaya_session', expect.objectContaining({ path: '/' }));
  });
});
