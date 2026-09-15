import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:4500";

export const runtime = "nodejs";
export const maxDuration = 180;

// POST /api/deployments/[id]/redeploy — trigger rebuild and pipe live SSE progress
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    const user = await verifyToken(token);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const { id } = await context.params;

    let deployment = await prisma.rayDeployment.findFirst({
      where: { id, userId: user.userId },
    });

    if (!deployment) {
      deployment = await prisma.rayDeployment.findFirst({
        where: {
          userId: user.userId,
          OR: [{ projectId: id }, { name: id }, { containerName: `ray-${id.toLowerCase()}` }],
        },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!deployment) {
      return new Response(JSON.stringify({ error: "Deployment not found" }), { status: 404 });
    }

    // Reset status to building
    const initialLog = `[REDEPLOY] Initiating container rebuild for ${deployment.name}...\n`;
    await prisma.rayDeployment.update({
      where: { id: deployment.id },
      data: {
        status: "building",
        buildLogs: initialLog,
        updatedAt: new Date(),
      },
    });

    let envs: Record<string, string> | undefined;
    if (deployment.envVars) {
      try { envs = JSON.parse(deployment.envVars); } catch { /* ignore */ }
    }

    // Proxy request to Brain /v1/deploy
    const brainRes = await fetch(`${BRAIN_URL}/v1/deploy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: deployment.id,
        userId: user.userId,
        name: deployment.name,
        projectPath: deployment.projectPath,
        sourceType: deployment.sourceType,
        repoUrl: deployment.repoUrl,
        branch: deployment.branch,
        envVars: envs,
        hostPort: deployment.hostPort || undefined,
      }),
    });

    if (!brainRes.ok) {
      const errText = await brainRes.text();
      await prisma.rayDeployment.update({
        where: { id: deployment.id },
        data: { status: "failed", buildLogs: `[ERROR] Failed to start rebuild: ${errText}` },
      });
      return new Response(JSON.stringify({ error: `Redeployment failed: ${errText}` }), { status: 502 });
    }

    let accumulatedLogs = initialLog;
    const depId = deployment.id;

    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        controller.enqueue(chunk);
        const text = new TextDecoder().decode(chunk);
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.logDelta) {
                accumulatedLogs += data.logDelta;
              } else if (data.message) {
                accumulatedLogs += `[${(data.step || "deploy").toUpperCase()}] ${data.message}\n`;
              }

              if (data.step === "complete") {
                await prisma.rayDeployment.update({
                  where: { id: depId },
                  data: {
                    status: "healthy",
                    deployUrl: data.url,
                    hostPort: data.port,
                    containerName: data.container,
                    buildLogs: accumulatedLogs,
                    updatedAt: new Date(),
                  },
                });
              } else if (data.step === "failed" || data.status === "error") {
                await prisma.rayDeployment.update({
                  where: { id: depId },
                  data: {
                    status: "failed",
                    buildLogs: accumulatedLogs || data.message || "Redeployment failed.",
                    updatedAt: new Date(),
                  },
                });
              }
            } catch { /* parse err */ }
          }
        }
      },
      async flush() {
        try {
          const current = await prisma.rayDeployment.findUnique({ where: { id: depId } });
          if (current && current.status === "building") {
            if (accumulatedLogs.includes("successfully deployed") || accumulatedLogs.includes("healthy")) {
              await prisma.rayDeployment.update({
                where: { id: depId },
                data: { status: "healthy", buildLogs: accumulatedLogs, updatedAt: new Date() },
              });
            } else {
              await prisma.rayDeployment.update({
                where: { id: depId },
                data: {
                  status: "failed",
                  buildLogs: accumulatedLogs + "\n[Ray] Redeployment stream completed or disconnected.",
                  updatedAt: new Date(),
                },
              });
            }
          }
        } catch { /* silent */ }
      },
    });

    return new Response(brainRes.body?.pipeThrough(transformStream), {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Deployment-ID": deployment.id,
      },
    });
  } catch (err: unknown) {
    console.error("Redeploy error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
}
