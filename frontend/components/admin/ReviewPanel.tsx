'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { updateManuscriptStatus, ApiClientError } from '@/lib/api-client';
import type { Manuscript, ManuscriptStatus } from '@/lib/types';
import Alert from '@/components/ui/Alert';

type Decision = Extract<ManuscriptStatus, 'Under Review' | 'Changes Requested' | 'Accepted' | 'Rejected'>;

// Mirrors the server's workflow (backend/src/services/manuscriptWorkflow.ts); the API enforces it either way.
const OPTIONS: Record<ManuscriptStatus, Decision[]> = {
  Submitted: ['Under Review', 'Changes Requested', 'Accepted', 'Rejected'],
  'Under Review': ['Changes Requested', 'Accepted', 'Rejected'],
  'Changes Requested': ['Rejected'],
  Accepted: [],
  Rejected: [],
  Published: [],
};

const NOTE_REQUIRED: Decision[] = ['Changes Requested', 'Rejected'];

const COPY: Record<Decision, { button: string; confirm: string; noteLabel: string; style: string }> = {
  'Under Review': { button: 'Start review', confirm: 'Start review', noteLabel: 'Note to the author (optional)', style: 'btn-outline' },
  'Changes Requested': { button: 'Request changes', confirm: 'Send request', noteLabel: 'What should the author change? (shown to them)', style: 'btn-outline' },
  Accepted: { button: 'Accept', confirm: 'Accept manuscript', noteLabel: 'Note to the author (optional)', style: 'btn-primary' },
  Rejected: { button: 'Reject', confirm: 'Reject manuscript', noteLabel: 'Why isn’t it being accepted? (shown to the author)', style: 'btn-outline' },
};

const NOTE_MIN = 10;

export default function ReviewPanel({ manuscript, onDecided }: { manuscript: Manuscript; onDecided: () => void }) {
  const [pending, setPending] = useState<Decision | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const options = OPTIONS[manuscript.status] ?? [];
  const hasAccount = Boolean(manuscript.author);

  const cancel = () => { setPending(null); setNote(''); setError(''); };

  const confirm = async () => {
    if (!pending) return;
    if (NOTE_REQUIRED.includes(pending) && note.trim().length < NOTE_MIN) {
      setError(`Write at least ${NOTE_MIN} characters so the author knows what to do next.`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await updateManuscriptStatus(manuscript._id, pending, note.trim() || undefined);
      cancel();
      onDecided();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not record that decision.');
    } finally {
      setBusy(false);
    }
  };

  if (options.length === 0) return null;

  return (
    <section className="mt-8 rounded-sm border border-rule bg-surface p-5 shadow-card" aria-labelledby="review-heading">
      <h2 id="review-heading" className="font-display text-lg text-ink">Editorial decision</h2>
      <p className="mt-1 text-sm text-ink-soft">
        {manuscript.status === 'Changes Requested'
          ? 'Waiting for the author to resubmit. You can still reject the manuscript.'
          : hasAccount
            ? 'The author is notified in the app and by email.'
            : 'This submission predates author accounts, so there is no one to notify in the app.'}
      </p>

      {!pending ? (
        <div className="mt-4 flex flex-wrap gap-3">
          {options.map((decision) => (
            <button key={decision} type="button" onClick={() => setPending(decision)} className={`${COPY[decision].style} px-4 py-2 text-sm`}>
              {COPY[decision].button}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <label htmlFor="decision-note" className="field-label">{COPY[pending].noteLabel}</label>
          <textarea
            id="decision-note"
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="field-input"
            aria-invalid={error ? true : undefined}
            maxLength={2000}
          />
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={confirm} disabled={busy} className="btn-primary px-4 py-2 text-sm">
              {busy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />} {COPY[pending].confirm}
            </button>
            <button type="button" onClick={cancel} disabled={busy} className="btn-outline px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}
