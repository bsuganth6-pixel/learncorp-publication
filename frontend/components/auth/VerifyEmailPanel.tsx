'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, MailCheck } from 'lucide-react';
import { verifyEmail, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { homeFor } from '@/lib/roles';
import Alert from '@/components/ui/Alert';
import ResendVerification from '@/components/author/ResendVerification';

type Phase = 'verifying' | 'done' | 'failed' | 'no-token';

export default function VerifyEmailPanel() {
  const token = useSearchParams().get('token');
  const { state, refresh } = useAuth();
  const [phase, setPhase] = useState<Phase>(token ? 'verifying' : 'no-token');
  const [message, setMessage] = useState('');
  // The link is single-use: React's dev double-invocation of effects must not spend it twice.
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    verifyEmail(token)
      .then(async () => {
        setPhase('done');
        if (state.status === 'authenticated') await refresh(); // unlock the author area without a second sign-in
      })
      .catch((err) => {
        setMessage(err instanceof ApiClientError ? err.message : 'We couldn’t confirm your email. Please try again.');
        setPhase('failed');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (phase === 'verifying') {
    return <p className="flex items-center gap-2 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Confirming your email…</p>;
  }

  if (phase === 'done') {
    return (
      <div className="space-y-5">
        <Alert tone="success" title="Email confirmed">Thanks — your account is fully active and you can now submit manuscripts.</Alert>
        <Link href={state.status === 'authenticated' ? homeFor(state.user.role) : '/login'} className="btn-gold w-full">
          {state.status === 'authenticated' ? 'Go to my dashboard' : 'Sign in'}
        </Link>
      </div>
    );
  }

  if (phase === 'failed') {
    return (
      <div className="space-y-5">
        <Alert tone="error" title="This link can’t be used">{message}</Alert>
        {state.status === 'authenticated' ? <ResendVerification /> : <Link href="/login?next=/author/dashboard" className="btn-primary w-full">Sign in to request a new link</Link>}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 text-sm text-ink-soft">
        <MailCheck size={20} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
        <p>Open the confirmation link we emailed you. It works for 24 hours.</p>
      </div>
      {state.status === 'authenticated' ? <ResendVerification /> : <Link href="/login" className="btn-primary w-full">Sign in</Link>}
    </div>
  );
}
