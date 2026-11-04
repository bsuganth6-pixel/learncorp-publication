'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCheck } from 'lucide-react';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { cn, formatDate } from '@/lib/utils';
import type { AppNotification } from '@/lib/types';
import Alert from '@/components/ui/Alert';
import EmptyState from '@/components/ui/EmptyState';
import AdminPager from '@/components/admin/AdminPager';

export default function NotificationsList() {
  const { refresh } = useAuth();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    getNotifications({ page, limit: 15 })
      .then((res) => { setItems(res.data); setUnread(res.unreadCount); setPages(res.pagination.pages); })
      .catch(() => { setItems([]); setError(true); });
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const open = async (n: AppNotification) => {
    if (n.read) return;
    setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? null);
    setUnread((u) => Math.max(0, u - 1));
    try { await markNotificationRead(n.id); void refresh(); } catch { /* the link still works; the badge corrects itself on the next load */ }
  };

  const markAll = async () => {
    await markAllNotificationsRead().catch(() => undefined);
    setItems((prev) => prev?.map((x) => ({ ...x, read: true })) ?? null);
    setUnread(0);
    void refresh();
  };

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">Notifications</h1>
          <p className="mt-1 text-sm text-ink-soft">{unread > 0 ? `${unread} unread` : 'You’re all caught up.'}</p>
        </div>
        {unread > 0 && <button type="button" onClick={markAll} className="btn-outline px-4 py-2 text-sm"><CheckCheck size={15} aria-hidden="true" /> Mark all as read</button>}
      </div>

      {error && <Alert tone="error" className="mt-6">We couldn’t load your notifications. Please try again.</Alert>}

      <div className="mt-6">
        {items === null ? <p className="text-sm text-ink-soft">Loading…</p> : items.length === 0 && !error ? (
          <EmptyState title="No notifications yet" description="Updates about your submissions will appear here." />
        ) : (
          <ul className="space-y-2">
            {items.map((n) => (
              <li key={n.id}>
                <Link
                  href={n.link ?? '/author/dashboard'}
                  onClick={() => open(n)}
                  className={cn('block rounded-sm border p-4 transition-colors hover:border-ink/30', n.read ? 'border-rule bg-surface' : 'border-gold/40 bg-gold/5')}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-medium text-ink">
                      {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-gold" aria-label="Unread" />}
                      {n.title}
                    </span>
                    <time dateTime={n.createdAt} className="shrink-0 text-xs text-ink-soft">{formatDate(n.createdAt)}</time>
                  </span>
                  <span className="mt-1 block text-sm text-ink-soft">{n.message}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AdminPager page={page} pages={pages} onChange={setPage} />
    </div>
  );
}
