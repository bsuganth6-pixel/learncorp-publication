import type { AuthUser } from './types';

export type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'guest'; user: null }
  | { status: 'authenticated'; user: AuthUser };

/**
 * What to show after asking the API "who am I?" failed. Only a 401 means the session is gone. A throttled (429),
 * failing (5xx) or unreachable server says nothing about the session, so someone who was signed in stays signed in
 * on screen instead of being shown a "Log in" button they do not need. If we never learned who this is, fall back
 * to guest so the page is not stuck loading.
 */
export function stateAfterLookupFailure(previous: AuthState, status: number): AuthState {
  if (status !== 401 && previous.status === 'authenticated') return previous;
  return { status: 'guest', user: null };
}
