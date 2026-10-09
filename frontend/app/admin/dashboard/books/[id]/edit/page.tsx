'use client';

import { use, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getAdminBookById } from '@/lib/api-client';
import type { Book } from '@/lib/types';
import PageHeader from '@/components/admin/PageHeader';
import BookForm from '@/components/admin/BookForm';
import ReviewsManager from '@/components/admin/ReviewsManager';

export default function EditBookPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const [book, setBook] = useState<Book | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminBookById(id)
      .then((res) => setBook(res.data))
      .catch(() => setError('Could not load this book'));
  }, [id]);

  return (
    <div>
      <PageHeader title="Edit Book" description="Update this catalogue entry." />
      {error && <p className="field-error">{error}</p>}
      {!book && !error && (
        <p className="flex items-center gap-2 text-sm text-ink-soft"><Loader2 size={14} className="animate-spin" /> Loading…</p>
      )}
      {book && (
        <div className="space-y-10">
          <BookForm book={book} />
          <ReviewsManager bookId={book._id} initialReviews={book.reviews} />
        </div>
      )}
    </div>
  );
}
