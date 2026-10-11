'use client';

import { useState, FormEvent } from 'react';
import { Star, Trash2, Loader2, Plus } from 'lucide-react';
import { addBookReview, deleteBookReview, ApiClientError } from '@/lib/api-client';
import type { Review } from '@/lib/types';

export default function ReviewsManager({ bookId, initialReviews }: { bookId: string; initialReviews: Review[] }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [error, setError] = useState('');

  const onAdd = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await addBookReview(bookId, { name, rating, comment });
      setReviews(res.data.reviews);
      setName('');
      setComment('');
      setRating(5);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not add this review');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (index: number) => {
    setDeletingIndex(index);
    try {
      const res = await deleteBookReview(bookId, index);
      setReviews(res.data.reviews);
    } catch (err) {
      alert(err instanceof ApiClientError ? err.message : 'Could not remove this review');
    } finally {
      setDeletingIndex(null);
    }
  };

  return (
    <div className="max-w-3xl rounded-sm border border-rule bg-surface p-6">
      <h2 className="font-display text-lg text-ink">Reviews</h2>
      <p className="mt-1 text-xs text-ink-soft">
        Curated reviews shown on the public book page — there&apos;s no public account system yet, so these are added here directly.
      </p>

      {reviews.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">No reviews yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {reviews.map((r, i) => (
            <li key={i} className="flex items-start justify-between gap-3 border-b border-rule pb-3 last:border-none">
              <div>
                <div className="flex items-center gap-1.5">
                  <div className="flex text-gold" aria-label={`${r.rating} out of 5`}>
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} size={12} fill={s < r.rating ? 'currentColor' : 'none'} aria-hidden="true" />
                    ))}
                  </div>
                  <span className="text-xs font-medium text-ink">{r.name}</span>
                </div>
                <p className="mt-1 text-sm text-ink-soft">{r.comment}</p>
              </div>
              <button
                type="button"
                onClick={() => onDelete(i)}
                disabled={deletingIndex === i}
                aria-label={`Delete review from ${r.name}`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-rule text-danger hover:border-danger"
              >
                {deletingIndex === i ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={onAdd} className="mt-5 space-y-3 border-t border-rule pt-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input required placeholder="Reviewer name" aria-label="Reviewer name" value={name} onChange={(e) => setName(e.target.value)} className="field-input" />
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))} aria-label="Rating" className="field-input w-auto">
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
          </select>
        </div>
        <textarea required rows={2} placeholder="Review text" aria-label="Review text" value={comment} onChange={(e) => setComment(e.target.value)} className="field-input" />
        {error && <p role="alert" className="field-error">{error}</p>}
        <button type="submit" disabled={saving} className="btn-outline text-sm">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Add Review
        </button>
      </form>
    </div>
  );
}
