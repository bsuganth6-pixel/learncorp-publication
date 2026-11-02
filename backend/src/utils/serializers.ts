import type { IUser } from '../models/User';

/** The only shape in which a user ever leaves the API. Explicit field list: no password hash, no internals. */
export function serializeUser(user: IUser) {
  return {
    id: user.id as string,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    // Admin accounts are provisioned by staff and don't go through email confirmation.
    emailVerified: user.role === 'author' ? user.emailVerified : true,
    phone: user.phone ?? '',
    bio: user.bio ?? '',
    website: user.website ?? '',
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt ?? null,
  };
}
