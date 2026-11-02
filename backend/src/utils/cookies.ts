import { Response } from 'express';
import { AUTH_HINT_COOKIE, isProduction, sessionCookieName } from '../config/auth';
import type { IssuedSession } from '../services/sessionService';
import type { SessionScope } from '../models/Session';

/**
 * Two cookies:
 *  - the session cookie: opaque random token, HttpOnly (invisible to scripts), Secure in production.
 *    Admin sessions are SameSite=Strict; author sessions are Lax so a link in one of our emails
 *    ("view your feedback") still arrives signed in.
 *  - a hint cookie holding just "author" or "admin". It is readable by the page so the UI can skip
 *    asking the API who is signed in when nobody is. It grants nothing: the API never reads it.
 */
export function setSessionCookies(res: Response, issued: IssuedSession, scope: SessionScope): void {
  const shared = { secure: isProduction(), path: '/', ...(issued.cookieMaxAgeMs ? { maxAge: issued.cookieMaxAgeMs } : {}) };
  res.cookie(sessionCookieName(), issued.token, { ...shared, httpOnly: true, sameSite: scope === 'admin' ? 'strict' : 'lax' });
  res.cookie(AUTH_HINT_COOKIE, scope, { ...shared, httpOnly: false, sameSite: 'lax' });
}

export function clearSessionCookies(res: Response): void {
  const shared = { secure: isProduction(), path: '/' };
  res.clearCookie(sessionCookieName(), { ...shared, httpOnly: true, sameSite: 'lax' });
  res.clearCookie(AUTH_HINT_COOKIE, { ...shared, httpOnly: false, sameSite: 'lax' });
}
