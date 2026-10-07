'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getAllTestimonials } from '@/lib/api-client';
import type { Testimonial } from '@/lib/types';
import PageHeader from '@/components/admin/PageHeader';
import TestimonialForm from '@/components/admin/TestimonialForm';

export default function EditTestimonialPage({ params }: { params: { id: string } }) {
  const [testimonial, setTestimonial] = useState<Testimonial | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getAllTestimonials({ page: 1 })
      .then((res) => {
        const match = res.data.find((t) => t._id === params.id);
        if (!match) throw new Error('Not found');
        setTestimonial(match);
      })
      .catch(() => setError('Could not load this testimonial'));
  }, [params.id]);

  return (
    <div>
      <PageHeader title="Edit Testimonial" />
      {error && <p className="field-error">{error}</p>}
      {!testimonial && !error && (
        <p className="flex items-center gap-2 text-sm text-ink-soft"><Loader2 size={14} className="animate-spin" /> Loading…</p>
      )}
      {testimonial && <TestimonialForm testimonial={testimonial} />}
    </div>
  );
}
