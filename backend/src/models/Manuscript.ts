import { Schema, model, Document, Model, Types } from 'mongoose';
import { BOOK_FORMATS, BookFormat } from './Book';

export const MANUSCRIPT_STATUSES = [
  'Submitted',
  'Under Review',
  'Changes Requested',
  'Accepted',
  'Rejected',
  'Published',
] as const;
export type ManuscriptStatus = (typeof MANUSCRIPT_STATUSES)[number];

/** One entry in a submission's timeline. `note` is feedback the author can read. */
export interface IManuscriptEvent {
  status: ManuscriptStatus;
  note?: string;
  actor: 'author' | 'admin';
  by?: Types.ObjectId;
  at: Date;
}

/** Files replaced by a resubmission are kept (keys only) so the editorial history stays intact. */
export interface IPreviousVersion {
  version: number;
  manuscriptFileKey: string;
  coverFileKey?: string;
  submittedAt: Date;
}

export interface IManuscript extends Document {
  /** Owning author account. Absent only on submissions made before accounts existed. */
  author?: Types.ObjectId;
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
  version: number;
  history: IManuscriptEvent[];
  previousVersions: IPreviousVersion[];
  /** The catalogue entry created when this manuscript was published. */
  book?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IManuscriptEvent>(
  {
    status: { type: String, enum: MANUSCRIPT_STATUSES, required: true },
    note: { type: String, maxlength: 2000 },
    actor: { type: String, enum: ['author', 'admin'], required: true },
    by: { type: Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const previousVersionSchema = new Schema<IPreviousVersion>(
  {
    version: { type: Number, required: true },
    manuscriptFileKey: { type: String, required: true },
    coverFileKey: { type: String },
    submittedAt: { type: Date, required: true },
  },
  { _id: false }
);

const manuscriptSchema = new Schema<IManuscript>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', index: true },
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
    version: { type: Number, default: 1, min: 1 },
    history: { type: [eventSchema], default: [] },
    previousVersions: { type: [previousVersionSchema], default: [] },
    book: { type: Schema.Types.ObjectId, ref: 'Book' },
  },
  { timestamps: true }
);

export const Manuscript: Model<IManuscript> = model<IManuscript>('Manuscript', manuscriptSchema);
