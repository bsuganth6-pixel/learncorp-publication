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
