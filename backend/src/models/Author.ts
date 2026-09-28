import { Schema, model, Document, Model, Types } from 'mongoose';

export interface ISocialLinks {
  website?: string;
  twitter?: string;
  linkedin?: string;
  instagram?: string;
  facebook?: string;
}

export interface IAuthor extends Document {
  name: string;
  slug: string;
  bio?: string;
  photoUrl?: string;
  qualifications?: string;
  socialLinks?: ISocialLinks;
  createdAt: Date;
  updatedAt: Date;
}

const authorSchema = new Schema<IAuthor>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    bio: { type: String, default: '' },
    photoUrl: { type: String, default: '' },
    qualifications: { type: String, default: '' },
    socialLinks: {
      website: String,
      twitter: String,
      linkedin: String,
      instagram: String,
      facebook: String,
    },
  },
  { timestamps: true }
);

export const Author: Model<IAuthor> = model<IAuthor>('Author', authorSchema);
export type AuthorId = Types.ObjectId;
