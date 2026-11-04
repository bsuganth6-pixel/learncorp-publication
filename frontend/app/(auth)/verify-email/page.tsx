import type { Metadata } from 'next';
import { Suspense } from 'react';
import AuthShell from '@/components/auth/AuthShell';
import VerifyEmailPanel from '@/components/auth/VerifyEmailPanel';

export const metadata: Metadata = { title: 'Confirm email', robots: { index: false, follow: false } };

export default function Page() {
  return (
    <AuthShell
      title="Confirm your email"
      subtitle="One quick step before you can submit a manuscript."
    >
      <Suspense fallback={null}>
        <VerifyEmailPanel />
      </Suspense>
    </AuthShell>
  );
}
