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

export type ManuscriptStatus = 'Submitted' | 'Under Review' | 'Accepted' | 'Rejected' | 'Published';

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
  createdAt: string;
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

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'superadmin';
}

export interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; pages: number };
}
