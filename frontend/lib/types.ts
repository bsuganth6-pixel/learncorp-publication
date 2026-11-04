export type BookFormat = 'Paperback' | 'Hardcover' | 'eBook' | 'PDF' | 'Audiobook';

export interface Author {
  _id: string;
  name: string;
  slug: string;
  bio?: string;
  photoUrl?: string;
  qualifications?: string;
  socialLinks?: {
    website?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    facebook?: string;
  };
  createdAt: string;
}

export interface AuthorRef {
  _id: string;
  name: string;
  slug: string;
  photoUrl?: string;
  bio?: string;
}

export interface Review {
  name: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Book {
  _id: string;
  title: string;
  slug: string;
  authors: AuthorRef[];
  description: string;
  isbn: string;
  category: string;
  language: string;
  publicationDate?: string;
  pages?: number;
  format: BookFormat;
  price: number;
  coverImageUrl: string;
  keywords: string[];
  publisher: string;
  tableOfContents?: string;
  reviews: Review[];
  ratingsAvg: number;
  status: 'draft' | 'published';
  createdAt: string;
}

export type ManuscriptStatus =
  | 'Submitted' | 'Under Review' | 'Changes Requested' | 'Accepted' | 'Rejected' | 'Published';

export interface ManuscriptEvent {
  status: ManuscriptStatus;
  note?: string;
  actor: 'author' | 'admin';
  by?: { _id: string; name: string } | string;
  at: string;
}

export interface Manuscript {
  _id: string;
  authorName: string;
  email: string;
  phone: string;
  bookTitle: string;
  category: string;
  language: string;
  pageCount?: number;
  description: string;
  authorBio: string;
  format: BookFormat;
  previousExperience?: string;
  manuscriptFileUrl: string;
  coverFileUrl?: string;
  additionalInfo?: string;
  status: ManuscriptStatus;
  version?: number;
  /** Present on the detail view only. */
  history?: ManuscriptEvent[];
  /** The owning account (populated on the detail view). Missing for submissions made before accounts existed. */
  author?: { _id: string; name: string; email: string; status: string; emailVerified: boolean } | string | null;
  /** The catalogue entry, once published. */
  book?: { _id: string; slug: string; title: string } | string | null;
  createdAt: string;
  updatedAt?: string;
}

// ---- What an author sees of their own submission (no storage keys, no staff names) ----
export interface SubmissionEvent {
  status: ManuscriptStatus;
  note: string | null;
  /** Display name: "You" / "Editorial team" for authors, real names for administrators. */
  by: string;
  at: string;
}

export interface AuthorSubmission {
  id: string;
  bookTitle: string;
  category: string;
  language: string;
  format: BookFormat;
  pageCount: number | null;
  description: string;
  authorBio: string;
  phone: string;
  previousExperience: string;
  additionalInfo: string;
  status: ManuscriptStatus;
  version: number;
  hasCover: boolean;
  canResubmit: boolean;
  latestFeedback: { note: string | null; at: string; status: ManuscriptStatus } | null;
  history: SubmissionEvent[];
  bookSlug: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Testimonial {
  _id: string;
  name: string;
  designation?: string;
  message: string;
  photoUrl?: string;
  status: 'published' | 'unpublished';
  createdAt: string;
}

export type Role = 'author' | 'admin' | 'superadmin';

/** The signed-in account as the API reports it. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'active' | 'suspended';
  emailVerified: boolean;
  phone: string;
  bio: string;
  website: string;
  createdAt: string;
  lastLoginAt: string | null;
  unreadNotifications?: number;
}

export type AdminUser = AuthUser;

export interface ManagedUser extends AuthUser {
  submissions: number;
  suspensionReason: string;
}

export interface SessionInfo {
  id: string;
  device: string;
  ip: string;
  createdAt: string;
  lastSeenAt: string;
  persistent: boolean;
  current: boolean;
}

export interface AppNotification {
  id: string;
  type: 'manuscript_received' | 'manuscript_status' | 'book_published';
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  actorEmail: string;
  actorRole: string | null;
  targetType: string | null;
  targetId: string | null;
  summary: string;
  ip: string;
  createdAt: string;
}

export interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; pages: number };
}
