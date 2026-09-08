import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:3100";

export const runtime = "nodejs";

// GET /api/deployments/active — returns any currently building or recently completed deployment/run
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Check containers from Brain to auto-resolve running state
    let runningContainerMap = new Map<string, any>();
    try {
      const cRes = await fetch(`${BRAIN_URL}/v1/containers`, { signal: AbortSignal.timeout(1500) });
      if (cRes.ok) {
        const cData = await cRes.json();
        for (const c of cData.containers || []) {
          if (c.name) {
            const cleanName = c.name.replace(/^ray-/, "").toLowerCase();
            runningContainerMap.set(cleanName, c);
            runningContainerMap.set(c.name.toLowerCase(), c);
          }
        }
      }
    } catch { /* non-blocking */ }

    const STALE_THRESHOLD_MS = 120 * 1000; // 120 seconds
    const RECENT_SUCCESS_THRESHOLD_MS = 60 * 1000; // 60 seconds
    const RECENT_FAILED_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours (persists until user dismisses)

    // 2. Check if any deployment is building/deploying or recently completed/failed
    let activeDep = await prisma.rayDeployment.findFirst({
      where: {
        userId: user.userId,
        OR: [
          { status: "building" },
          { status: "deploying" },
          { status: "pending" },
          {
            status: "healthy",
            updatedAt: { gte: new Date(Date.now() - RECENT_SUCCESS_THRESHOLD_MS) },
          },
          {
            status: "failed",
            updatedAt: { gte: new Date(Date.now() - RECENT_FAILED_THRESHOLD_MS) },
          },
        ],
      },
      orderBy: { updatedAt: "desc" },
    });

    // Auto-resolve building deployment if container is already running or timed out
    if (activeDep && (activeDep.status === "building" || activeDep.status === "deploying" || activeDep.status === "pending")) {
      const matched = runningContainerMap.get(activeDep.name.toLowerCase()) ||
        runningContainerMap.get(activeDep.containerName?.toLowerCase() || "");
      if (matched && matched.state === "running") {
        activeDep = await prisma.rayDeployment.update({
          where: { id: activeDep.id },
          data: {
            status: "healthy",
            containerName: matched.name,
            hostPort: matched.port || activeDep.hostPort,
            deployUrl: matched.url || (matched.port ? `http://localhost:${matched.port}` : activeDep.deployUrl),
            buildLogs: activeDep.buildLogs || `Build finished. Docker container ${matched.name} is running.`,
          },
        });
      } else if (Date.now() - activeDep.updatedAt.getTime() > STALE_THRESHOLD_MS) {
        activeDep = await prisma.rayDeployment.update({
          where: { id: activeDep.id },
          data: {
            status: "failed",
            buildLogs: (activeDep.buildLogs || "") + "\n[Ray] Build timed out or background process terminated.",
          },
        });
      }
    }

    // 3. Check if any CI/CD pipeline run is active
    let activeRun = await prisma.rayPipelineRun.findFirst({
      where: {
        pipeline: { userId: user.userId },
        OR: [
          { status: "running" },
          {
            status: "success",
            createdAt: { gte: new Date(Date.now() - RECENT_SUCCESS_THRESHOLD_MS) },
          },
          {
            status: "failed",
            createdAt: { gte: new Date(Date.now() - RECENT_FAILED_THRESHOLD_MS) },
          },
        ],
      },
      include: { pipeline: true },
      orderBy: { createdAt: "desc" },
    });

    if (activeRun && activeRun.status === "running") {
      const matched = runningContainerMap.get(activeRun.pipeline.name.toLowerCase());
      if (matched && matched.state === "running") {
        activeRun = await prisma.rayPipelineRun.update({
          where: { id: activeRun.id },
          data: { status: "success" },
          include: { pipeline: true },
        });
        await prisma.rayPipeline.update({
          where: { id: activeRun.pipelineId },
          data: { status: "success" },
        });
      } else if (Date.now() - activeRun.createdAt.getTime() > STALE_THRESHOLD_MS) {
        activeRun = await prisma.rayPipelineRun.update({
          where: { id: activeRun.id },
          data: {
            status: "failed",
            logs: (activeRun.logs || "") + "\n[Ray] Pipeline build timed out or background process terminated.",
          },
          include: { pipeline: true },
        });
        await prisma.rayPipeline.update({
          where: { id: activeRun.pipelineId },
          data: { status: "failed" },
        });
      }
    }

    if (!activeDep && !activeRun) {
      return NextResponse.json({ active: null });
    }

    // Extract clean failure headline from buildLogs if failed
    const extractFailureReason = (logs?: string | null): string => {
      if (!logs) return "Build or container execution halted.";
      const lines = logs.trim().split("\n").filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i--) {
        const l = lines[i].trim();
        if (l.includes("[ERROR]") || l.includes("Error:") || l.includes("error:") || l.includes("failed:")) {
          return l.replace(/^\[ERROR\]\s*/, "").slice(0, 140);
        }
      }
      return lines[lines.length - 1]?.slice(0, 140) || "Deployment halted with error.";
    };

    // Prefer building/running over completed/failed
    if (activeDep && (activeDep.status === "building" || activeDep.status === "deploying" || !activeRun)) {
      return NextResponse.json({
        active: {
          id: activeDep.id,
          projectId: activeDep.projectId,
          projectPath: activeDep.projectPath,
          type: "deployment",
          name: activeDep.name,
          branch: activeDep.branch || "main",
          commitHash: activeDep.commitHash,
          commitMessage: activeDep.commitMessage,
          status: activeDep.status,
          failureReason: activeDep.status === "failed" ? extractFailureReason(activeDep.buildLogs) : undefined,
          deployUrl: activeDep.deployUrl,
          port: activeDep.hostPort,
          buildLogs: activeDep.buildLogs || (activeDep.status === "failed" ? "Deployment failed. Check logs for details." : "Building Docker container..."),
          updatedAt: activeDep.updatedAt.getTime(),
        },
      });
    }

    if (activeRun) {
      return NextResponse.json({
        active: {
          id: activeRun.id,
          pipelineId: activeRun.pipelineId,
          type: "pipeline",
          name: activeRun.pipeline.name,
          branch: activeRun.pipeline.branch,
          commitHash: activeRun.commitHash,
          commitMessage: activeRun.commitMessage,
          status: activeRun.status === "running" ? "building" : (activeRun.status === "success" ? "healthy" : "failed"),
          failureReason: activeRun.status === "failed" ? extractFailureReason(activeRun.logs) : undefined,
          deployUrl: activeRun.pipeline.port ? `http://localhost:${activeRun.pipeline.port}` : undefined,
          port: activeRun.pipeline.port,
          buildLogs: activeRun.logs || "Executing CI/CD pipeline...",
          updatedAt: activeRun.createdAt.getTime(),
        },
      });
    }

    return NextResponse.json({ active: null });
  } catch (err) {
    console.error("GET /api/deployments/active:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
