import type { Role } from './types';

export const isAdminRole = (role: Role | string | null | undefined): boolean => role === 'admin' || role === 'superadmin';

/** Where each kind of account lands after signing in. */
export const homeFor = (role: Role): string => (isAdminRole(role) ? '/admin/dashboard' : '/author/dashboard');
