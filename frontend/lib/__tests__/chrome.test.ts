import { describe, it, expect } from 'vitest';
import { isChromeless } from '../chrome';
import { isAdminRole, homeFor } from '../roles';

describe('isChromeless (screens that draw their own frame)', () => {
  it.each(['/admin/login', '/admin/dashboard/users', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email'])('%s has no site header or footer', (p) => {
    expect(isChromeless(p)).toBe(true);
  });
  it.each(['/', '/books', '/publish', '/author/dashboard', '/account', '/administration', '/login-help', null, undefined])('%s keeps them', (p) => {
    expect(isChromeless(p as string | null | undefined)).toBe(false);
  });
});

describe('roles', () => {
  it('identifies administrators', () => {
    expect(isAdminRole('admin')).toBe(true);
    expect(isAdminRole('superadmin')).toBe(true);
    expect(isAdminRole('author')).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
  });
  it('sends each kind of account to its own home', () => {
    expect(homeFor('author')).toBe('/author/dashboard');
    expect(homeFor('admin')).toBe('/admin/dashboard');
    expect(homeFor('superadmin')).toBe('/admin/dashboard');
  });
});
