import { describe, it, expect } from 'vitest';
import { safeAdminRedirect } from '../safe-redirect';

describe('safeAdminRedirect (post-login ?next= handling)', () => {
  it('falls back when there is no next param', () => {
    expect(safeAdminRedirect(null)).toBe('/admin/dashboard');
    expect(safeAdminRedirect(undefined)).toBe('/admin/dashboard');
    expect(safeAdminRedirect('')).toBe('/admin/dashboard');
  });

  it('keeps legitimate admin paths, including query strings', () => {
    expect(safeAdminRedirect('/admin/dashboard/books')).toBe('/admin/dashboard/books');
    expect(safeAdminRedirect('/admin/dashboard/manuscripts?status=Submitted')).toBe('/admin/dashboard/manuscripts?status=Submitted');
  });

  it.each([
    'https://evil.example/phish', 'http://evil.example', '//evil.example', '///evil.example', '/\\evil.example',
    '/admin/\\..\\evil', 'javascript:alert(1)', '/books', 'admin/dashboard', '/admin/../evil',
    '/admin/dashboard\n//evil.example', '/admin/login', '/admin/login?next=/admin/login',
  ])('rejects %j and falls back', (input) => {
    expect(safeAdminRedirect(input)).toBe('/admin/dashboard');
  });
});

import { safeSiteRedirect } from '../safe-redirect';

describe('safeSiteRedirect (post-sign-in ?next= for authors and visitors)', () => {
  it('falls back when there is no next param', () => {
    expect(safeSiteRedirect(null)).toBe('/author/dashboard');
    expect(safeSiteRedirect('')).toBe('/author/dashboard');
    expect(safeSiteRedirect(undefined, '/somewhere')).toBe('/somewhere');
  });

  it('keeps same-site paths, including queries and hashes', () => {
    expect(safeSiteRedirect('/publish')).toBe('/publish');
    expect(safeSiteRedirect('/author/submissions/abc123#resubmit')).toBe('/author/submissions/abc123#resubmit');
    expect(safeSiteRedirect('/books?category=Fiction')).toBe('/books?category=Fiction');
  });

  it.each([
    'https://evil.example/phish', '//evil.example', '///evil.example', '/\\evil.example', 'javascript:alert(1)', 'author/dashboard',
    '/books/../../evil', '/publish\n//evil.example', '/publish\r\nSet-Cookie: x=1',
    // never hand a signed-in author to the admin area, or loop back into the auth screens
    '/admin', '/admin/dashboard', '/admin/login', '/login', '/register?next=/publish', '/forgot-password', '/reset-password?token=abc', '/verify-email',
  ])('rejects %j and falls back', (input) => {
    expect(safeSiteRedirect(input)).toBe('/author/dashboard');
  });
});
