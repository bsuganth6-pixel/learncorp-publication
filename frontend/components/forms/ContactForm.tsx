'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { submitContactMessage, ApiClientError } from '@/lib/api-client';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(10, 'Message should be at least 10 characters'),
});

type FormValues = z.infer<typeof schema>;

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');
  const {
    register, handleSubmit, formState: { errors, isSubmitting }, reset,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError('');
    try {
      await submitContactMessage(values);
      setSubmitted(true);
      reset();
    } catch (err) {
      setServerError(err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.');
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-sm border border-success/30 bg-success/5 px-6 py-12 text-center">
        <CheckCircle2 size={28} className="text-success" />
        <p className="font-display text-lg text-ink">Message sent</p>
        <p className="text-sm text-ink-soft">Thanks for reaching out — we&apos;ll reply soon.</p>
        <button type="button" onClick={() => setSubmitted(false)} className="btn-outline mt-2 text-sm">
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="name">Name</label>
          <input id="name" className="field-input" {...register('name')} />
          {errors.name && <p className="field-error">{errors.name.message}</p>}
        </div>
        <div>
          <label className="field-label" htmlFor="email">Email</label>
          <input id="email" type="email" className="field-input" {...register('email')} />
          {errors.email && <p className="field-error">{errors.email.message}</p>}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="phone">Phone (optional)</label>
          <input id="phone" className="field-input" {...register('phone')} />
        </div>
        <div>
          <label className="field-label" htmlFor="subject">Subject</label>
          <input id="subject" className="field-input" {...register('subject')} />
          {errors.subject && <p className="field-error">{errors.subject.message}</p>}
        </div>
      </div>

      <div>
        <label className="field-label" htmlFor="message">Message</label>
        <textarea id="message" rows={5} className="field-input" {...register('message')} />
        {errors.message && <p className="field-error">{errors.message.message}</p>}
      </div>

      {serverError && <p className="field-error">{serverError}</p>}

      <button type="submit" disabled={isSubmitting} className="btn-gold w-full sm:w-auto">
        {isSubmitting && <Loader2 size={16} className="animate-spin" />}
        Send Message
      </button>
    </form>
  );
}
