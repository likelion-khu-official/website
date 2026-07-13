import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_ADMIN_PATHS = new Set(['/admin/login', '/admin/forgot-password']);
const PUBLIC_ADMIN_PREFIXES = ['/admin/invite/', '/admin/reset-password/'];

function isPublicAdminPath(pathname: string) {
  return PUBLIC_ADMIN_PATHS.has(pathname) || PUBLIC_ADMIN_PREFIXES.some((p) => pathname.startsWith(p));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAccessToken = request.cookies.has('access_token');

  if (pathname === '/admin/login') {
    if (hasAccessToken) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  if (isPublicAdminPath(pathname)) {
    return NextResponse.next();
  }

  if (!hasAccessToken) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
