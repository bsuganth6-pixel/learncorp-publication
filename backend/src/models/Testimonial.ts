import { Schema, model, Document, Model } from 'mongoose';

export interface ITestimonial extends Document {
  name: string;
  designation?: string;
  message: string;
  photoUrl?: string;
  status: 'published' | 'unpublished';
  createdAt: Date;
  updatedAt: Date;
}

const testimonialSchema = new Schema<ITestimonial>(
  {
    name: { type: String, required: true, trim: true },
    designation: { type: String, default: '' },
    message: { type: String, required: true },
    photoUrl: { type: String, default: '' },
    status: { type: String, enum: ['published', 'unpublished'], default: 'unpublished' },
  },
  { timestamps: true }
);

export const Testimonial: Model<ITestimonial> = model<ITestimonial>(
  'Testimonial',
  testimonialSchema
);
