import { Schema, model, Document, Model, Types } from 'mongoose';

export const NOTIFICATION_TYPES = ['manuscript_received', 'manuscript_status', 'book_published'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface INotification extends Document {
  user: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  /** Same-site path only (e.g. /author/submissions/<id>). */
  link?: string;
  readAt: Date | null;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, maxlength: 140 },
    message: { type: String, required: true, maxlength: 600 },
    link: { type: String, maxlength: 200 },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
notificationSchema.index({ user: 1, createdAt: -1 });

export const Notification: Model<INotification> = model<INotification>('Notification', notificationSchema);
