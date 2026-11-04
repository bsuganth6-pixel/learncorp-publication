import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { AuthUser, Role } from './types';
import { homeFor, isAdminRole } from './roles';

const COOKIE_NAME = process.env.COOKIE_NAME || 'bp_session';
const API_ORIGIN = (process.env.API_ORIGIN || 'http://localhost:5000').replace(/\/$/, '');

/**
 * The signed-in account, asked of the API with the visitor's own cookie. This is what actually
 * guards the author and admin areas: a forged or expired cookie gets null here, whatever the
 * browser claims. A sleeping or failing API throws instead of returning null, so an outage never
 * looks like "you were signed out".
 */
export async function getServerUser(): Promise<AuthUser | null> {
  const store = await cookies();
  if (!store.has(COOKIE_NAME)) return null;

  const res = await fetch(`${API_ORIGIN}/api/auth/me`, {
    headers: { cookie: store.toString() },
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) throw new Error(`Could not verify your session (API responded ${res.status}).`);
  return ((await res.json()) as { data: AuthUser }).data;
}

/** Path the visitor asked for (set by middleware), so a sign-in can bring them straight back. */
async function requestedPath(): Promise<string> {
  return (await headers()).get('x-pathname') || '';
}

/**
 * Gate for a protected area. Not signed in -> its login page (remembering where they were going);
 * signed in with the wrong kind of account -> their own home. Returns the verified user.
 */
export async function requireRole(allowed: 'author' | 'admin', loginPath: string): Promise<AuthUser> {
  const user = await getServerUser();
  if (!user) {
    const next = await requestedPath();
    redirect(next ? `${loginPath}?next=${encodeURIComponent(next)}` : loginPath);
  }
  const permitted = allowed === 'admin' ? isAdminRole(user.role) : user.role === ('author' as Role);
  if (!permitted) redirect(homeFor(user.role));
  return user;
}

/** Any signed-in account (used by /account). */
export async function requireUser(loginPath = '/login'): Promise<AuthUser> {
  const user = await getServerUser();
  if (!user) {
    const next = await requestedPath();
    redirect(next ? `${loginPath}?next=${encodeURIComponent(next)}` : loginPath);
  }
  return user;
}
