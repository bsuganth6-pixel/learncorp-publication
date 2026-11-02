import { Schema, model, Document, Model, Types } from 'mongoose';

export const AUDIT_ACTIONS = [
  'auth.admin_login',
  'auth.admin_login_failed',
  'auth.admin_logout',
  'user.suspended',
  'user.reactivated',
  'user.sessions_revoked',
  'manuscript.status_changed',
  'manuscript.published',
  'manuscript.file_accessed',
  'book.created',
  'book.updated',
  'book.deleted',
  'book.review_added',
  'book.review_deleted',
  'author.created',
  'author.updated',
  'author.deleted',
  'testimonial.created',
  'testimonial.updated',
  'testimonial.deleted',
  'message.deleted',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface IAuditLog extends Document {
  actor?: Types.ObjectId;
  actorEmail: string;
  actorRole?: string;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  summary: string;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

// Append-only by convention: nothing in the API updates or deletes these rows.
const auditLogSchema = new Schema<IAuditLog>(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User' },
    actorEmail: { type: String, required: true, maxlength: 254 },
    actorRole: { type: String },
    action: { type: String, required: true, index: true },
    targetType: { type: String },
    targetId: { type: String },
    summary: { type: String, required: true, maxlength: 500 },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
auditLogSchema.index({ createdAt: -1 });

export const AuditLog: Model<IAuditLog> = model<IAuditLog>('AuditLog', auditLogSchema);
