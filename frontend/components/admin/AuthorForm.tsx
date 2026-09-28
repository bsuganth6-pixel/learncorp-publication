'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2, UploadCloud } from 'lucide-react';
import { createAuthor, updateAuthor, uploadImage, ApiClientError } from '@/lib/api-client';
import type { Author } from '@/lib/types';

export default function AuthorForm({ author }: { author?: Author }) {
  const router = useRouter();
  const isEdit = Boolean(author);
  const [photoUrl, setPhotoUrl] = useState(author?.photoUrl || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const onPhotoChange = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { url } = await uploadImage(file);
      setPhotoUrl(url);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Photo upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const form = new FormData(e.currentTarget);

    const payload = {
      name: String(form.get('name')),
      bio: String(form.get('bio') || ''),
      qualifications: String(form.get('qualifications') || ''),
      photoUrl: photoUrl || undefined,
      socialLinks: {
        website: String(form.get('website') || ''),
        twitter: String(form.get('twitter') || ''),
        linkedin: String(form.get('linkedin') || ''),
        instagram: String(form.get('instagram') || ''),
      },
    };

    setSaving(true);
    try {
      if (isEdit && author) {
        await updateAuthor(author._id, payload);
      } else {
        await createAuthor(payload);
      }
      router.push('/admin/dashboard/authors');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not save this author');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
      <div>
        <label className="field-label" htmlFor="name">Name</label>
        <input id="name" name="name" required defaultValue={author?.name} className="field-input" />
      </div>

      <div>
        <span className="field-label">Photo</span>
        <div className="flex items-center gap-4">
          {photoUrl && (
            <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-rule">
              <Image src={photoUrl} alt="Author photo preview" fill className="object-cover" />
            </span>
          )}
          <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-dashed border-rule px-3.5 py-3 text-sm text-ink-soft hover:border-ink">
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
            {uploading ? 'Uploading…' : photoUrl ? 'Replace photo' : 'Upload photo'}
            <input
              type="file" accept="image/png,image/jpeg" className="sr-only" disabled={uploading}
              onChange={(e) => onPhotoChange(e.target.files?.[0])}
            />
          </label>
        </div>
      </div>

      <div>
        <label className="field-label" htmlFor="qualifications">Qualifications / Interests</label>
        <input id="qualifications" name="qualifications" defaultValue={author?.qualifications} className="field-input" />
      </div>

      <div>
        <label className="field-label" htmlFor="bio">Biography</label>
        <textarea id="bio" name="bio" rows={4} defaultValue={author?.bio} className="field-input" />
      </div>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="section-label mb-2 sm:col-span-2">Social Links (optional)</legend>
        <div>
          <label className="field-label" htmlFor="website">Website</label>
          <input id="website" name="website" defaultValue={author?.socialLinks?.website} className="field-input" />
        </div>
        <div>
          <label className="field-label" htmlFor="twitter">Twitter / X</label>
          <input id="twitter" name="twitter" defaultValue={author?.socialLinks?.twitter} className="field-input" />
        </div>
        <div>
          <label className="field-label" htmlFor="linkedin">LinkedIn</label>
          <input id="linkedin" name="linkedin" defaultValue={author?.socialLinks?.linkedin} className="field-input" />
        </div>
        <div>
          <label className="field-label" htmlFor="instagram">Instagram</label>
          <input id="instagram" name="instagram" defaultValue={author?.socialLinks?.instagram} className="field-input" />
        </div>
      </fieldset>

      {error && <p className="field-error">{error}</p>}

      <button type="submit" disabled={saving || uploading} className="btn-primary">
        {saving && <Loader2 size={16} className="animate-spin" />}
        {isEdit ? 'Save Changes' : 'Add Author'}
      </button>
    </form>
  );
}
