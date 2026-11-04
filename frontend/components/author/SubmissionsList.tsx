'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getMySubmissions } from '@/lib/api-client';
import { MANUSCRIPT_STATUSES } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import type { AuthorSubmission } from '@/lib/types';
import Alert from '@/components/ui/Alert';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import AdminPager from '@/components/admin/AdminPager';

export default function SubmissionsList() {
  const [items, setItems] = useState<AuthorSubmission[] | null>(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    getMySubmissions({ page, limit: 10, status: status || undefined })
      .then((res) => { setItems(res.data); setPages(res.pagination.pages); })
      .catch(() => { setItems([]); setError(true); });
  }, [page, status]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">My submissions</h1>
          <p className="mt-1 text-sm text-ink-soft">Every manuscript you’ve sent us, and where it stands.</p>
        </div>
        <div>
          <label htmlFor="status-filter" className="sr-only">Filter by status</label>
          <select id="status-filter" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="field-input w-auto">
            <option value="">All statuses</option>
            {MANUSCRIPT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {error && <Alert tone="error" className="mt-6">We couldn’t load your submissions. Please try again.</Alert>}

      <div className="mt-6">
        {items === null ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : items.length === 0 && !error ? (
          <EmptyState
            title={status ? 'No submissions with that status' : 'No submissions yet'}
            description={status ? 'Try another status filter.' : 'When you submit a manuscript it will appear here.'}
          />
        ) : (
          <ul className="space-y-3">
            {items.map((s) => (
              <li key={s.id}>
                <Link href={`/author/submissions/${s.id}`} className="flex items-center justify-between gap-4 rounded-sm border border-rule bg-surface p-4 shadow-card transition-colors hover:border-ink/30 sm:p-5">
                  <span className="min-w-0">
                    <span className="block truncate font-display text-lg text-ink">{s.bookTitle}</span>
                    <span className="mt-1 block text-sm text-ink-soft">
                      {s.category} · {s.format} · Submitted {formatDate(s.createdAt)}
                      {s.version > 1 ? ` · Version ${s.version}` : ''}
                    </span>
                    <span className="mt-3 flex flex-wrap items-center gap-3">
                      <StatusBadge status={s.status} />
                      {s.canResubmit && <span className="text-xs font-medium text-ink">Your edits are needed</span>}
                    </span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-ink-soft" aria-hidden="true" />
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
