'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Sidebar from '@/components/admin/Sidebar';
import { getMe } from '@/lib/api-client';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) router.replace('/admin/login');
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <Loader2 size={24} className="animate-spin text-ink-soft" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper lg:pl-60">
      <Sidebar />
      <div className="p-5 sm:p-8">{children}</div>
    </div>
  );
}
