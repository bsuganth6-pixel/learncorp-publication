import Sidebar from '@/components/admin/Sidebar';
import { requireRole } from '@/lib/server-auth';

// Rendered per request, and gated on the server: a missing, expired, or non-admin session never reaches the page.
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('admin', '/admin/login');
  return (
    <div className="min-h-screen bg-paper lg:pl-60">
      <Sidebar user={user} />
      <div className="p-5 sm:p-8">{children}</div>
    </div>
  );
}
