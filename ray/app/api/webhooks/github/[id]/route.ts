import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:3100";

// POST /api/webhooks/github/[id] — receives GitHub webhook events
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pipeline = await prisma.rayPipeline.findUnique({
      where: { id },
    });
    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    const event = req.headers.get("x-github-event") || "push";
    const body = await req.json().catch(() => ({}));

    const commitHash = body.after || body.head_commit?.id || "webhook-push";
    const commitMessage = body.head_commit?.message || "Automated push trigger";
    const author = body.head_commit?.author?.name || body.pusher?.name || "GitHub Webhook";

    // Record run
    const run = await prisma.rayPipelineRun.create({
      data: {
        pipelineId: id,
        status: "running",
        commitHash: String(commitHash).substring(0, 10),
        commitMessage,
        author,
        stages: JSON.stringify([
          { name: "Git Clone", status: "running" },
          { name: "Dependencies", status: "pending" },
          { name: "Docker Build", status: "pending" },
          { name: "Container Deploy", status: "pending" },
          { name: "Healthcheck", status: "pending" },
        ]),
        logs: `Received GitHub webhook event: ${event}\nCommit: ${commitHash}\n`,
      },
    });

    // Update pipeline status
    await prisma.rayPipeline.update({
      where: { id },
      data: { status: "running", lastRunAt: new Date() },
    });

    // Dispatch build to Brain
    fetch(`${BRAIN_URL}/v1/deploy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: pipeline.name,
        repoUrl: pipeline.repoUrl,
        branch: pipeline.branch,
        port: pipeline.port,
      }),
    }).catch(() => {});

    return NextResponse.json({ ok: true, runId: run.id });
  } catch (err) {
    console.error("POST /api/webhooks/github/[id]:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
