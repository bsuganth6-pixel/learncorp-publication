'use client';

import { useEffect, useState } from 'react';
import { Loader2, Download } from 'lucide-react';
import { getManuscriptById, getManuscriptFileUrl, ApiClientError } from '@/lib/api-client';
import type { Manuscript } from '@/lib/types';
import PageHeader from '@/components/admin/PageHeader';
import Badge from '@/components/ui/Badge';
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
];

export default function ManuscriptDetailPage({ params }: { params: { id: string } }) {
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState<'manuscript' | 'cover' | null>(null);

  useEffect(() => {
    getManuscriptById(params.id).then((res) => setManuscript(res.data)).catch(() => setError('Could not load this manuscript'));
  }, [params.id]);

  const onDownload = async (file: 'manuscript' | 'cover') => {
    setDownloading(file);
    try {
      const { url } = await getManuscriptFileUrl(params.id, file);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      alert(err instanceof ApiClientError ? err.message : 'Could not generate a download link');
    } finally {
      setDownloading(null);
    }
  };

  if (error) return <p className="field-error">{error}</p>;
  if (!manuscript) {
    return <p className="flex items-center gap-2 text-sm text-ink-soft"><Loader2 size={14} className="animate-spin" /> Loading…</p>;
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title={manuscript.bookTitle} description={`Submitted ${formatDate(manuscript.createdAt)}`} />

      <Badge tone={manuscript.status === 'Published' ? 'success' : manuscript.status === 'Rejected' ? 'danger' : 'gold'}>
        {manuscript.status}
      </Badge>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-rule pt-6 sm:grid-cols-3">
        {FIELDS.map(({ key, label }) => (
          manuscript[key] ? (
            <div key={key}>
              <dt className="text-xs uppercase tracking-wide text-ink-soft">{label}</dt>
              <dd className="mt-1 text-sm font-medium text-ink">{String(manuscript[key])}</dd>
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
          {downloading === 'manuscript' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          Download Manuscript
        </button>
        {manuscript.coverFileUrl && (
          <button type="button" onClick={() => onDownload('cover')} disabled={downloading === 'cover'} className="btn-outline text-sm">
            {downloading === 'cover' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            Download Cover
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-ink-soft">Download links are generated on demand and expire after 5 minutes.</p>
    </div>
  );
}
