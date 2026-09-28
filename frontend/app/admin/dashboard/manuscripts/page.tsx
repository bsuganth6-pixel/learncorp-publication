'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { getManuscripts, updateManuscriptStatus, ApiClientError } from '@/lib/api-client';
import type { Manuscript } from '@/lib/types';
import PageHeader from '@/components/admin/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { MANUSCRIPT_STATUSES } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

export default function AdminManuscriptsPage() {
  const [manuscripts, setManuscripts] = useState<Manuscript[] | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(() => {
    getManuscripts({ status: statusFilter || undefined })
      .then((res) => setManuscripts(res.data))
      .catch(() => setManuscripts([]));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const onStatusChange = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await updateManuscriptStatus(id, status);
      setManuscripts((prev) => prev?.map((m) => (m._id === id ? { ...m, status: status as Manuscript['status'] } : m)) || null);
    } catch (err) {
      alert(err instanceof ApiClientError ? err.message : 'Could not update status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Manuscripts" description="Review submissions and update their status." />

      <div className="mb-5">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="field-input w-auto">
          <option value="">All statuses</option>
          {MANUSCRIPT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {!manuscripts ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : manuscripts.length === 0 ? (
        <EmptyState title="No manuscripts here" />
      ) : (
        <div className="overflow-x-auto rounded-sm border border-rule bg-surface">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-rule bg-ink/5 text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3">Applicant</th>
                <th className="px-4 py-3">Book Title</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {manuscripts.map((m) => (
                <tr key={m._id}>
                  <td className="px-4 py-3 font-medium text-ink">{m.authorName}</td>
                  <td className="px-4 py-3 text-ink-soft">{m.bookTitle}</td>
                  <td className="px-4 py-3 text-ink-soft">{m.email}</td>
                  <td className="px-4 py-3 text-ink-soft">{formatDate(m.createdAt)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={m.status}
                      disabled={updatingId === m._id}
                      onChange={(e) => onStatusChange(m._id, e.target.value)}
                      className="field-input w-auto py-1.5 text-xs"
                    >
                      {MANUSCRIPT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/dashboard/manuscripts/${m._id}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-rule text-ink-soft hover:border-ink hover:text-ink"
                    >
                      <Eye size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
