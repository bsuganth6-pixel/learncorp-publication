/**
 * Post-login redirect target taken from the `?next=` query param. That param is
 * attacker-controllable (anyone can craft a link to the real login page), so
 * only same-origin /admin/* paths are honoured — otherwise a phishing link
 * could bounce a freshly signed-in admin to an external lookalike site.
 */
export function safeAdminRedirect(next: string | null | undefined, fallback = '/admin/dashboard'): string {
  if (!next) return fallback;
  if (!next.startsWith('/admin/')) return fallback; // also rejects "//evil.com" and absolute URLs
  if (next.startsWith('/admin/login')) return fallback; // pointless loop
  if (next.includes('\\') || /[\u0000-\u001f]/.test(next)) return fallback; // backslash / control-char tricks
  if (next.split('/').includes('..')) return fallback;
  return next;
}

/**
 * Same rule for authors and visitors: after signing in, only same-site paths are honoured, never
 * an absolute URL, and never the admin area or the auth pages themselves (no loops, no hand-offs).
 */
const AUTH_PAGES = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

export function safeSiteRedirect(next: string | null | undefined, fallback = '/author/dashboard'): string {
  if (!next) return fallback;
  if (!next.startsWith('/') || next.startsWith('//')) return fallback; // absolute or protocol-relative URL
  if (next.includes('\\') || /[\u0000-\u001f]/.test(next)) return fallback;
  if (next.split('?')[0].split('/').includes('..')) return fallback;
  const path = next.split(/[?#]/)[0];
  if (path === '/admin' || path.startsWith('/admin/')) return fallback;
  if (AUTH_PAGES.some((page) => path === page || path.startsWith(`${page}/`))) return fallback;
  return next;
}
