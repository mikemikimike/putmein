import { NextResponse, NextRequest } from 'next/server'; // Use NextRequest for better types
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs'; // Changed from * as bcrypt
import prisma from '@/lib/prisma';

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

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Basic validation to prevent runtime crashes if body is empty
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // We check !user or !user.password (if your schema allows null passwords)
    if (!user || !user.password) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // bcryptjs.compare is the correct way to handle the promise
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create JWT
    const token = await new SignJWT({ 
      userId: user.id, 
      email: user.email, 
      role: user.role 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(getJwtSecret());

    const response = NextResponse.json({ 
      success: true,
      user: { email: user.email, name: user.name, role: user.role } 
    });

    // Set cookie
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}