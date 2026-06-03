import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/verify',
  '/auth',
  '/onboarding',
  '/_next',
  '/favicon',
  '/api/',
  '/robots.txt',
  '/sitemap.xml',
];

/**
 * Next.js Edge middleware for route protection.
 * Dashboard routes require a valid co_token cookie.
 * Token validation is done server-side in the API; this guard
 * only prevents unauthenticated users from reaching the RSC layer.
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const token = request.cookies.get('co_token')?.value;
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
