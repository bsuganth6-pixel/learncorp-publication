import type { Metadata } from 'next';
import { Suspense } from 'react';
import AuthorDashboard from '@/components/author/AuthorDashboard';

export const metadata: Metadata = { title: 'Author dashboard' };

export default function Page() {
  return <Suspense fallback={null}><AuthorDashboard /></Suspense>;
}
