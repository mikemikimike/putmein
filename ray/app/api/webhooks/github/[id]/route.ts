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
          { name: "Git Clone & Sync", status: "running", durationMs: 0 },
          { name: "Dependencies", status: "pending", durationMs: 0 },
          { name: "Security Audit", status: "pending", durationMs: 0 },
          { name: "Docker Build", status: "pending", durationMs: 0 },
          { name: "Container Deploy", status: "pending", durationMs: 0 },
          { name: "Healthcheck", status: "pending", durationMs: 0 },
        ]),
        logs: `Received GitHub webhook event: ${event}\nCommit: ${commitHash}\n`,
      },
    });

    // Update pipeline status
    await prisma.rayPipeline.update({
      where: { id },
      data: { status: "running", lastRunAt: new Date() },
    });

    // Trigger full CI/CD run asynchronously via unified runner
    const { executePipelineRun } = await import("@/lib/cicd-runner");
    executePipelineRun({
      pipelineId: id,
      runId: run.id,
      userId: pipeline.userId,
      overrideAuthor: author,
    }).catch((err) => {
      console.error("executePipelineRun error in webhook/[id]:", err);
    });

    return NextResponse.json({ ok: true, runId: run.id });
  } catch (err) {
    console.error("POST /api/webhooks/github/[id]:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
