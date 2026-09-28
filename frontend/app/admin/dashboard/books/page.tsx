'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import { getAdminBooks, deleteBook, ApiClientError } from '@/lib/api-client';
import type { Book } from '@/lib/types';
import PageHeader from '@/components/admin/PageHeader';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { formatPrice } from '@/lib/utils';

export default function AdminBooksPage() {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    getAdminBooks({ limit: 50 }).then((res) => setBooks(res.data)).catch(() => setError('Could not load books'));
  }, []);

  useEffect(() => { load(); }, [load]);

  const onDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This can't be undone.`)) return;
    setDeletingId(id);
    try {
      await deleteBook(id);
      setBooks((prev) => prev?.filter((b) => b._id !== id) || null);
    } catch (err) {
      alert(err instanceof ApiClientError ? err.message : 'Could not delete this book');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Books" description="Manage the catalogue." newHref="/admin/dashboard/books/new" newLabel="Add Book" />

      {error && <p className="field-error">{error}</p>}

      {!books ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : books.length === 0 ? (
        <EmptyState title="No books yet" description="Add your first book to populate the catalogue." />
      ) : (
        <div className="overflow-x-auto rounded-sm border border-rule bg-surface">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-rule bg-ink/5 text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3">Book</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {books.map((book) => (
                <tr key={book._id}>
                  <td className="flex items-center gap-3 px-4 py-3">
                    <span className="relative h-12 w-9 shrink-0 overflow-hidden rounded-sm bg-ink/5">
                      <Image src={book.coverImageUrl} alt="" fill className="object-cover" />
                    </span>
                    <div>
                      <p className="font-medium text-ink">{book.title}</p>
                      <p className="text-xs text-ink-soft">{book.authors?.map((a) => a.name).join(', ')}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{book.category}</td>
                  <td className="px-4 py-3 text-ink-soft">{formatPrice(book.price)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={book.status === 'published' ? 'success' : 'neutral'}>{book.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/dashboard/books/${book._id}/edit`}
                        className="flex h-8 w-8 items-center justify-center rounded-sm border border-rule text-ink-soft hover:border-ink hover:text-ink"
                      >
                        <Pencil size={14} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => onDelete(book._id, book.title)}
                        disabled={deletingId === book._id}
                        className="flex h-8 w-8 items-center justify-center rounded-sm border border-rule text-danger hover:border-danger"
                      >
                        {deletingId === book._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
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
