'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { isAdminRole } from '@/lib/roles';
import Alert from '@/components/ui/Alert';
import ManuscriptForm from '@/components/forms/ManuscriptForm';
import ResendVerification from './ResendVerification';

/** The submission form, shown only to a signed-in author with a confirmed email. Everyone else is told what to do next. */
export default function PublishGate() {
  const { state } = useAuth();

  if (state.status === 'loading') {
    return <p className="flex items-center gap-2 py-10 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Checking your account…</p>;
  }

  if (state.status === 'guest') {
    return (
      <div className="max-w-xl space-y-5">
        <p className="text-sm leading-relaxed text-ink-soft">
          Submissions go through a free author account, so you can follow your manuscript’s progress, read the editors’ feedback and
          resubmit if changes are requested.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/register?next=%2Fpublish" className="btn-gold">Create an author account</Link>
          <Link href="/login?next=%2Fpublish" className="btn-outline">I already have an account</Link>
        </div>
      </div>
    );
  }

  if (isAdminRole(state.user.role)) {
    return (
      <Alert tone="info" title="You’re signed in as an administrator">
        Administrator accounts review submissions rather than make them. To submit a manuscript, sign out and use an author account.
      </Alert>
    );
  }

  if (!state.user.emailVerified) {
    return (
      <div className="max-w-xl space-y-4">
        <Alert tone="warning" title="Confirm your email to submit">
          We sent a confirmation link to <strong className="text-ink">{state.user.email}</strong>. Open it, then come back here.
        </Alert>
        <ResendVerification compact />
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-ink-soft">Tell us about your book — our editorial team reviews every submission.</p>
      <div className="mt-8"><ManuscriptForm /></div>
    </>
  );
}
