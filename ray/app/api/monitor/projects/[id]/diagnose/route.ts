import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:3100";
const BRAIN_INTERNAL_SECRET = process.env.BRAIN_INTERNAL_SECRET || "";

// POST /api/monitor/projects/[id]/diagnose — AI diagnoses why a process failed
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const project = await prisma.rayMonitorProject.findFirst({
      where: { id, userId: user.userId },
      select: { id: true, name: true, projectPath: true, runCommand: true, managedLogFile: true },
    });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const logs = body.logs || "";
    const command = body.command || project.runCommand || "";
    const modelId = body.modelId || "";

    const res = await fetch(`${BRAIN_URL}/v1/monitor/projects/${id}/diagnose`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": BRAIN_INTERNAL_SECRET,
      },
      body: JSON.stringify({
        modelId,
        projectPath: project.projectPath,
        command,
        logs,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: "Diagnosis failed" }));
      return NextResponse.json(errData, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
