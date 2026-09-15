import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { formatDatabaseErrorResponse } from "@/lib/db-errors";
import { getClientIp, authRateLimiter } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);

    // Guard: Check rate limit for client IP
    const ipCheck = authRateLimiter.check(`ip:${clientIp}`);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        { error: `Too many failed login attempts from this IP. Please try again in ${ipCheck.resetInSeconds} seconds.` },
        {
          status: 429,
          headers: { "Retry-After": String(ipCheck.resetInSeconds) },
        }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const { email, password } = body;

    // Strict validation before touching database
    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Guard: Check rate limit for target account
    const emailCheck = authRateLimiter.check(`email:${cleanEmail}`);
    if (!emailCheck.allowed) {
      return NextResponse.json(
        { error: `Too many failed login attempts for this account. Please try again in ${emailCheck.resetInSeconds} seconds.` },
        {
          status: 429,
          headers: { "Retry-After": String(emailCheck.resetInSeconds) },
        }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    // Find user in the shared users table
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      authRateLimiter.consume(`ip:${clientIp}`);
      authRateLimiter.consume(`email:${cleanEmail}`);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      authRateLimiter.consume(`ip:${clientIp}`);
      authRateLimiter.consume(`email:${cleanEmail}`);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Reset rate limiter on successful login
    authRateLimiter.reset(`ip:${clientIp}`);
    authRateLimiter.reset(`email:${cleanEmail}`);

    // Sign JWT
    const token = await signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // Set HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    const proto = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol;
    const isHttps = proto.includes("https");

    response.cookies.set("ray_token", token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    const err = error as Error | undefined;
    console.error("Login route error:", err?.message || error);
    if (err?.stack) console.error(err.stack);
    if (err?.cause) console.error("Error cause:", err.cause);

    const errorInfo = formatDatabaseErrorResponse(error);
    if (errorInfo.isDbInitError) {
      return NextResponse.json(
        {
          error: errorInfo.userMessage,
          isDbInitError: true,
          command: errorInfo.command,
          hint: errorInfo.hint,
          code: errorInfo.code,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: errorInfo.userMessage,
        isDbInitError: false,
      },
      { status: 500 }
    );
  }
}
