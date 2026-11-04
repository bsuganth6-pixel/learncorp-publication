'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Loader2, UploadCloud } from 'lucide-react';
import { submitManuscript, resubmitManuscript, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { BOOK_CATEGORIES, BOOK_FORMATS, LANGUAGES } from '@/lib/constants';
import type { AuthorSubmission } from '@/lib/types';
import Alert from '@/components/ui/Alert';
import ResendVerification from '@/components/author/ResendVerification';

const details = {
  phone: z.string().trim().min(6, 'Enter a valid phone number'),
  bookTitle: z.string().trim().min(1, 'Book title is required'),
  category: z.string().min(1, 'Choose a category'),
  language: z.string().min(1, 'Choose a language'),
  pageCount: z.string().optional(),
  description: z.string().trim().min(20, 'Please describe the manuscript (20+ characters)'),
  authorBio: z.string().trim().min(10, 'Please add a short author bio'),
  format: z.string().min(1, 'Choose a format'),
  previousExperience: z.string().optional(),
  additionalInfo: z.string().optional(),
};

const createSchema = z.object({
  ...details,
  note: z.string().optional(),
  agreedToTerms: z.boolean().refine((v) => v === true, { message: 'You must accept the terms and conditions' }),
});
const resubmitSchema = z.object({
  ...details,
  note: z.string().trim().min(10, 'Tell the editors what you changed (10+ characters)'),
  agreedToTerms: z.boolean().optional(),
});
type FormValues = z.infer<typeof createSchema>;

type Props =
  | { mode?: 'create' }
  | { mode: 'resubmit'; submission: AuthorSubmission; onResubmitted: (updated: AuthorSubmission) => void };

const MANUSCRIPT_ACCEPT = '.pdf,.doc,.docx';

export default function ManuscriptForm(props: Props) {
  const resubmitting = props.mode === 'resubmit';
  const initial = resubmitting ? props.submission : null;
  const { state, refresh } = useAuth();
  const user = state.user;

  const [created, setCreated] = useState<{ id: string } | null>(null);
  const [serverError, setServerError] = useState<{ message: string; unverified: boolean } | null>(null);
  const [manuscriptFile, setManuscriptFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');

  const defaults: FormValues = {
    phone: initial?.phone ?? user?.phone ?? '',
    bookTitle: initial?.bookTitle ?? '',
    category: initial?.category ?? '',
    language: initial?.language ?? 'English',
    pageCount: initial?.pageCount ? String(initial.pageCount) : '',
    description: initial?.description ?? '',
    authorBio: initial?.authorBio ?? user?.bio ?? '',
    format: initial?.format ?? '',
    previousExperience: initial?.previousExperience ?? '',
    additionalInfo: initial?.additionalInfo ?? '',
    note: '',
    agreedToTerms: false,
  };

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormValues>({
    resolver: zodResolver(resubmitting ? resubmitSchema : createSchema) as never,
    defaultValues: defaults,
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setFileError('');
    if (!resubmitting && !manuscriptFile) {
      setFileError('Please attach your manuscript (PDF or Word document)');
      return;
    }

    const formData = new FormData();
    if (initial) {
      // Only what actually changed is sent, so untouched details can never be overwritten.
      (Object.keys(details) as Array<keyof typeof details>).forEach((key) => {
        if ((values[key] ?? '') !== (defaults[key] ?? '')) formData.append(key, String(values[key] ?? ''));
      });
      formData.append('note', values.note ?? '');
    } else {
      (Object.keys(details) as Array<keyof typeof details>).forEach((key) => formData.append(key, String(values[key] ?? '')));
      formData.append('agreedToTerms', String(values.agreedToTerms));
    }
    if (manuscriptFile) formData.append('manuscript', manuscriptFile);
    if (coverFile) formData.append('cover', coverFile);

    try {
      if (props.mode === 'resubmit') {
        const res = await resubmitManuscript(props.submission.id, formData);
        props.onResubmitted(res.data);
        setManuscriptFile(null);
        setCoverFile(null);
      } else {
        const res = await submitManuscript(formData);
        setCreated({ id: res.data.id });
        reset();
        setManuscriptFile(null);
        setCoverFile(null);
      }
      void refresh(); // pick up the new notification count
    } catch (err) {
      if (err instanceof ApiClientError) {
        setServerError({ message: err.message, unverified: err.code === 'EMAIL_NOT_VERIFIED' });
      } else {
        setServerError({ message: 'Something went wrong. Please try again.', unverified: false });
      }
    }
  };

  // Field errors and the missing-file error appear together, not one round-trip at a time.
  const onInvalid = () => {
    if (!resubmitting && !manuscriptFile) setFileError('Please attach your manuscript (PDF or Word document)');
  };

  if (created) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-sm border border-success/30 bg-success/5 px-6 py-14 text-center">
        <CheckCircle2 size={32} className="text-success" aria-hidden="true" />
        <p className="font-display text-xl text-ink">Manuscript received</p>
        <p className="max-w-sm text-sm text-ink-soft">
          Thanks — your submission is in. Our editors will review it, and you’ll see every update on your dashboard and by email.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Link href={`/author/submissions/${created.id}`} className="btn-gold text-sm">Track this submission</Link>
          <button type="button" onClick={() => setCreated(null)} className="btn-outline text-sm">Submit another manuscript</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="space-y-8">
      {serverError && (
        <div className="space-y-3">
          <Alert tone={serverError.unverified ? 'warning' : 'error'}>{serverError.message}</Alert>
          {serverError.unverified && <ResendVerification compact />}
        </div>
      )}

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="section-label mb-3 sm:col-span-2">Author Details</legend>
        {user && (
          <p className="rounded-sm bg-ink/5 px-4 py-3 text-sm text-ink-soft sm:col-span-2">
            Submitting as <strong className="font-medium text-ink">{user.name}</strong> ({user.email}). Your name and email come from your
            account — <Link href="/account" className="font-medium text-ink underline">change them in your profile</Link>.
          </p>
        )}
        <div>
          <label className="field-label" htmlFor="phone">Phone</label>
          <input id="phone" type="tel" autoComplete="tel" className="field-input" {...register('phone')} />
          {errors.phone && <p role="alert" className="field-error">{errors.phone.message}</p>}
        </div>
        <div>
          <label className="field-label" htmlFor="previousExperience">Previous Publishing Experience</label>
          <input id="previousExperience" className="field-input" placeholder="Optional" {...register('previousExperience')} />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="authorBio">Author Biography</label>
          <textarea id="authorBio" rows={3} className="field-input" {...register('authorBio')} />
          {errors.authorBio && <p role="alert" className="field-error">{errors.authorBio.message}</p>}
        </div>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="section-label mb-3 sm:col-span-2">Book Details</legend>
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="bookTitle">Book Title</label>
          <input id="bookTitle" className="field-input" {...register('bookTitle')} />
          {errors.bookTitle && <p role="alert" className="field-error">{errors.bookTitle.message}</p>}
        </div>
        <div>
          <label className="field-label" htmlFor="category">Category</label>
          <select id="category" className="field-input" {...register('category')}>
            <option value="">Select a category</option>
            {BOOK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.category && <p role="alert" className="field-error">{errors.category.message}</p>}
        </div>
        <div>
          <label className="field-label" htmlFor="language">Language</label>
          <select id="language" className="field-input" {...register('language')}>
            {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="format">Publishing Format</label>
          <select id="format" className="field-input" {...register('format')}>
            <option value="">Select a format</option>
            {BOOK_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          {errors.format && <p role="alert" className="field-error">{errors.format.message}</p>}
        </div>
        <div>
          <label className="field-label" htmlFor="pageCount">Approximate Page Count</label>
          <input id="pageCount" type="number" min={1} className="field-input" {...register('pageCount')} />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="description">Book Description</label>
          <textarea id="description" rows={4} className="field-input" {...register('description')} />
          {errors.description && <p role="alert" className="field-error">{errors.description.message}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="additionalInfo">Additional Information</label>
          <textarea id="additionalInfo" rows={3} className="field-input" placeholder="Optional" {...register('additionalInfo')} />
        </div>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="section-label mb-3 sm:col-span-2">Files</legend>
        <div>
          <label className="field-label" htmlFor="manuscript-file">
            {resubmitting ? 'Revised manuscript (PDF or Word)' : 'Manuscript (PDF or Word)'}
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-dashed border-rule px-3.5 py-3 text-sm text-ink-soft focus-within:border-ink hover:border-ink">
            <UploadCloud size={16} aria-hidden="true" />
            <span className="truncate">{manuscriptFile ? manuscriptFile.name : resubmitting ? 'Choose a new file (optional)' : 'Choose file'}</span>
            <input id="manuscript-file" type="file" accept={MANUSCRIPT_ACCEPT} className="sr-only" onChange={(e) => setManuscriptFile(e.target.files?.[0] || null)} />
          </label>
          {resubmitting && !manuscriptFile && <p className="mt-1 text-xs text-ink-soft">Leave empty to keep the file you already submitted.</p>}
          {fileError && <p role="alert" className="field-error">{fileError}</p>}
        </div>
        <div>
          <label className="field-label" htmlFor="cover-file">Cover (optional)</label>
          <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-dashed border-rule px-3.5 py-3 text-sm text-ink-soft focus-within:border-ink hover:border-ink">
            <UploadCloud size={16} aria-hidden="true" />
            <span className="truncate">{coverFile ? coverFile.name : 'Choose file'}</span>
            <input id="cover-file" type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
          </label>
        </div>
      </fieldset>

      {resubmitting ? (
        <div>
          <label className="field-label" htmlFor="note">What did you change?</label>
          <textarea id="note" rows={3} className="field-input" placeholder="A few words for the editors about your revisions" {...register('note')} />
          {errors.note && <p role="alert" className="field-error">{errors.note.message}</p>}
        </div>
      ) : (
        <div>
          <label className="flex items-start gap-2.5 text-sm text-ink-soft">
            <input type="checkbox" className="mt-0.5" {...register('agreedToTerms')} />
            I agree to the terms and conditions of manuscript submission.
          </label>
          {errors.agreedToTerms && <p role="alert" className="field-error">{errors.agreedToTerms.message}</p>}
        </div>
      )}

      <button type="submit" disabled={isSubmitting} className="btn-gold w-full sm:w-auto">
        {isSubmitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
        {resubmitting ? 'Send back to the editors' : 'Submit Manuscript'}
      </button>
    </form>
  );
}
