import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { detectProjectStack, detectContainerStack } from "@/lib/project-detector";

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:3100";

// GET /api/cicd/[id] — get pipeline with all runs & stack metadata
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
    const pipeline = await prisma.rayPipeline.findFirst({
      where: { id, userId: user.userId },
      include: {
        runs: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!pipeline) return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });

    const linkedProj = pipeline.projectId
      ? await prisma.rayMonitorProject.findFirst({ where: { id: pipeline.projectId, userId: user.userId } })
      : await prisma.rayMonitorProject.findFirst({ where: { name: { equals: pipeline.name }, userId: user.userId } });

    const linkedDep = await prisma.rayDeployment.findFirst({
      where: {
        userId: user.userId,
        OR: [
          { name: { equals: pipeline.name } },
          { id: pipeline.projectId || "" },
        ],
      },
    });

    let stack = detectContainerStack(
      { name: pipeline.name },
      linkedProj ? { projectPath: linkedProj.projectPath, memory: linkedProj.memory } : undefined
    );

    if (stack.frameworkSlug === "docker" && linkedProj?.projectPath) {
      const fromPath = detectProjectStack(linkedProj.projectPath);
      if (fromPath.frameworkSlug !== "node" || fromPath.hasDockerfile) {
        stack = fromPath;
      }
    }

    const formatted = {
      ...pipeline,
      framework: stack.framework,
      frameworkSlug: stack.frameworkSlug,
      language: stack.language,
      icon: stack.icon,
      colorClasses: stack.colorClasses,
      isDocker: stack.hasDockerfile || !!pipeline.dockerfilePath,
      deployment: linkedDep
        ? {
            id: linkedDep.id,
            status: linkedDep.status,
            deployUrl: linkedDep.deployUrl,
            hostPort: linkedDep.hostPort,
            containerName: linkedDep.containerName,
          }
        : null,
    };

    return NextResponse.json({ pipeline: formatted });
  } catch (err) {
    console.error("GET /api/cicd/[id]:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PATCH /api/cicd/[id] — update pipeline configuration
export async function PATCH(
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
    const body = await req.json();

    const updated = await prisma.rayPipeline.update({
      where: { id, userId: user.userId },
      data: {
        ...(body.branch !== undefined && { branch: String(body.branch).trim() }),
        ...(body.port !== undefined && { port: Number(body.port) || 3000 }),
        ...(body.autoDeploy !== undefined && { autoDeploy: Boolean(body.autoDeploy) }),
        ...(body.dockerfilePath !== undefined && { dockerfilePath: String(body.dockerfilePath).trim() }),
      },
    });

    return NextResponse.json({ ok: true, pipeline: updated });
  } catch (err) {
    console.error("PATCH /api/cicd/[id]:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/cicd/[id] — trigger a pipeline run
export async function POST(
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
    const pipeline = await prisma.rayPipeline.findFirst({
      where: { id, userId: user.userId },
    });
    if (!pipeline) return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });

    // Create a new PipelineRun record
    const run = await prisma.rayPipelineRun.create({
      data: {
        pipelineId: id,
        status: "running",
        commitHash: "manual-trigger",
        commitMessage: "Manual pipeline execution triggered from dashboard",
        author: user.name || "User",
        stages: JSON.stringify([
          { name: "Git Clone", status: "running", durationMs: 0 },
          { name: "Dependency Setup", status: "pending", durationMs: 0 },
          { name: "Docker Build", status: "pending", durationMs: 0 },
          { name: "Container Deploy", status: "pending", durationMs: 0 },
          { name: "Healthcheck", status: "pending", durationMs: 0 },
        ]),
        logs: "Initiating pipeline execution...\nConnecting to repository: " + pipeline.repoUrl + "\n",
      },
    });

    // Update pipeline status
    await prisma.rayPipeline.update({
      where: { id },
      data: { status: "running", lastRunAt: new Date() },
    });

    // Determine deployment directory
    const path = await import("path");
    const { getDeploymentsDir } = await import("@/lib/settings");
    const baseDeployDir = await getDeploymentsDir();
    const projectPath = path.join(baseDeployDir, pipeline.name);

    // Trigger build in Brain and consume SSE stream asynchronously
    (async () => {
      try {
        const bRes = await fetch(`${BRAIN_URL}/v1/deploy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.userId,
            name: pipeline.name,
            projectPath,
            repoUrl: pipeline.repoUrl,
            branch: pipeline.branch,
            hostPort: pipeline.port && pipeline.port !== 3000 && pipeline.port !== 3100 ? pipeline.port : undefined,
          }),
        });

        if (!bRes.ok || !bRes.body) {
          const errTxt = await bRes.text().catch(() => "Failed to connect to Brain deploy service");
          await prisma.rayPipelineRun.update({
            where: { id: run.id },
            data: {
              status: "failed",
              logs: (run.logs || "") + `\n[ERROR] Pipeline failed: ${errTxt}`,
            },
          });
          await prisma.rayPipeline.update({
            where: { id },
            data: { status: "failed" },
          });
          return;
        }

        let accumulatedLogs = run.logs || "";
        const reader = bRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            for (const line of part.split("\n")) {
              if (line.startsWith("data: ")) {
                try {
                  const ev = JSON.parse(line.slice(6));
                  if (ev.logDelta) accumulatedLogs += ev.logDelta;
                  else if (ev.message) accumulatedLogs += `[${(ev.step || "deploy").toUpperCase()}] ${ev.message}\n`;

                  if (ev.step === "complete") {
                    await prisma.rayPipelineRun.update({
                      where: { id: run.id },
                      data: { status: "success", logs: accumulatedLogs },
                    });
                    await prisma.rayPipeline.update({
                      where: { id },
                      data: { status: "success" },
                    });
                  } else if (ev.step === "failed" || ev.status === "error") {
                    await prisma.rayPipelineRun.update({
                      where: { id: run.id },
                      data: { status: "failed", logs: accumulatedLogs || ev.message },
                    });
                    await prisma.rayPipeline.update({
                      where: { id },
                      data: { status: "failed" },
                    });
                  }
                } catch { /* parse err */ }
              }
            }
          }
        }
      } catch (err: unknown) {
        await prisma.rayPipelineRun.update({
          where: { id: run.id },
          data: {
            status: "failed",
            logs: (run.logs || "") + `\n[ERROR] Pipeline run failed: ${err instanceof Error ? err.message : "Unknown error"}`,
          },
        }).catch(() => {});
        await prisma.rayPipeline.update({
          where: { id },
          data: { status: "failed" },
        }).catch(() => {});
      }
    })();

    return NextResponse.json({ ok: true, run });
  } catch (err) {
    console.error("POST /api/cicd/[id]:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
