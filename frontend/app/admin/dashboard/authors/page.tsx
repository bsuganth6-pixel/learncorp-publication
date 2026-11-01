'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import { getAdminAuthors, deleteAuthor, ApiClientError } from '@/lib/api-client';
import type { Author } from '@/lib/types';
import PageHeader from '@/components/admin/PageHeader';
import AdminPager from '@/components/admin/AdminPager';
import EmptyState from '@/components/ui/EmptyState';
import { initials } from '@/lib/utils';

export default function AdminAuthorsPage() {
  const [authors, setAuthors] = useState<Author[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const load = useCallback(() => {
    getAdminAuthors({ page })
      .then((res) => {
        // Deleting the last item on a page leaves it empty: step back instead of showing an empty state.
        if (res.data.length === 0 && page > 1) { setPage(page - 1); return; }
        setAuthors(res.data);
        setPages(res.pagination.pages);
      })
      .catch(() => setAuthors([]));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const onDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    setDeletingId(id);
    try {
      await deleteAuthor(id);
      load();
    } catch (err) {
      alert(err instanceof ApiClientError ? err.message : 'Could not delete this author');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Authors" description="Manage author profiles." newHref="/admin/dashboard/authors/new" newLabel="Add Author" />

      {!authors ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : authors.length === 0 ? (
        <EmptyState title="No authors yet" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {authors.map((author) => (
            <div key={author._id} className="flex items-center gap-3 rounded-sm border border-rule bg-surface p-4 shadow-card">
              <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-ink/5">
                {author.photoUrl ? (
                  <Image src={author.photoUrl} alt="" fill className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs font-medium text-ink-soft">
                    {initials(author.name)}
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{author.name}</p>
              </div>
              <Link href={`/admin/dashboard/authors/${author._id}/edit`} aria-label={`Edit ${author.name}`} className="flex h-8 w-8 items-center justify-center rounded-sm border border-rule text-ink-soft hover:border-ink hover:text-ink">
                <Pencil size={14} />
              </Link>
              <button
                type="button"
                onClick={() => onDelete(author._id, author.name)}
                disabled={deletingId === author._id}
                aria-label={`Delete ${author.name}`}
                className="flex h-8 w-8 items-center justify-center rounded-sm border border-rule text-danger hover:border-danger"
              >
                {deletingId === author._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}

      <AdminPager page={page} pages={pages} onChange={setPage} />
    </div>
  );
}
