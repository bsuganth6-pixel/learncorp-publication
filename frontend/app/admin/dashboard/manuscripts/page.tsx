'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { getManuscripts } from '@/lib/api-client';
import type { Manuscript } from '@/lib/types';
import PageHeader from '@/components/admin/PageHeader';
import AdminPager from '@/components/admin/AdminPager';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import { MANUSCRIPT_STATUSES } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import TableScroller from '@/components/admin/TableScroller';

export default function AdminManuscriptsPage() {
  const [manuscripts, setManuscripts] = useState<Manuscript[] | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    getManuscripts({ status: statusFilter || undefined, page })
      .then((res) => {
        if (res.data.length === 0 && page > 1) { setPage(page - 1); return; }
        setManuscripts(res.data);
        setPages(res.pagination.pages);
      })
      .catch(() => { setManuscripts([]); setError(true); });
  }, [statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader title="Manuscripts" description="Review submissions, decide, and publish accepted books." />

      <div className="mb-5">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} aria-label="Filter by status" className="field-input w-auto">
          <option value="">All statuses</option>
          {MANUSCRIPT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && <Alert tone="error" className="mb-5">Could not load manuscripts. Please try again.</Alert>}

      {!manuscripts ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : manuscripts.length === 0 && !error ? (
        <EmptyState title="No manuscripts here" />
      ) : (
        <TableScroller label="Manuscripts">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-rule bg-ink/5 text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3">Applicant</th>
                <th className="px-4 py-3">Book title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {manuscripts.map((m) => (
                <tr key={m._id}>
                  <td className="px-4 py-3">
                    <span className="block font-medium text-ink">{m.authorName}</span>
                    <span className="block text-xs text-ink-soft">{m.email}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {m.bookTitle}
                    {(m.version ?? 1) > 1 && <span className="ml-2 align-middle"><Badge tone="gold">Resubmitted v{m.version}</Badge></span>}
                    {!m.author && <span className="ml-2 align-middle" title="Submitted before author accounts existed"><Badge>No account</Badge></span>}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{m.category}</td>
                  <td className="px-4 py-3 text-ink-soft">{formatDate(m.updatedAt ?? m.createdAt)}</td>
                  <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/dashboard/manuscripts/${m._id}`}
                      aria-label={`Review submission: ${m.bookTitle}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-rule text-ink-soft hover:border-ink hover:text-ink"
                    >
                      <Eye size={14} aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroller>
      )}

      <AdminPager page={page} pages={pages} onChange={setPage} />
    </div>
  );
}
