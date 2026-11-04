'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import { getMySubmission, getMySubmissionFileUrl, ApiClientError } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import type { AuthorSubmission } from '@/lib/types';
import Alert from '@/components/ui/Alert';
import StatusBadge from '@/components/ui/StatusBadge';
import ManuscriptForm from '@/components/forms/ManuscriptForm';
import StatusTimeline from './StatusTimeline';

const STATUS_HELP: Record<string, string> = {
  Submitted: 'We’ve received your manuscript. An editor will pick it up shortly.',
  'Under Review': 'An editor is reading your manuscript. We’ll update you here and by email.',
  'Changes Requested': 'The editors would like some changes before going further. Their note is below.',
  Accepted: 'Your manuscript was accepted. It moves into production next, and we’ll tell you when it’s live.',
  Rejected: 'This manuscript wasn’t accepted. You’re welcome to submit a different one.',
  Published: 'Your book is live in the catalogue.',
};

export default function SubmissionDetail({ id }: { id: string }) {
  const [submission, setSubmission] = useState<AuthorSubmission | null>(null);
  const [error, setError] = useState<{ notFound: boolean; message: string } | null>(null);
  const [downloading, setDownloading] = useState<'manuscript' | 'cover' | null>(null);
  const [downloadError, setDownloadError] = useState('');
  const [justResubmitted, setJustResubmitted] = useState(false);

  const load = useCallback(() => {
    getMySubmission(id)
      .then((res) => setSubmission(res.data))
      .catch((err) => setError({ notFound: err instanceof ApiClientError && err.status === 404, message: err instanceof ApiClientError ? err.message : 'Could not load this submission.' }));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const onDownload = async (file: 'manuscript' | 'cover') => {
    setDownloading(file);
    setDownloadError('');
    try {
      const { url } = await getMySubmissionFileUrl(id, file);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setDownloadError(err instanceof ApiClientError ? err.message : 'Could not create a download link.');
    } finally {
      setDownloading(null);
    }
  };

  if (error) {
    return (
      <div className="max-w-xl space-y-4">
        <Alert tone="error" title={error.notFound ? 'Submission not found' : 'Something went wrong'}>
          {error.notFound ? 'It may not exist, or it belongs to a different account.' : error.message}
        </Alert>
        <Link href="/author/submissions" className="btn-outline text-sm">Back to my submissions</Link>
      </div>
    );
  }
  if (!submission) return <p className="flex items-center gap-2 text-sm text-ink-soft"><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Loading…</p>;

  const facts: Array<[string, string | number | null]> = [
    ['Category', submission.category],
    ['Language', submission.language],
    ['Format', submission.format],
    ['Approx. pages', submission.pageCount],
    ['Version', submission.version],
    ['Submitted', formatDate(submission.createdAt)],
  ];

  return (
    <div className="max-w-4xl">
      <Link href="/author/submissions" className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"><ArrowLeft size={14} aria-hidden="true" /> All submissions</Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <h1 className="font-display text-3xl text-ink">{submission.bookTitle}</h1>
        <StatusBadge status={submission.status} className="mt-2" />
      </div>
      <p className="mt-2 text-sm text-ink-soft">{STATUS_HELP[submission.status]}</p>

      {justResubmitted && <Alert tone="success" className="mt-6">Your changes were sent back to the editors. We’ll update you here and by email.</Alert>}

      {submission.canResubmit && submission.latestFeedback?.note && (
        <section className="mt-6 rounded-sm border border-warning/50 bg-warning/10 p-5" aria-labelledby="feedback-heading">
          <h2 id="feedback-heading" className="font-display text-lg text-ink">Note from the editors</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink">{submission.latestFeedback.note}</p>
          <a href="#resubmit" className="mt-4 inline-block text-sm font-medium text-ink underline">Update and resubmit ↓</a>
        </section>
      )}

      {submission.status === 'Published' && submission.bookSlug && (
        <div className="mt-6">
          <Link href={`/books/${submission.bookSlug}`} className="btn-gold">View your book in the catalogue</Link>
        </div>
      )}

      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-rule py-6 sm:grid-cols-3">
        {facts.filter(([, v]) => v !== null && v !== '').map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs uppercase tracking-wide text-ink-soft">{label}</dt>
            <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 grid gap-10 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-8">
          <section>
            <h2 className="font-display text-lg text-ink">Book description</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{submission.description}</p>
          </section>
          <section>
            <h2 className="font-display text-lg text-ink">About the author</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{submission.authorBio}</p>
          </section>
          {submission.additionalInfo && (
            <section>
              <h2 className="font-display text-lg text-ink">Additional information</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{submission.additionalInfo}</p>
            </section>
          )}
          <section>
            <h2 className="font-display text-lg text-ink">Your files</h2>
            <div className="mt-3 flex flex-wrap gap-3">
              <button type="button" onClick={() => onDownload('manuscript')} disabled={downloading === 'manuscript'} className="btn-outline px-4 py-2 text-sm">
                {downloading === 'manuscript' ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Download size={15} aria-hidden="true" />} Manuscript
              </button>
              {submission.hasCover && (
                <button type="button" onClick={() => onDownload('cover')} disabled={downloading === 'cover'} className="btn-outline px-4 py-2 text-sm">
                  {downloading === 'cover' ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Download size={15} aria-hidden="true" />} Cover
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-ink-soft">Download links are created on demand and expire after 5 minutes.</p>
            {downloadError && <p role="alert" className="field-error">{downloadError}</p>}
          </section>
        </div>

        <section aria-labelledby="history-heading">
          <h2 id="history-heading" className="font-display text-lg text-ink">Progress</h2>
          <div className="mt-4"><StatusTimeline events={submission.history} /></div>
        </section>
      </div>

      {submission.canResubmit && (
        <section id="resubmit" className="mt-12 scroll-mt-28 rounded-sm border border-rule bg-surface p-5 shadow-card sm:p-8" aria-labelledby="resubmit-heading">
          <h2 id="resubmit-heading" className="font-display text-2xl text-ink">Update and resubmit</h2>
          <p className="mt-2 text-sm text-ink-soft">Change anything the editors asked about, attach a revised file if needed, and tell them what you did.</p>
          <div className="mt-8">
            <ManuscriptForm
              mode="resubmit"
              submission={submission}
              onResubmitted={(updated) => { setSubmission(updated); setJustResubmitted(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            />
          </div>
        </section>
      )}
    </div>
  );
}
