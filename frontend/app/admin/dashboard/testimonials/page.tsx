'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import { getAllTestimonials, deleteTestimonial, ApiClientError } from '@/lib/api-client';
import type { Testimonial } from '@/lib/types';
import PageHeader from '@/components/admin/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    getAllTestimonials({ page: 1 }).then((res) => setTestimonials(res.data)).catch(() => setTestimonials([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  const onDelete = async (id: string) => {
    if (!confirm('Delete this testimonial?')) return;
    setDeletingId(id);
    try {
      await deleteTestimonial(id);
      setTestimonials((prev) => prev?.filter((t) => t._id !== id) || null);
    } catch (err) {
      alert(err instanceof ApiClientError ? err.message : 'Could not delete this testimonial');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Testimonials" description="Manage what shows on the homepage." newHref="/admin/dashboard/testimonials/new" newLabel="Add Testimonial" />

      {!testimonials ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : testimonials.length === 0 ? (
        <EmptyState title="No testimonials yet" />
      ) : (
        <div className="space-y-3">
          {testimonials.map((t) => (
            <div key={t._id} className="flex flex-wrap items-start justify-between gap-4 rounded-sm border border-rule bg-surface p-5 shadow-card">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-ink">{t.name}</p>
                  <Badge tone={t.status === 'published' ? 'success' : 'neutral'}>{t.status}</Badge>
                </div>
                {t.designation && <p className="text-xs text-ink-soft">{t.designation}</p>}
                <p className="mt-2 text-sm text-ink-soft">&ldquo;{t.message}&rdquo;</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/dashboard/testimonials/${t._id}/edit`} className="flex h-8 w-8 items-center justify-center rounded-sm border border-rule text-ink-soft hover:border-ink hover:text-ink">
                  <Pencil size={14} />
                </Link>
                <button type="button" onClick={() => onDelete(t._id)} disabled={deletingId === t._id} className="flex h-8 w-8 items-center justify-center rounded-sm border border-rule text-danger hover:border-danger">
                  {deletingId === t._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
