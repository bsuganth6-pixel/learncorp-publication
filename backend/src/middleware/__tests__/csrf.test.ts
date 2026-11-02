import { Request, Response } from 'express';
import { csrfGuard } from '../csrf';

const run = (opts: { method?: string; origin?: string; cookie?: boolean; header?: string }) => {
  const headers: Record<string, string | undefined> = { origin: opts.origin, 'x-requested-with': opts.header };
  const req = {
    method: opts.method ?? 'POST',
    get: (name: string) => headers[name.toLowerCase()],
    cookies: opts.cookie ? { bp_session: 'abc' } : {},
  } as unknown as Request;
  const next = jest.fn();
  let error: { statusCode?: number } | undefined;
  try { csrfGuard(req, {} as Response, next); } catch (e) { error = e as { statusCode?: number }; }
  return { passed: next.mock.calls.length === 1, status: error?.statusCode };
};

describe('csrfGuard', () => {
  it.each(['GET', 'HEAD', 'OPTIONS'])('lets %s through whatever the origin', (method) => {
    expect(run({ method, origin: 'https://evil.example', cookie: true }).passed).toBe(true);
  });

  it('blocks a write from another origin, even without a cookie (login CSRF)', () => {
    expect(run({ origin: 'https://evil.example' })).toEqual({ passed: false, status: 403 });
    expect(run({ origin: 'null' })).toEqual({ passed: false, status: 403 });
  });

  it('blocks a cookie-authenticated write that lacks the client header', () => {
    expect(run({ cookie: true, origin: 'http://localhost:3000' })).toEqual({ passed: false, status: 403 });
    expect(run({ cookie: true, header: 'XMLHttpRequest' })).toEqual({ passed: false, status: 403 });
  });

  it('allows our own origin with the header, and cookie-less writes with no origin (API clients, SSR)', () => {
    expect(run({ cookie: true, origin: 'http://localhost:3000', header: 'LearnCorp' }).passed).toBe(true);
    expect(run({}).passed).toBe(true);
  });

  it('accepts every origin listed in CLIENT_URL', () => {
    const previous = process.env.CLIENT_URL;
    process.env.CLIENT_URL = 'https://learncorp.example, https://learncorp.vercel.app/';
    try {
      expect(run({ origin: 'https://learncorp.vercel.app', cookie: true, header: 'LearnCorp' }).passed).toBe(true);
      expect(run({ origin: 'https://learncorp.example', cookie: true, header: 'LearnCorp' }).passed).toBe(true);
      expect(run({ origin: 'http://localhost:3000', cookie: true, header: 'LearnCorp' }).status).toBe(403);
    } finally {
      process.env.CLIENT_URL = previous;
    }
  });
});
