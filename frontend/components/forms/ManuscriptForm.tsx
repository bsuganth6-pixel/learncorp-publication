'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Loader2, UploadCloud } from 'lucide-react';
import { submitManuscript, ApiClientError } from '@/lib/api-client';
import { BOOK_CATEGORIES, BOOK_FORMATS, LANGUAGES } from '@/lib/constants';

const schema = z.object({
  authorName: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(6, 'Enter a valid phone number'),
  bookTitle: z.string().min(1, 'Book title is required'),
  category: z.string().min(1, 'Choose a category'),
  language: z.string().min(1, 'Choose a language'),
  pageCount: z.string().optional(),
  description: z.string().min(20, 'Please describe the manuscript (20+ characters)'),
  authorBio: z.string().min(10, 'Please add a short author bio'),
  format: z.string().min(1, 'Choose a format'),
  previousExperience: z.string().optional(),
  additionalInfo: z.string().optional(),
  agreedToTerms: z.boolean().refine((v) => v === true, { message: 'You must accept the terms and conditions' }),
});

type FormValues = z.infer<typeof schema>;

export default function ManuscriptForm() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');
  const [manuscriptFile, setManuscriptFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');

  const {
    register, handleSubmit, formState: { errors, isSubmitting }, reset,
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { language: 'English' } });

  const onSubmit = async (values: FormValues) => {
    setServerError('');
    setFileError('');
    if (!manuscriptFile) {
      setFileError('Please attach your manuscript (PDF or Word document)');
      return;
    }

    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.append(key, String(value)));
    formData.append('manuscript', manuscriptFile);
    if (coverFile) formData.append('cover', coverFile);

    try {
      await submitManuscript(formData);
      setSubmitted(true);
      reset();
      setManuscriptFile(null);
      setCoverFile(null);
    } catch (err) {
      setServerError(err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.');
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-sm border border-success/30 bg-success/5 px-6 py-16 text-center">
        <CheckCircle2 size={32} className="text-success" />
        <p className="font-display text-xl text-ink">Manuscript received</p>
        <p className="max-w-sm text-sm text-ink-soft">
          Thanks — your submission is in. Our editorial team will review it and follow up by email.
        </p>
        <button type="button" onClick={() => setSubmitted(false)} className="btn-outline mt-2 text-sm">
          Submit another manuscript
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="section-label mb-3 sm:col-span-2">Author Details</legend>
        <div>
          <label className="field-label" htmlFor="authorName">Author Name</label>
          <input id="authorName" className="field-input" {...register('authorName')} />
          {errors.authorName && <p className="field-error">{errors.authorName.message}</p>}
        </div>
        <div>
          <label className="field-label" htmlFor="email">Email</label>
          <input id="email" type="email" className="field-input" {...register('email')} />
          {errors.email && <p className="field-error">{errors.email.message}</p>}
        </div>
        <div>
          <label className="field-label" htmlFor="phone">Phone</label>
          <input id="phone" className="field-input" {...register('phone')} />
          {errors.phone && <p className="field-error">{errors.phone.message}</p>}
        </div>
        <div>
          <label className="field-label" htmlFor="previousExperience">Previous Publishing Experience</label>
          <input id="previousExperience" className="field-input" placeholder="Optional" {...register('previousExperience')} />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="authorBio">Author Biography</label>
          <textarea id="authorBio" rows={3} className="field-input" {...register('authorBio')} />
          {errors.authorBio && <p className="field-error">{errors.authorBio.message}</p>}
        </div>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="section-label mb-3 sm:col-span-2">Book Details</legend>
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="bookTitle">Book Title</label>
          <input id="bookTitle" className="field-input" {...register('bookTitle')} />
          {errors.bookTitle && <p className="field-error">{errors.bookTitle.message}</p>}
        </div>
        <div>
          <label className="field-label" htmlFor="category">Category</label>
          <select id="category" className="field-input" {...register('category')}>
            <option value="">Select a category</option>
            {BOOK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.category && <p className="field-error">{errors.category.message}</p>}
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
          {errors.format && <p className="field-error">{errors.format.message}</p>}
        </div>
        <div>
          <label className="field-label" htmlFor="pageCount">Approximate Page Count</label>
          <input id="pageCount" type="number" min={1} className="field-input" {...register('pageCount')} />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="description">Book Description</label>
          <textarea id="description" rows={4} className="field-input" {...register('description')} />
          {errors.description && <p className="field-error">{errors.description.message}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="additionalInfo">Additional Information</label>
          <textarea id="additionalInfo" rows={3} className="field-input" placeholder="Optional" {...register('additionalInfo')} />
        </div>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="section-label mb-3 sm:col-span-2">Files</legend>
        <div>
          <label className="field-label">Manuscript (PDF or Word)</label>
          <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-dashed border-rule px-3.5 py-3 text-sm text-ink-soft hover:border-ink">
            <UploadCloud size={16} />
            {manuscriptFile ? manuscriptFile.name : 'Choose file'}
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              className="sr-only"
              onChange={(e) => setManuscriptFile(e.target.files?.[0] || null)}
            />
          </label>
          {fileError && <p className="field-error">{fileError}</p>}
        </div>
        <div>
          <label className="field-label">Cover (optional)</label>
          <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-dashed border-rule px-3.5 py-3 text-sm text-ink-soft hover:border-ink">
            <UploadCloud size={16} />
            {coverFile ? coverFile.name : 'Choose file'}
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="sr-only"
              onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>
      </fieldset>

      <div>
        <label className="flex items-start gap-2.5 text-sm text-ink-soft">
          <input type="checkbox" className="mt-0.5" {...register('agreedToTerms')} />
          I agree to the terms and conditions of manuscript submission.
        </label>
        {errors.agreedToTerms && <p className="field-error">{errors.agreedToTerms.message}</p>}
      </div>

      {serverError && <p className="field-error">{serverError}</p>}

      <button type="submit" disabled={isSubmitting} className="btn-gold w-full sm:w-auto">
        {isSubmitting && <Loader2 size={16} className="animate-spin" />}
        Submit Manuscript
      </button>
    </form>
  );
}
