/** Screens that draw their own frame: no site header or footer around them. */
const CHROMELESS_PREFIXES = ['/admin', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

export function isChromeless(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return CHROMELESS_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
