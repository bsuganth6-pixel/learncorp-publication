import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = process.env.COOKIE_NAME || 'bp_session';

// Each protected area, and the sign-in page its visitors are sent to.
const PROTECTED: Array<{ prefix: string; login: string }> = [
  { prefix: '/admin/dashboard', login: '/admin/login' },
  { prefix: '/author', login: '/login' },
  { prefix: '/account', login: '/login' },
];

/**
 * Convenience only: a visitor with no session cookie at all is sent to the right sign-in page
 * without rendering anything. It does NOT decide who may see what. That happens twice more, both
 * authoritative: the area's layout asks the API who the cookie belongs to (lib/server-auth.ts) and
 * the API checks the role on every request. Also forwards the requested path so the layout can
 * send people back to it after they sign in.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const area = PROTECTED.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (area && !request.cookies.has(COOKIE_NAME)) {
    const loginUrl = new URL(area.login, request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const headers = new Headers(request.headers);
  headers.set('x-pathname', `${pathname}${search}`);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/admin/dashboard/:path*', '/author/:path*', '/account/:path*', '/account'],
};
