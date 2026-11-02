import { Response } from 'express';
import { setSessionCookies, clearSessionCookies } from '../cookies';
import type { IssuedSession } from '../../services/sessionService';

const issued = (maxAge?: number) => ({ token: 'tok', session: {}, cookieMaxAgeMs: maxAge }) as unknown as IssuedSession;
const fakeRes = () => {
  const calls: Array<{ name: string; value?: string; options: Record<string, unknown> }> = [];
  const res = {
    cookie: (name: string, value: string, options: Record<string, unknown>) => calls.push({ name, value, options }),
    clearCookie: (name: string, options: Record<string, unknown>) => calls.push({ name, options }),
  } as unknown as Response;
  return { res, calls };
};

describe('session cookies', () => {
  const env = process.env.NODE_ENV;
  afterEach(() => { process.env.NODE_ENV = env; });

  it('author: HttpOnly, SameSite=Lax, browser-session lifetime; companion hint cookie is readable by scripts', () => {
    const { res, calls } = fakeRes();
    setSessionCookies(res, issued(), 'author');
    const [session, hint] = calls;
    expect(session).toMatchObject({ name: 'bp_session', value: 'tok', options: { httpOnly: true, sameSite: 'lax', path: '/', secure: false } });
    expect(session.options).not.toHaveProperty('maxAge');
    expect(hint).toMatchObject({ name: 'bp_auth', value: 'author', options: { httpOnly: false, sameSite: 'lax' } });
  });

  it('admin: SameSite=Strict', () => {
    const { res, calls } = fakeRes();
    setSessionCookies(res, issued(), 'admin');
    expect(calls[0].options.sameSite).toBe('strict');
    expect(calls[1].value).toBe('admin');
  });

  it('"remember me" sets a lifetime on both cookies', () => {
    const { res, calls } = fakeRes();
    setSessionCookies(res, issued(86_400_000), 'author');
    expect(calls.map((c) => c.options.maxAge)).toEqual([86_400_000, 86_400_000]);
  });

  it('is Secure in production', () => {
    process.env.NODE_ENV = 'production';
    const { res, calls } = fakeRes();
    setSessionCookies(res, issued(), 'author');
    expect(calls.every((c) => c.options.secure === true)).toBe(true);
  });

  it('clearing removes both cookies with matching attributes', () => {
    const { res, calls } = fakeRes();
    clearSessionCookies(res);
    expect(calls.map((c) => c.name)).toEqual(['bp_session', 'bp_auth']);
    expect(calls[0].options).toMatchObject({ httpOnly: true, path: '/' });
  });
});
