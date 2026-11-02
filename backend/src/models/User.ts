import { Schema, model, Document, Model } from 'mongoose';
import { hashPassword, verifyPassword } from '../utils/password';

export const USER_ROLES = ['author', 'admin', 'superadmin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ADMIN_ROLES = ['admin', 'superadmin'] as const;
export const isAdminRole = (role: string): boolean => (ADMIN_ROLES as readonly string[]).includes(role);

export const USER_STATUSES = ['active', 'suspended'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  emailVerifiedAt?: Date;
  phone?: string;
  bio?: string;
  website?: string;
  termsAcceptedAt?: Date;
  passwordChangedAt?: Date;
  lastLoginAt?: Date;
  suspendedAt?: Date;
  suspensionReason?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    password: { type: String, required: true, minlength: 8, select: false },
    // Least privilege by default: nothing creates an admin except the provisioning script.
    role: { type: String, enum: USER_ROLES, default: 'author' },
    status: { type: String, enum: USER_STATUSES, default: 'active' },
    emailVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date },
    phone: { type: String, trim: true, maxlength: 30, default: '' },
    bio: { type: String, trim: true, maxlength: 1000, default: '' },
    website: { type: String, trim: true, maxlength: 200, default: '' },
    termsAcceptedAt: { type: Date },
    passwordChangedAt: { type: Date },
    lastLoginAt: { type: Date },
    suspendedAt: { type: Date },
    suspensionReason: { type: String, maxlength: 300 },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await hashPassword(this.password);
  this.passwordChangedAt = new Date();
});

userSchema.methods.comparePassword = function (candidate: string) {
  return verifyPassword(candidate, this.password);
};

export const User: Model<IUser> = model<IUser>('User', userSchema);
