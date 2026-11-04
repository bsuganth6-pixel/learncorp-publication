import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import AuthShell from '@/components/auth/AuthShell';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

export const metadata: Metadata = { title: 'Forgot password', robots: { index: false, follow: false } };

export default function Page() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email you registered with and we’ll send you a link to choose a new password."
      footer={<p>Remembered it? <Link href="/login" className="font-medium text-gold hover:underline">Back to sign in</Link></p>}
    >
      <Suspense fallback={null}>
        <ForgotPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
