import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import AuthShell from '@/components/auth/AuthShell';
import RegisterForm from '@/components/auth/RegisterForm';

export const metadata: Metadata = { title: 'Create an account', robots: { index: false, follow: false } };

export default function Page() {
  return (
    <AuthShell
      title="Create your author account"
      subtitle="Submit manuscripts, follow their progress and hear back from our editors — all in one place."
      footer={<p>Already have an account? <Link href="/login" className="font-medium text-gold hover:underline">Sign in</Link></p>}
    >
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
