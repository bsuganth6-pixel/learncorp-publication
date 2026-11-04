'use client';

import { Suspense, useEffect, useRef, useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogoMark } from '@/components/brand/Logo';
import { Loader2 } from 'lucide-react';
import { adminLogin, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { isAdminRole } from '@/lib/roles';
import { safeAdminRedirect } from '@/lib/safe-redirect';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const leaving = useRef(false);

  // An administrator who is already signed in goes straight through.
  useEffect(() => {
    if (state.status === 'authenticated' && isAdminRole(state.user.role) && !leaving.current) {
      leaving.current = true;
      router.replace(safeAdminRedirect(searchParams.get('next')));
    }
  }, [state, router, searchParams]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await adminLogin(email, password);
      leaving.current = true;
      setUser(data);
      router.replace(safeAdminRedirect(searchParams.get('next')));
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to sign in right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-sm border border-paper/10 bg-surface p-8 shadow-card">
        <div className="flex flex-col items-center text-center">
          <LogoMark className="h-12 w-auto" alt="LearnCorp Publication" />
          <h1 className="mt-4 font-display text-xl text-ink">Administrator sign-in</h1>
          <p className="mt-1 text-sm text-ink-soft">LearnCorp Publication dashboard</p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="field-label" htmlFor="email">Email</label>
            <input id="email" type="email" required autoComplete="username" className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="password">Password</label>
            <input id="password" type="password" required autoComplete="current-password" className="field-input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          {error && <p role="alert" className="field-error">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            Sign in
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-paper/60">
        Publishing a book? <Link href="/login" className="font-medium text-gold-light underline underline-offset-2">Author sign-in</Link>
      </p>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
