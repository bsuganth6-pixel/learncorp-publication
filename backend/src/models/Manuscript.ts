import { Schema, model, Document, Model } from 'mongoose';
import { BOOK_FORMATS, BookFormat } from './Book';

export const MANUSCRIPT_STATUSES = [
  'Submitted',
  'Under Review',
  'Accepted',
  'Rejected',
  'Published',
] as const;
export type ManuscriptStatus = (typeof MANUSCRIPT_STATUSES)[number];

export interface IManuscript extends Document {
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
  manuscriptFileKey: string;
  coverFileUrl?: string;
  coverFileKey?: string;
  additionalInfo?: string;
  agreedToTerms: boolean;
  status: ManuscriptStatus;
  createdAt: Date;
  updatedAt: Date;
}

const manuscriptSchema = new Schema<IManuscript>(
  {
    authorName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    bookTitle: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    language: { type: String, required: true, default: 'English' },
    pageCount: { type: Number, min: 1 },
    description: { type: String, required: true },
    authorBio: { type: String, required: true },
    format: { type: String, enum: BOOK_FORMATS, required: true },
    previousExperience: { type: String, default: '' },
    manuscriptFileUrl: { type: String, required: true },
    manuscriptFileKey: { type: String, required: true },
    coverFileUrl: { type: String },
    coverFileKey: { type: String },
    additionalInfo: { type: String, default: '' },
    agreedToTerms: { type: Boolean, required: true },
    status: { type: String, enum: MANUSCRIPT_STATUSES, default: 'Submitted', index: true },
  },
  { timestamps: true }
);

export const Manuscript: Model<IManuscript> = model<IManuscript>('Manuscript', manuscriptSchema);
