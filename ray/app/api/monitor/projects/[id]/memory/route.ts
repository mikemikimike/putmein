import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/monitor/projects/[id]/memory
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const project = await prisma.rayMonitorProject.findFirst({
      where: { id, userId: user.userId },
      select: { id: true, memory: true, memoryStatus: true },
    });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      memory: project.memory,
      memoryStatus: project.memoryStatus || "pending",
    });
  } catch (err) {
    console.error("GET /api/monitor/projects/[id]/memory:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PATCH /api/monitor/projects/[id]/memory  — called by Brain when analysis completes
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Accept both user-token (manual edit) and internal secret (Brain callback)
    const internalSecret = req.headers.get("x-internal-secret");
    const isInternal = internalSecret === process.env.BRAIN_INTERNAL_SECRET;

    if (!isInternal) {
      const cookieStore = await cookies();
      const token = cookieStore.get("ray_token")?.value;
      if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const user = await verifyToken(token);
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { memory, memoryStatus } = body as { memory?: string; memoryStatus?: string };

    const updated = await prisma.rayMonitorProject.update({
      where: { id },
      data: {
        ...(memory !== undefined && { memory }),
        ...(memoryStatus !== undefined && { memoryStatus }),
        updatedAt: new Date(),
      },
      select: { id: true, memory: true, memoryStatus: true },
    });

    return NextResponse.json({ project: updated });
  } catch (err) {
    console.error("PATCH /api/monitor/projects/[id]/memory:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
