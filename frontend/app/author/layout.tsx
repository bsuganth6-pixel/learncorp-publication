import type { Metadata } from 'next';
import AuthorNav from '@/components/author/AuthorNav';
import { requireRole } from '@/lib/server-auth';

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Rendered per request: whether you may see this area depends on who you are, not on the build.
export const dynamic = 'force-dynamic';

export default async function AuthorLayout({ children }: { children: React.ReactNode }) {
  // The real gate. A missing, expired or non-author session never gets as far as the page.
  await requireRole('author', '/login');
  return (
    <>
      <AuthorNav />
      <div className="container-page py-8 sm:py-12">{children}</div>
    </>
  );
}
