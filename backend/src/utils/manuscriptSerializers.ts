import type { IManuscript, IManuscriptEvent } from '../models/Manuscript';
import { canAuthorResubmit } from '../services/manuscriptWorkflow';

/**
 * What an author sees of their own submission. Explicit fields only: storage keys, file URLs and
 * admin identities never leave the API on this path (files are fetched through signed links).
 */
export function toAuthorView(manuscript: IManuscript, bookSlug?: string) {
  const timeline = manuscript.history.map((event: IManuscriptEvent) => ({
    status: event.status,
    note: event.note ?? null,
    // Authors see "Editorial team", not which staff member acted.
    by: event.actor === 'admin' ? 'Editorial team' : 'You',
    at: event.at,
  }));
  const latestFeedback = [...timeline].reverse().find((e) => e.by === 'Editorial team' && e.note);

  return {
    id: manuscript.id as string,
    bookTitle: manuscript.bookTitle,
    category: manuscript.category,
    language: manuscript.language,
    format: manuscript.format,
    pageCount: manuscript.pageCount ?? null,
    description: manuscript.description,
    authorBio: manuscript.authorBio,
    phone: manuscript.phone,
    previousExperience: manuscript.previousExperience ?? '',
    additionalInfo: manuscript.additionalInfo ?? '',
    status: manuscript.status,
    version: manuscript.version,
    hasCover: Boolean(manuscript.coverFileKey),
    canResubmit: canAuthorResubmit(manuscript.status),
    latestFeedback: latestFeedback ? { note: latestFeedback.note, at: latestFeedback.at, status: latestFeedback.status } : null,
    history: timeline,
    bookSlug: bookSlug ?? null,
    createdAt: manuscript.createdAt,
    updatedAt: manuscript.updatedAt,
  };
}
