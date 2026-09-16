import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const INSECURE_JWT_DEFAULTS = [
  'putmein-jwt-secret-default-key-2024',
  'fallback-secret-for-dev-only',
  'secret',
  'test',
  'dev',
  '123456',
  'password',
  'default',
];

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || INSECURE_JWT_DEFAULTS.includes(secret)) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is missing or using an insecure default key in production.');
    }
  }
  return new TextEncoder().encode(secret || 'dev-only-local-secret-do-not-use-in-production');
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes
  if (pathname.startsWith('/admin')) {
    // Skip protection for login page if it's under /admin (though we usually put it at /login)
    if (pathname === '/admin/login') {
      return NextResponse.next();
    }

    const token = request.cookies.get('admin_token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      await jwtVerify(token, getJwtSecret());
      return NextResponse.next();
    } catch (error) {
      console.error('JWT verification failed:', error);
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
