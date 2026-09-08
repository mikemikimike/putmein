import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:3100";

// GET /api/projects/[id]/file-content?path=...
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const project = await prisma.rayMonitorProject.findFirst({
      where: { id, userId: user.userId },
      select: { id: true, projectPath: true },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const targetPath = req.nextUrl.searchParams.get("path");
    if (!targetPath) {
      return NextResponse.json({ error: "File path parameter required" }, { status: 400 });
    }

    const res = await fetch(
      `${BRAIN_URL}/v1/projects/file-content?path=${encodeURIComponent(targetPath)}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to read file" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/projects/[id]/file-content:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
