import { Schema, model, Document, Model, Types } from 'mongoose';

export const BOOK_FORMATS = ['Paperback', 'Hardcover', 'eBook', 'PDF', 'Audiobook'] as const;
export type BookFormat = (typeof BOOK_FORMATS)[number];

export interface IReview {
  name: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export interface IBook extends Document {
  title: string;
  slug: string;
  authors: Types.ObjectId[];
  description: string;
  isbn: string;
  category: string;
  language: string;
  publicationDate?: Date;
  pages?: number;
  format: BookFormat;
  price: number;
  coverImageUrl: string;
  keywords: string[];
  publisher: string;
  tableOfContents?: string;
  reviews: IReview[];
  ratingsAvg: number;
  status: 'draft' | 'published';
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const bookSchema = new Schema<IBook>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    // `required: true` on the element type would not enforce a non-empty array,
    // so the minimum is a validator on the array itself.
    authors: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Author' }],
      validate: {
        validator: (v: Types.ObjectId[]) => Array.isArray(v) && v.length > 0,
        message: 'A book needs at least one author',
      },
    },
    description: { type: String, required: true },
    isbn: { type: String, required: true, unique: true, trim: true },
    category: { type: String, required: true, index: true },
    language: { type: String, required: true, default: 'English' },
    publicationDate: { type: Date },
    pages: { type: Number, min: 1 },
    format: { type: String, enum: BOOK_FORMATS, required: true },
    price: { type: Number, required: true, min: 0 },
    coverImageUrl: { type: String, required: true },
    keywords: [{ type: String, index: true }],
    publisher: { type: String, default: 'LearnCorp Publication' },
    tableOfContents: { type: String },
    reviews: { type: [reviewSchema], default: [] },
    ratingsAvg: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
  },
  { timestamps: true }
);

bookSchema.index({ title: 'text', keywords: 'text', description: 'text' });

export function computeRatingsAvg(reviews: Pick<IReview, 'rating'>[]): number {
  if (!reviews || reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

bookSchema.pre('save', function (next) {
  this.ratingsAvg = computeRatingsAvg(this.reviews);
  next();
});

export const Book: Model<IBook> = model<IBook>('Book', bookSchema);
