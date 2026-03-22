import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, TOKEN_VALUE } from '@/lib/auth';

const PUBLIC_PATHS = ['/login', '/api/auth/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths through
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(COOKIE_NAME);
  const isAuthenticated = cookie?.value === TOKEN_VALUE;

  if (isAuthenticated) {
    return NextResponse.next();
  }

  // API routes get a 401 JSON response
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  // Page routes redirect to login
  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
