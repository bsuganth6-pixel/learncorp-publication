'use client';

import { useState } from 'react';
import { Loader2, UploadCloud } from 'lucide-react';
import { publishManuscript, uploadImage, ApiClientError } from '@/lib/api-client';
import type { Manuscript } from '@/lib/types';
import Alert from '@/components/ui/Alert';

/**
 * Accepted -> Published. The editor supplies what only the publisher knows (ISBN, price). The title,
 * description, category and the author's own cover come from the submission; a different cover can be
 * uploaded instead.
 */
export default function PublishPanel({ manuscript, onPublished }: { manuscript: Manuscript; onPublished: () => void }) {
  const hasAuthorCover = Boolean(manuscript.coverFileUrl);
  const [isbn, setIsbn] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState('');
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  const validate = (): Record<string, string> => {
    const found: Record<string, string> = {};
    if (isbn.trim().length < 10) found.isbn = 'Enter the ISBN (10 or 13 digits).';
    if (price === '' || Number(price) < 0 || Number.isNaN(Number(price))) found.price = 'Enter a price (0 or more).';
    if (!hasAuthorCover && !cover) found.cover = 'This submission has no cover. Upload one to publish.';
    return found;
  };

  const onPublish = async () => {
    const found = validate();
    setErrors(found);
    setServerError('');
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    try {
      const coverImageUrl = cover ? (await uploadImage(cover)).url : undefined;
      await publishManuscript(manuscript._id, {
        isbn: isbn.trim(),
        price: Number(price),
        ...(date ? { publicationDate: new Date(date).toISOString() } : {}),
        ...(coverImageUrl ? { coverImageUrl } : {}),
      });
      // The page reloads the manuscript, which is now Published, and swaps this form for the confirmation
      // (with the link to the live book). The button stays busy until then so it can't be pressed twice.
      onPublished();
    } catch (err) {
      if (err instanceof ApiClientError && Object.keys(err.fieldErrors).length > 0) setErrors(err.fieldErrors);
      else setServerError(err instanceof ApiClientError ? err.message : 'Could not publish this manuscript.');
      setBusy(false);
    }
  };

  return (
    <section className="mt-8 rounded-sm border border-gold/40 bg-gold/5 p-5" aria-labelledby="publish-heading">
      <h2 id="publish-heading" className="font-display text-lg text-ink">Publish to the catalogue</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Creates the book entry from this submission and an author profile if this is their first book. Fill in what only the publisher knows.
      </p>

      {serverError && <Alert tone="error" className="mt-4">{serverError}</Alert>}

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="pub-isbn" className="field-label">ISBN</label>
          <input id="pub-isbn" value={isbn} onChange={(e) => setIsbn(e.target.value)} className="field-input" inputMode="numeric" aria-invalid={errors.isbn ? true : undefined} />
          {errors.isbn && <p role="alert" className="field-error">{errors.isbn}</p>}
        </div>
        <div>
          <label htmlFor="pub-price" className="field-label">Price</label>
          <input id="pub-price" type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="field-input" aria-invalid={errors.price ? true : undefined} />
          {errors.price && <p role="alert" className="field-error">{errors.price}</p>}
        </div>
        <div>
          <label htmlFor="pub-date" className="field-label">Publication date</label>
          <input id="pub-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field-input" />
          <p className="mt-1 text-xs text-ink-soft">Defaults to today.</p>
        </div>
        <div className="sm:col-span-3">
          <label htmlFor="pub-cover" className="field-label">Cover image {hasAuthorCover ? '(optional)' : ''}</label>
          <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-dashed border-rule bg-surface px-3.5 py-3 text-sm text-ink-soft focus-within:border-ink hover:border-ink">
            <UploadCloud size={16} aria-hidden="true" />
            <span className="truncate">{cover ? cover.name : hasAuthorCover ? 'Use the author’s cover, or choose another' : 'Choose a cover (PNG or JPEG)'}</span>
            <input id="pub-cover" type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(e) => setCover(e.target.files?.[0] || null)} />
          </label>
          {errors.cover && <p role="alert" className="field-error">{errors.cover}</p>}
        </div>
      </div>

      <button type="button" onClick={onPublish} disabled={busy} className="btn-gold mt-5">
        {busy && <Loader2 size={15} className="animate-spin" aria-hidden="true" />} Publish book
      </button>
    </section>
  );
}
