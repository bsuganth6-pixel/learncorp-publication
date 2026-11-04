import type { Metadata } from 'next';
import AccountSettings from '@/components/author/AccountSettings';
import { requireUser } from '@/lib/server-auth';

export const metadata: Metadata = { title: 'Account & security', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await requireUser('/login');
  return (
    <div className="container-page py-10 sm:py-14">
      <AccountSettings initialUser={user} />
    </div>
  );
}
