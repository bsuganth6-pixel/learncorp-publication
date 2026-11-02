import type { ManuscriptStatus } from '../models/Manuscript';

/**
 * Editorial decisions an admin can make, by current status. Publishing is deliberately absent:
 * "Accepted" becomes "Published" only through the publish action, which also creates the catalogue entry.
 */
export const ADMIN_TRANSITIONS: Readonly<Record<ManuscriptStatus, readonly ManuscriptStatus[]>> = {
  Submitted: ['Under Review', 'Accepted', 'Rejected', 'Changes Requested'],
  'Under Review': ['Accepted', 'Rejected', 'Changes Requested'],
  'Changes Requested': ['Rejected'], // otherwise waiting on the author
  Accepted: [],
  Rejected: [],
  Published: [],
};

export const ADMIN_DECISIONS = ['Under Review', 'Accepted', 'Rejected', 'Changes Requested'] as const;
export type AdminDecision = (typeof ADMIN_DECISIONS)[number];

/** Decisions that must tell the author why. */
export const NOTE_REQUIRED: readonly ManuscriptStatus[] = ['Rejected', 'Changes Requested'];

export const canAdminTransition = (from: ManuscriptStatus, to: ManuscriptStatus): boolean =>
  ADMIN_TRANSITIONS[from]?.includes(to) ?? false;

/** Authors may edit and resubmit only when the editors asked for changes. */
export const canAuthorResubmit = (status: ManuscriptStatus): boolean => status === 'Changes Requested';

export interface StatusCopy {
  headline: string;
  message: string;
}

/** What the author is told when their manuscript reaches a status. */
export function statusCopy(status: ManuscriptStatus, bookTitle: string): StatusCopy {
  switch (status) {
    case 'Under Review':
      return { headline: 'Your manuscript is under review', message: `Our editors have started reviewing “${bookTitle}”.` };
    case 'Changes Requested':
      return { headline: 'Changes requested', message: `The editors have asked for changes to “${bookTitle}”. Read their note, update your submission and resubmit it.` };
    case 'Accepted':
      return { headline: 'Your manuscript was accepted', message: `“${bookTitle}” has been accepted for publication. We’ll move it into production next.` };
    case 'Rejected':
      return { headline: 'Your manuscript was not accepted', message: `We’re sorry — “${bookTitle}” wasn’t accepted for publication.` };
    case 'Published':
      return { headline: 'Your book is published', message: `“${bookTitle}” is now live in the LearnCorp Publication catalogue.` };
    case 'Submitted':
      return { headline: 'Manuscript received', message: `We’ve received “${bookTitle}”. Our editors will review it and update you here.` };
  }
}
