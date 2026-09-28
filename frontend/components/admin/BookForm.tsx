'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2, UploadCloud } from 'lucide-react';
import { createBook, updateBook, uploadImage, getAdminAuthors, ApiClientError } from '@/lib/api-client';
import { BOOK_CATEGORIES, BOOK_FORMATS, LANGUAGES } from '@/lib/constants';
import type { Author, Book } from '@/lib/types';

interface Props {
  book?: Book;
}

export default function BookForm({ book }: Props) {
  const router = useRouter();
  const isEdit = Boolean(book);

  const [authors, setAuthors] = useState<Author[]>([]);
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>(book?.authors.map((a) => a._id) || []);
  const [coverUrl, setCoverUrl] = useState(book?.coverImageUrl || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminAuthors({ page: 1 }).then((res) => setAuthors(res.data)).catch(() => setAuthors([]));
  }, []);

  const onCoverChange = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { url } = await uploadImage(file);
      setCoverUrl(url);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Cover upload failed');
    } finally {
      setUploading(false);
    }
  };

  const toggleAuthor = (id: string) => {
    setSelectedAuthors((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const form = new FormData(e.currentTarget);
    if (selectedAuthors.length === 0) {
      setError('Select at least one author');
      return;
    }
    if (!coverUrl) {
      setError('Upload a cover image');
      return;
    }

    const payload = {
      title: String(form.get('title')),
      authors: selectedAuthors,
      description: String(form.get('description')),
      isbn: String(form.get('isbn')),
      category: String(form.get('category')),
      language: String(form.get('language')),
      publicationDate: form.get('publicationDate') ? String(form.get('publicationDate')) : undefined,
      pages: form.get('pages') ? Number(form.get('pages')) : undefined,
      format: String(form.get('format')),
      price: Number(form.get('price')),
      coverImageUrl: coverUrl,
      keywords: String(form.get('keywords') || '').split(',').map((k) => k.trim()).filter(Boolean),
      publisher: String(form.get('publisher') || 'LearnCorp Publication'),
      tableOfContents: String(form.get('tableOfContents') || ''),
      status: String(form.get('status')),
    };

    setSaving(true);
    try {
      if (isEdit && book) {
        await updateBook(book._id, payload);
      } else {
        await createBook(payload);
      }
      router.push('/admin/dashboard/books');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not save this book');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-8">
      <fieldset className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="title">Title</label>
          <input id="title" name="title" required defaultValue={book?.title} className="field-input" />
        </div>

        <div className="sm:col-span-2">
          <span className="field-label">Authors</span>
          <div className="flex flex-wrap gap-2">
            {authors.length === 0 && <p className="text-sm text-ink-soft">No authors yet — add one first.</p>}
            {authors.map((a) => (
              <button
                type="button"
                key={a._id}
                onClick={() => toggleAuthor(a._id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedAuthors.includes(a._id)
                    ? 'border-gold bg-gold/10 text-gold-dark'
                    : 'border-rule text-ink-soft hover:border-ink'
                }`}
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="isbn">ISBN</label>
          <input id="isbn" name="isbn" required defaultValue={book?.isbn} className="field-input" />
        </div>
        <div>
          <label className="field-label" htmlFor="price">Price (₹)</label>
          <input id="price" name="price" type="number" min={0} step="0.01" required defaultValue={book?.price} className="field-input" />
        </div>

        <div>
          <label className="field-label" htmlFor="category">Category</label>
          <select id="category" name="category" required defaultValue={book?.category || ''} className="field-input">
            <option value="" disabled>Select category</option>
            {BOOK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="format">Format</label>
          <select id="format" name="format" required defaultValue={book?.format || ''} className="field-input">
            <option value="" disabled>Select format</option>
            {BOOK_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor="language">Language</label>
          <select id="language" name="language" defaultValue={book?.language || 'English'} className="field-input">
            {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="pages">Pages</label>
          <input id="pages" name="pages" type="number" min={1} defaultValue={book?.pages} className="field-input" />
        </div>

        <div>
          <label className="field-label" htmlFor="publicationDate">Publication Date</label>
          <input
            id="publicationDate" name="publicationDate" type="date"
            defaultValue={book?.publicationDate ? book.publicationDate.slice(0, 10) : ''}
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="publisher">Publisher</label>
          <input id="publisher" name="publisher" defaultValue={book?.publisher || 'LearnCorp Publication'} className="field-input" />
        </div>

        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="keywords">Keywords (comma-separated)</label>
          <input id="keywords" name="keywords" defaultValue={book?.keywords.join(', ')} className="field-input" />
        </div>

        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="description">Description</label>
          <textarea id="description" name="description" required rows={4} defaultValue={book?.description} className="field-input" />
        </div>

        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="tableOfContents">Table of Contents (optional)</label>
          <textarea id="tableOfContents" name="tableOfContents" rows={3} defaultValue={book?.tableOfContents} className="field-input" />
        </div>

        <div className="sm:col-span-2">
          <span className="field-label">Cover Image</span>
          <div className="flex items-center gap-4">
            {coverUrl && (
              <span className="relative h-20 w-16 shrink-0 overflow-hidden rounded-sm border border-rule">
                <Image src={coverUrl} alt="Cover preview" fill className="object-cover" />
              </span>
            )}
            <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-dashed border-rule px-3.5 py-3 text-sm text-ink-soft hover:border-ink">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
              {uploading ? 'Uploading…' : coverUrl ? 'Replace cover' : 'Upload cover'}
              <input
                type="file" accept="image/png,image/jpeg" className="sr-only" disabled={uploading}
                onChange={(e) => onCoverChange(e.target.files?.[0])}
              />
            </label>
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={book?.status || 'draft'} className="field-input">
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
      </fieldset>

      {error && <p className="field-error">{error}</p>}

      <button type="submit" disabled={saving || uploading} className="btn-primary">
        {saving && <Loader2 size={16} className="animate-spin" />}
        {isEdit ? 'Save Changes' : 'Create Book'}
      </button>
    </form>
  );
}
