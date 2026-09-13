import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, signToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

// PATCH /api/auth/profile — update profile details (e.g. display name)
export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Display name cannot be empty" },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: {
        name: name.trim(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // Re-issue updated JWT token with new name
    const newToken = await signToken({
      userId: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
    });

    const response = NextResponse.json({
      success: true,
      user: updatedUser,
      message: "Profile updated successfully",
    });

    const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol;
    const isHttps = proto.includes("https");

    response.cookies.set("ray_token", newToken, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("PATCH /api/auth/profile error:", error);
    return NextResponse.json(
      { error: error?.message || "Server error" },
      { status: 500 }
    );
  }
}
