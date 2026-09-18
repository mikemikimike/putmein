import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:4500";
const BRAIN_INTERNAL_SECRET = process.env.BRAIN_INTERNAL_SECRET || "";

export const runtime = "nodejs";

// POST /api/deployments/[id]/diagnose — AI troubleshooter analyzes why a deployment or container failed
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;

    // Find matching deployment
    let deployment = await prisma.rayDeployment.findFirst({
      where: { id, userId: user.userId },
    });

    if (!deployment) {
      // Fallback: check if id is a monitor project with linked deployment
      deployment = await prisma.rayDeployment.findFirst({
        where: {
          userId: user.userId,
          OR: [{ projectId: id }, { name: id }, { containerName: `ray-${id.toLowerCase()}` }],
        },
        orderBy: { createdAt: "desc" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const modelId = body.modelId || "";
    let logs = body.logs || deployment?.buildLogs || "";

    if (!deployment && !logs) {
      return NextResponse.json({ error: "Deployment or logs not found" }, { status: 404 });
    }

    // If container exists, also attempt to fetch runtime crash logs
    if (deployment?.containerName) {
      try {
        const cLogsRes = await fetch(
          `${BRAIN_URL}/v1/deploy/logs?container=${encodeURIComponent(deployment.containerName)}&lines=80`,
          { headers: { "x-brain-secret": process.env.BRAIN_INTERNAL_SECRET || "" }, signal: AbortSignal.timeout(2000) }
        );
        if (cLogsRes.ok) {
          const cLogsData = await cLogsRes.json();
          if (cLogsData.logs && cLogsData.logs.trim()) {
            logs += `\n\n--- Container Runtime Logs (${deployment.containerName}) ---\n${cLogsData.logs}`;
          }
        }
      } catch { /* non-blocking */ }
    }

    // Call Brain's AI Diagnostic engine
    const targetId = deployment?.projectId || deployment?.id || id || "default";
    const projectPath = deployment?.projectPath || body.projectPath || "";
    const res = await fetch(`${BRAIN_URL}/v1/monitor/projects/${targetId}/diagnose`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": BRAIN_INTERNAL_SECRET,
      },
      body: JSON.stringify({
        modelId,
        projectPath,
        command: "docker build & deploy",
        logs,
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: "AI diagnosis failed" }));
      return NextResponse.json(errData, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error("POST /api/deployments/[id]/diagnose:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal diagnosis error" },
      { status: 500 }
    );
  }
}
