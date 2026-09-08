import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/github/status — check if user has connected GitHub
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const integration = await prisma.rayGithubIntegration.findFirst({
      where: { userId: user.userId },
      select: { id: true, githubUsername: true, avatarUrl: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json({
      connected: !!integration,
      integration: integration || null,
    });
  } catch (err) {
    console.error("GET /api/github/status:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
