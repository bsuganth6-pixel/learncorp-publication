'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getAdminAuthors } from '@/lib/api-client';
import type { Author } from '@/lib/types';
import PageHeader from '@/components/admin/PageHeader';
import AuthorForm from '@/components/admin/AuthorForm';

export default function EditAuthorPage({ params }: { params: { id: string } }) {
  const [author, setAuthor] = useState<Author | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Author list is small enough to fetch and filter client-side here;
    // avoids needing a separate admin-by-id endpoint for this resource.
    getAdminAuthors({ page: 1 })
      .then((res) => {
        const match = res.data.find((a) => a._id === params.id);
        if (!match) throw new Error('Not found');
        setAuthor(match);
      })
      .catch(() => setError('Could not load this author'));
  }, [params.id]);

  return (
    <div>
      <PageHeader title="Edit Author" description="Update this author's profile." />
      {error && <p className="field-error">{error}</p>}
      {!author && !error && (
        <p className="flex items-center gap-2 text-sm text-ink-soft"><Loader2 size={14} className="animate-spin" /> Loading…</p>
      )}
      {author && <AuthorForm author={author} />}
    </div>
  );
}
