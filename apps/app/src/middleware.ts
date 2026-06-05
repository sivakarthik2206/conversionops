import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify',
  '/api/',
  '/_next',
  '/favicon',
  '/robots.txt',
  '/sitemap.xml',
];

// Statuses that can access the full dashboard
const PAID_STATUSES = new Set(['ACTIVE', 'TRIAL']);

/**
 * Decodes JWT payload without verifying signature.
 * Safe for edge runtime — only used to read plan/status for routing decisions.
 * Real verification happens in the API on every request.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Always allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('co_token')?.value;

  // No token → redirect to login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Decode JWT to check workspace status for paywall
  const payload = decodeJwtPayload(token);
  const status = payload?.status as string | undefined;

  // If workspace is not paid, only allow /settings/billing
  if (status && !PAID_STATUSES.has(status)) {
    if (!pathname.startsWith('/settings/billing')) {
      return NextResponse.redirect(new URL('/settings/billing', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
