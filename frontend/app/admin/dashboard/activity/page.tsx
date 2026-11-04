'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAuditLog } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';
import type { AuditEntry } from '@/lib/types';
import PageHeader from '@/components/admin/PageHeader';
import AdminPager from '@/components/admin/AdminPager';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

const ACTIONS: Record<string, { label: string; tone: 'neutral' | 'gold' | 'success' | 'danger' | 'warning' }> = {
  'auth.admin_login': { label: 'Admin sign-in', tone: 'neutral' },
  'auth.admin_login_failed': { label: 'Failed admin sign-in', tone: 'danger' },
  'auth.admin_logout': { label: 'Admin sign-out', tone: 'neutral' },
  'user.suspended': { label: 'Account suspended', tone: 'danger' },
  'user.reactivated': { label: 'Account reactivated', tone: 'success' },
  'user.sessions_revoked': { label: 'Sessions revoked', tone: 'warning' },
  'manuscript.status_changed': { label: 'Manuscript decision', tone: 'gold' },
  'manuscript.published': { label: 'Manuscript published', tone: 'success' },
  'manuscript.file_accessed': { label: 'Manuscript file opened', tone: 'neutral' },
  'book.created': { label: 'Book created', tone: 'neutral' },
  'book.updated': { label: 'Book updated', tone: 'neutral' },
  'book.deleted': { label: 'Book deleted', tone: 'danger' },
  'book.review_added': { label: 'Review added', tone: 'neutral' },
  'book.review_deleted': { label: 'Review removed', tone: 'warning' },
  'author.created': { label: 'Author created', tone: 'neutral' },
  'author.updated': { label: 'Author updated', tone: 'neutral' },
  'author.deleted': { label: 'Author deleted', tone: 'danger' },
  'testimonial.created': { label: 'Testimonial added', tone: 'neutral' },
  'testimonial.updated': { label: 'Testimonial updated', tone: 'neutral' },
  'testimonial.deleted': { label: 'Testimonial deleted', tone: 'danger' },
  'message.deleted': { label: 'Message deleted', tone: 'danger' },
};

export default function ActivityLogPage() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(() => {
    setError(false);
    getAuditLog({ page, action: action || undefined, search: query || undefined })
      .then((res) => { setEntries(res.data); setPages(res.pagination.pages); })
      .catch(() => { setEntries([]); setError(true); });
  }, [page, action, query]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader title="Activity log" description="A read-only record of sensitive administrative actions, newest first." />

      <div className="mb-5 flex flex-wrap gap-3">
        <div>
          <label htmlFor="log-search" className="sr-only">Search the log</label>
          <input id="log-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search who or what" className="field-input w-64" />
        </div>
        <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} aria-label="Filter by action" className="field-input w-auto">
          <option value="">All actions</option>
          {Object.entries(ACTIONS).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      {error && <Alert tone="error" className="mb-5">Could not load the activity log. Please try again.</Alert>}

      {!entries ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : entries.length === 0 && !error ? (
        <EmptyState title="Nothing recorded yet" />
      ) : (
        <div className="overflow-x-auto rounded-sm border border-rule bg-surface">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-rule bg-ink/5 text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Who</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {entries.map((e) => {
                const meta = ACTIONS[e.action] ?? { label: e.action, tone: 'neutral' as const };
                return (
                  <tr key={e.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-soft">{formatDateTime(e.createdAt)}</td>
                    <td className="px-4 py-3"><span className="block break-all text-ink">{e.actorEmail}</span>{e.actorRole && <span className="block text-xs text-ink-soft">{e.actorRole}</span>}</td>
                    <td className="px-4 py-3"><Badge tone={meta.tone}>{meta.label}</Badge></td>
                    <td className="px-4 py-3 text-ink-soft">{e.summary}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-soft">{e.ip || '–'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AdminPager page={page} pages={pages} onChange={setPage} />
    </div>
  );
}
