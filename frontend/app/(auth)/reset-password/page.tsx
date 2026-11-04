import type { Metadata } from 'next';
import { Suspense } from 'react';
import AuthShell from '@/components/auth/AuthShell';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

export const metadata: Metadata = { title: 'Reset password', robots: { index: false, follow: false } };

export default function Page() {
  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Pick something long and unique — a short phrase of several words works well."
    >
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
