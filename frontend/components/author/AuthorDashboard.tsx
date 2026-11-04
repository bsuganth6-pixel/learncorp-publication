'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Bell, FilePlus2, FileText } from 'lucide-react';
import { getMySubmissions, getNotifications } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { formatDate } from '@/lib/utils';
import type { AppNotification, AuthorSubmission } from '@/lib/types';
import Alert from '@/components/ui/Alert';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import ResendVerification from './ResendVerification';

export default function AuthorDashboard() {
  const { state } = useAuth();
  const params = useSearchParams();
  const user = state.user;
  const [submissions, setSubmissions] = useState<AuthorSubmission[] | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getMySubmissions({ limit: 50 }).then((r) => setSubmissions(r.data)).catch(() => { setSubmissions([]); setFailed(true); });
    getNotifications({ limit: 4 }).then((r) => setNotifications(r.data)).catch(() => setNotifications([]));
  }, []);

  const count = (...statuses: string[]) => submissions?.filter((s) => statuses.includes(s.status)).length ?? 0;
  const needAttention = submissions?.filter((s) => s.canResubmit) ?? [];
  const unverified = user?.role === 'author' && !user.emailVerified;
  const welcome = params.get('welcome') === '1';
  const mailSent = params.get('mail') !== '0';

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">{welcome ? 'Welcome' : 'Welcome back'}{user ? `, ${user.name.split(' ')[0]}` : ''}</h1>
          <p className="mt-1 text-sm text-ink-soft">Here’s where your manuscripts stand.</p>
        </div>
        {unverified ? (
          <span className="btn-outline pointer-events-none cursor-not-allowed opacity-50" aria-disabled="true">
            <FilePlus2 size={16} aria-hidden="true" /> New submission
          </span>
        ) : (
          <Link href="/publish" className="btn-gold"><FilePlus2 size={16} aria-hidden="true" /> New submission</Link>
        )}
      </div>

      {unverified && (
        <div className="mt-6 space-y-3">
          <Alert tone="warning" title="Confirm your email to submit manuscripts">
            {welcome && mailSent
              ? <>We sent a confirmation link to <strong className="text-ink">{user?.email}</strong>. Open it to unlock submissions.</>
              : welcome && !mailSent
                ? <>We couldn’t send the confirmation email just now. Use the button below to try again.</>
                : <>Use the link we emailed you, or request a new one below.</>}
          </Alert>
          <ResendVerification compact />
        </div>
      )}

      {failed && <Alert tone="error" className="mt-6">We couldn’t load your submissions. Refresh the page to try again.</Alert>}

      {needAttention.length > 0 && (
        <section className="mt-8" aria-labelledby="attention-heading">
          <h2 id="attention-heading" className="font-display text-xl text-ink">Needs your attention</h2>
          <ul className="mt-3 space-y-3">
            {needAttention.map((s) => (
              <li key={s.id} className="rounded-sm border border-warning/50 bg-warning/10 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{s.bookTitle}</p>
                    <p className="mt-1 text-sm text-ink-soft">
                      The editors asked for changes{s.latestFeedback?.note ? `: “${truncate(s.latestFeedback.note, 140)}”` : '.'}
                    </p>
                  </div>
                  <Link href={`/author/submissions/${s.id}#resubmit`} className="btn-primary px-4 py-2 text-sm">Update &amp; resubmit</Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <dl className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Submissions" value={submissions ? submissions.length : null} />
        <Stat label="In review" value={submissions ? count('Submitted', 'Under Review') : null} />
        <Stat label="Changes requested" value={submissions ? count('Changes Requested') : null} />
        <Stat label="Published" value={submissions ? count('Published') : null} />
      </dl>

      <div className="mt-10 grid gap-10 lg:grid-cols-[3fr_2fr]">
        <section aria-labelledby="recent-heading">
          <div className="flex items-center justify-between">
            <h2 id="recent-heading" className="font-display text-xl text-ink">Recent submissions</h2>
            <Link href="/author/submissions" className="inline-flex items-center gap-1 text-sm font-medium text-gold hover:underline">View all <ArrowRight size={14} aria-hidden="true" /></Link>
          </div>
          <div className="mt-4">
            {submissions === null ? (
              <p className="text-sm text-ink-soft">Loading…</p>
            ) : submissions.length === 0 ? (
              <EmptyState title="No submissions yet" description={unverified ? 'Confirm your email, then submit your first manuscript.' : 'Submit your first manuscript and follow it here, step by step.'} />
            ) : (
              <ul className="divide-y divide-rule rounded-sm border border-rule bg-surface">
                {submissions.slice(0, 5).map((s) => (
                  <li key={s.id}>
                    <Link href={`/author/submissions/${s.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3.5 hover:bg-ink/[0.03]">
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 font-medium text-ink"><FileText size={15} className="shrink-0 text-ink-soft" aria-hidden="true" /><span className="truncate">{s.bookTitle}</span></span>
                        <span className="mt-0.5 block text-xs text-ink-soft">Updated {formatDate(s.updatedAt)}</span>
                      </span>
                      <StatusBadge status={s.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section aria-labelledby="updates-heading">
          <div className="flex items-center justify-between">
            <h2 id="updates-heading" className="font-display text-xl text-ink">Latest updates</h2>
            <Link href="/author/notifications" className="inline-flex items-center gap-1 text-sm font-medium text-gold hover:underline">All <ArrowRight size={14} aria-hidden="true" /></Link>
          </div>
          <div className="mt-4">
            {notifications.length === 0 ? (
              <p className="flex items-center gap-2 rounded-sm border border-dashed border-rule px-4 py-6 text-sm text-ink-soft"><Bell size={16} aria-hidden="true" /> Nothing new yet.</p>
            ) : (
              <ul className="space-y-2">
                {notifications.map((n) => (
                  <li key={n.id} className="rounded-sm border border-rule bg-surface px-4 py-3">
                    <Link href={n.link ?? '/author/notifications'} className="block">
                      <span className="flex items-center gap-2 text-sm font-medium text-ink">
                        {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-gold" aria-label="Unread" />}
                        {n.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-soft">{formatDate(n.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-sm border border-rule bg-surface px-4 py-4">
      <dt className="text-xs font-medium text-ink-soft">{label}</dt>
      <dd className="mt-1 font-display text-3xl text-ink">{value ?? '–'}</dd>
    </div>
  );
}

const truncate = (text: string, max: number): string => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);
