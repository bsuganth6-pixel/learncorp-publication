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
