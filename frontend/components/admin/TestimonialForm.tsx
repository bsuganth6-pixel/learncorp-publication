'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createTestimonial, updateTestimonial, ApiClientError } from '@/lib/api-client';
import type { Testimonial } from '@/lib/types';

export default function TestimonialForm({ testimonial }: { testimonial?: Testimonial }) {
  const router = useRouter();
  const isEdit = Boolean(testimonial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get('name')),
      designation: String(form.get('designation') || ''),
      message: String(form.get('message')),
      photoUrl: String(form.get('photoUrl') || ''),
      status: String(form.get('status')),
    };

    setSaving(true);
    try {
      if (isEdit && testimonial) {
        await updateTestimonial(testimonial._id, payload);
      } else {
        await createTestimonial(payload);
      }
      router.push('/admin/dashboard/testimonials');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not save this testimonial');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-5">
      <div>
        <label className="field-label" htmlFor="name">Name</label>
        <input id="name" name="name" required defaultValue={testimonial?.name} className="field-input" />
      </div>
      <div>
        <label className="field-label" htmlFor="designation">Designation (optional)</label>
        <input id="designation" name="designation" defaultValue={testimonial?.designation} placeholder="e.g. Author of ..." className="field-input" />
      </div>
      <div>
        <label className="field-label" htmlFor="message">Testimonial</label>
        <textarea id="message" name="message" required rows={4} defaultValue={testimonial?.message} className="field-input" />
      </div>
      <div>
        <label className="field-label" htmlFor="photoUrl">Photo URL (optional)</label>
        <input id="photoUrl" name="photoUrl" defaultValue={testimonial?.photoUrl} className="field-input" />
      </div>
      <div>
        <label className="field-label" htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue={testimonial?.status || 'unpublished'} className="field-input">
          <option value="unpublished">Unpublished</option>
          <option value="published">Published</option>
        </select>
      </div>

      {error && <p className="field-error">{error}</p>}

      <button type="submit" disabled={saving} className="btn-primary">
        {saving && <Loader2 size={16} className="animate-spin" />}
        {isEdit ? 'Save Changes' : 'Add Testimonial'}
      </button>
    </form>
  );
}
