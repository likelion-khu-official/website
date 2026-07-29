import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicAdminPath =
    pathname === '/admin/login' ||
    pathname.startsWith('/admin/invite') ||
    pathname.startsWith('/admin/password');

  if (pathname.startsWith('/admin') && !isPublicAdminPath) {
    if (!request.cookies.has('access_token')) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  const isPublicMemberPath =
    pathname === '/member/login' ||
    pathname.startsWith('/member/forgot-password');

  if (pathname.startsWith('/member') && !isPublicMemberPath) {
    if (!request.cookies.has('access_token')) {
      return NextResponse.redirect(new URL('/member/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/member/:path*'],
};
