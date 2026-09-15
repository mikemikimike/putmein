import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { formatDatabaseErrorResponse } from "@/lib/db-errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user in the shared users table
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

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
