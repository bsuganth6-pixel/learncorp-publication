import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = process.env.COOKIE_NAME || 'bp_session';

// Lightweight presence check only — redirects a visitor with no session
// cookie away from the dashboard for UX. It does NOT verify the token
// (that needs Node's crypto, unavailable on the Edge runtime here); the
// Express API independently verifies and authorizes every request, which
// is the actual security boundary.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin/dashboard')) {
    const hasSession = request.cookies.has(COOKIE_NAME);
    if (!hasSession) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/dashboard/:path*'],
};
