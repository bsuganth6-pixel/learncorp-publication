import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import AuthShell from '@/components/auth/AuthShell';
import LoginForm from '@/components/auth/LoginForm';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false, follow: false } };

export default function Page() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to track your submissions and read feedback from our editors."
      footer={<><p>New to LearnCorp? <Link href="/register" className="font-medium text-gold hover:underline">Create an author account</Link></p><p className="mt-2">Staff member? <Link href="/admin/login" className="font-medium text-ink hover:underline">Administrator sign-in</Link></p></>}
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
