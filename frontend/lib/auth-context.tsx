'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getMe, logout as apiLogout, UNAUTHORIZED_EVENT } from './api-client';
import type { AuthUser } from './types';

/** Readable companion cookie the API sets on sign-in ("author" | "admin"). Only a hint to skip a pointless request. */
export const AUTH_HINT_COOKIE = 'bp_auth';

type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'guest'; user: null }
  | { status: 'authenticated'; user: AuthUser };

interface AuthContextValue {
  state: AuthState;
  /** Ask the API who is signed in (after signing in, or after changing the account). */
  refresh: () => Promise<AuthUser | null>;
  /** Replace the cached user (e.g. after a profile edit) without another request. */
  setUser: (user: AuthUser) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const hasHint = (): boolean =>
  typeof document !== 'undefined' && document.cookie.split(';').some((c) => c.trim().startsWith(`${AUTH_HINT_COOKIE}=`));

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });

  const refresh = useCallback(async () => {
    try {
      const { data } = await getMe();
      setState({ status: 'authenticated', user: data });
      return data;
    } catch {
      setState({ status: 'guest', user: null });
      return null;
    }
  }, []);

  useEffect(() => {
    // Visitors who never signed in make no API call at all.
    if (hasHint()) void refresh();
    else setState({ status: 'guest', user: null });
  }, [refresh]);

  // Any request the API rejects as "not signed in" (session ended, revoked, suspended) drops the UI to guest.
  useEffect(() => {
    const onUnauthorized = () => setState({ status: 'guest', user: null });
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const setUser = useCallback((user: AuthUser) => setState({ status: 'authenticated', user }), []);

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setState({ status: 'guest', user: null });
    }
  }, []);

  const value = useMemo(() => ({ state, refresh, setUser, signOut }), [state, refresh, setUser, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
