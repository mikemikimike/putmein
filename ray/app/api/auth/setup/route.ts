import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { signToken } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/auth/setup — Initial First-Time Administrator Onboarding
export async function POST(request: NextRequest) {
  try {
    // 1. Guard: check if an admin account with a password already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        role: "ADMIN",
        password: { not: "" },
      },
      select: { id: true },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: "Initial setup has already been completed. Please sign in." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { name, email, password, confirmPassword } = body;

    // 2. Validate input fields
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Name / Username is required" },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.toLowerCase().trim();
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
    }

    // 3. Hash password securely with bcrypt (cost factor 12)
    const hashedPassword = await bcrypt.hash(password, 12);
    const cleanName = name.trim();

    // 4. Create or update the admin record
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    let adminUser;
    if (existingUser) {
      adminUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: cleanName,
          password: hashedPassword,
          role: "ADMIN",
        },
      });
    } else {
      adminUser = await prisma.user.create({
        data: {
          name: cleanName,
          email: cleanEmail,
          password: hashedPassword,
          role: "ADMIN",
        },
      });
    }

    // 5. Sign authentication JWT
    const token = await signToken({
      userId: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role,
    });

    // 6. Return response and set session cookie
    const response = NextResponse.json({
      success: true,
      message: "Administrator account initialized successfully",
      user: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
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
  } catch (error: any) {
    console.error("POST /api/auth/setup error:", error);
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred during setup." },
      { status: 500 }
    );
  }
}
