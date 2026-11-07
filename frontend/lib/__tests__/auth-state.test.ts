import { describe, it, expect } from 'vitest';
import { stateAfterLookupFailure, type AuthState } from '../auth-state';
import type { AuthUser } from '../types';

const user = { id: '1', name: 'Asha', email: 'a@example.com', role: 'author' } as AuthUser;
const signedIn: AuthState = { status: 'authenticated', user };

describe('stateAfterLookupFailure', () => {
  it('a 401 means the session ended: signed out', () => {
    expect(stateAfterLookupFailure(signedIn, 401)).toEqual({ status: 'guest', user: null });
  });

  it.each([429, 500, 502, 503, 0])('a %i says nothing about the session: a signed-in person stays signed in', (status) => {
    expect(stateAfterLookupFailure(signedIn, status)).toBe(signedIn);
  });

  it('if we never learned who this is, fall back to guest rather than loading forever', () => {
    expect(stateAfterLookupFailure({ status: 'loading', user: null }, 503)).toEqual({ status: 'guest', user: null });
    expect(stateAfterLookupFailure({ status: 'guest', user: null }, 429)).toEqual({ status: 'guest', user: null });
  });
});
