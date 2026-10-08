import jwt from 'jsonwebtoken';
import { setAuthCookie, clearAuthCookie, signToken } from '../generateToken';

const fakeRes = () => ({ cookie: jest.fn(), clearCookie: jest.fn() }) as unknown as { cookie: jest.Mock; clearCookie: jest.Mock };
const original = process.env.NODE_ENV;
afterEach(() => { process.env.NODE_ENV = original; });

describe('session cookie', () => {
  it('is httpOnly, SameSite=strict, path=/, host-only, ~7 days', () => {
    const res = fakeRes();
    setAuthCookie(res as never, 'tok');
    const [name, value, opts] = res.cookie.mock.calls[0];
    expect(name).toBe('bp_session');
    expect(value).toBe('tok');
    expect(opts).toMatchObject({ httpOnly: true, sameSite: 'strict', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 });
    expect(opts.domain).toBeUndefined();
  });

  it('is Secure in production and not otherwise', () => {
    const prod = fakeRes();
    process.env.NODE_ENV = 'production';
    setAuthCookie(prod as never, 't');
    expect(prod.cookie.mock.calls[0][2].secure).toBe(true);
    const dev = fakeRes();
    process.env.NODE_ENV = 'development';
    setAuthCookie(dev as never, 't');
    expect(dev.cookie.mock.calls[0][2].secure).toBe(false);
  });

  it('clearing uses matching attributes so the browser actually removes it', () => {
    const res = fakeRes();
    clearAuthCookie(res as never);
    expect(res.clearCookie.mock.calls[0][1]).toMatchObject({ httpOnly: true, sameSite: 'strict', path: '/' });
  });
});

describe('signToken', () => {
  it('signs id+role with the configured secret and expiry', () => {
    const decoded = jwt.verify(signToken({ id: 'abc', role: 'admin' }), process.env.JWT_SECRET as string) as jwt.JwtPayload;
    expect(decoded).toMatchObject({ id: 'abc', role: 'admin' });
    expect(decoded.exp! - decoded.iat!).toBe(7 * 24 * 60 * 60);
  });

  it('refuses to sign when JWT_SECRET is missing (never falls back to a default)', () => {
    const saved = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    expect(() => signToken({ id: 'a', role: 'admin' })).toThrow(/JWT_SECRET/);
    process.env.JWT_SECRET = saved;
  });
});
