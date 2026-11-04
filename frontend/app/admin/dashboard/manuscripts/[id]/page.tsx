'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Download } from 'lucide-react';
import { getManuscriptById, getManuscriptFileUrl, ApiClientError } from '@/lib/api-client';
import type { Manuscript, SubmissionEvent } from '@/lib/types';
import PageHeader from '@/components/admin/PageHeader';
import ReviewPanel from '@/components/admin/ReviewPanel';
import PublishPanel from '@/components/admin/PublishPanel';
import StatusTimeline from '@/components/author/StatusTimeline';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/utils';

const FIELDS: { key: keyof Manuscript; label: string }[] = [
  { key: 'authorName', label: 'Author Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'category', label: 'Category' },
  { key: 'language', label: 'Language' },
  { key: 'format', label: 'Format' },
  { key: 'pageCount', label: 'Approx. Pages' },
  { key: 'previousExperience', label: 'Previous Experience' },
  { key: 'version', label: 'Version' },
];

function timeline(manuscript: Manuscript): SubmissionEvent[] {
  const owner = typeof manuscript.author === 'object' && manuscript.author ? manuscript.author.name : manuscript.authorName;
  return (manuscript.history ?? []).map((e) => ({
    status: e.status,
    note: e.note ?? null,
    by: e.actor === 'author' ? owner : typeof e.by === 'object' && e.by ? e.by.name : 'Editorial team',
    at: e.at,
  }));
}

export default function ManuscriptDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState<'manuscript' | 'cover' | null>(null);
  const [downloadError, setDownloadError] = useState('');

  const load = useCallback(() => {
    getManuscriptById(id).then((res) => setManuscript(res.data)).catch(() => setError('Could not load this manuscript'));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const onDownload = async (file: 'manuscript' | 'cover') => {
    setDownloading(file);
    setDownloadError('');
    try {
      const { url } = await getManuscriptFileUrl(id, file);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setDownloadError(err instanceof ApiClientError ? err.message : 'Could not generate a download link');
    } finally {
      setDownloading(null);
    }
  };

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!manuscript) {
    return <p className="flex items-center gap-2 text-sm text-ink-soft"><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Loading…</p>;
  }

  const owner = typeof manuscript.author === 'object' ? manuscript.author : null;
  const book = typeof manuscript.book === 'object' ? manuscript.book : null;

  return (
    <div className="max-w-3xl">
      <PageHeader title={manuscript.bookTitle} description={`Submitted ${formatDate(manuscript.createdAt)}`} />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={manuscript.status} />
        {(manuscript.version ?? 1) > 1 && <Badge tone="gold">Resubmitted · version {manuscript.version}</Badge>}
        {!manuscript.author && <Badge>No author account</Badge>}
        {owner && !owner.emailVerified && <Badge tone="warning">Author email unconfirmed</Badge>}
        {owner && owner.status === 'suspended' && <Badge tone="danger">Author suspended</Badge>}
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-rule pt-6 sm:grid-cols-3">
        {FIELDS.map(({ key, label }) => (
          manuscript[key] ? (
            <div key={key}>
              <dt className="text-xs uppercase tracking-wide text-ink-soft">{label}</dt>
              <dd className="mt-1 break-words text-sm font-medium text-ink">{String(manuscript[key])}</dd>
            </div>
          ) : null
        ))}
      </dl>

      <div className="mt-8">
        <h2 className="font-display text-lg text-ink">Book Description</h2>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{manuscript.description}</p>
      </div>

      <div className="mt-8">
        <h2 className="font-display text-lg text-ink">Author Biography</h2>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{manuscript.authorBio}</p>
      </div>

      {manuscript.additionalInfo && (
        <div className="mt-8">
          <h2 className="font-display text-lg text-ink">Additional Information</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{manuscript.additionalInfo}</p>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3 border-t border-rule pt-6">
        <button type="button" onClick={() => onDownload('manuscript')} disabled={downloading === 'manuscript'} className="btn-primary text-sm">
          {downloading === 'manuscript' ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Download size={15} aria-hidden="true" />}
          Download Manuscript
        </button>
        {manuscript.coverFileUrl && (
          <button type="button" onClick={() => onDownload('cover')} disabled={downloading === 'cover'} className="btn-outline text-sm">
            {downloading === 'cover' ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Download size={15} aria-hidden="true" />}
            Download Cover
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-ink-soft">Download links are generated on demand, expire after 5 minutes, and each access is recorded in the activity log.</p>
      {downloadError && <p role="alert" className="field-error">{downloadError}</p>}

      <ReviewPanel manuscript={manuscript} onDecided={load} />
      {manuscript.status === 'Accepted' && <PublishPanel manuscript={manuscript} onPublished={load} />}
      {manuscript.status === 'Published' && book && (
        <Alert tone="success" title="Published" className="mt-8">
          This manuscript is live in the catalogue and the author has been notified.{' '}
          <Link href={`/books/${book.slug}`}>View the book</Link>
        </Alert>
      )}

      {(manuscript.history?.length ?? 0) > 0 && (
        <section className="mt-10" aria-labelledby="history-heading">
          <h2 id="history-heading" className="font-display text-lg text-ink">History</h2>
          <div className="mt-4"><StatusTimeline events={timeline(manuscript)} /></div>
        </section>
      )}
    </div>
  );
}
