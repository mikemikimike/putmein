import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:3100";

// POST /api/security/override — authorizes deployment override with two confirmation consents
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      pipelineRunId,
      pipelineId,
      scanId,
      acknowledgedRisk,
      consentDeploy,
    } = body;

    // Strict validation: BOTH confirmation consents MUST be explicitly true
    if (acknowledgedRisk !== true || consentDeploy !== true) {
      return NextResponse.json(
        { error: "Dual consent required: You must explicitly acknowledge the security risks and confirm override consent." },
        { status: 400 }
      );
    }

    if (!pipelineRunId) {
      return NextResponse.json({ error: "pipelineRunId is required" }, { status: 400 });
    }

    // Locate the pipeline run
    const run = await prisma.rayPipelineRun.findFirst({
      where: { id: pipelineRunId },
      include: { pipeline: true },
    });

    if (!run || run.pipeline.userId !== user.userId) {
      return NextResponse.json({ error: "Pipeline run not found or unauthorized" }, { status: 404 });
    }

    const pipeline = run.pipeline;

    // Update scan record if scanId provided or latest scan for this project
    if (scanId) {
      await prisma.raySecurityScan.updateMany({
        where: { id: scanId, userId: user.userId },
        data: {
          overridden: true,
          overrideBy: user.name || user.email,
        },
      });
    } else {
      await prisma.raySecurityScan.updateMany({
        where: { projectName: pipeline.name, userId: user.userId },
        data: {
          overridden: true,
          overrideBy: user.name || user.email,
        },
      });
    }

    // Update stages to mark security as overridden and start Docker build
    let stages = [];
    try {
      stages = run.stages ? JSON.parse(run.stages) : [];
    } catch { /* fallback */ }

    stages = stages.map((s: any) => {
      if (s.name === "Security Audit" || s.name === "Security Check") {
        return { ...s, status: "overridden" };
      }
      if (s.name === "Docker Build" || s.name === "Docker Build & Deploy") {
        return { ...s, status: "running" };
      }
      return s;
    });

    const overrideNotice = `\n[OVERRIDE] Security block manually overridden by ${user.name || user.email} at ${new Date().toISOString()}.\nDual consent validated. Proceeding to Docker container build & deployment...\n`;

    await prisma.rayPipelineRun.update({
      where: { id: run.id },
      data: {
        status: "running",
        stages: JSON.stringify(stages),
        logs: (run.logs || "") + overrideNotice,
      },
    });

    await prisma.rayPipeline.update({
      where: { id: pipeline.id },
      data: { status: "running" },
    });

    // Resume deployment asynchronously via unified runner (skipping security gate since dual consent verified)
    const { executePipelineRun } = await import("@/lib/cicd-runner");
    executePipelineRun({
      pipelineId: pipeline.id,
      runId: run.id,
      userId: user.userId,
      skipSecurity: true,
      overrideAuthor: user.name || user.email,
    }).catch((err) => {
      console.error("executePipelineRun error on override:", err);
    });

    return NextResponse.json({
      ok: true,
      message: "Dual consent verified. Security block overridden and deployment initiated.",
    });
  } catch (err: unknown) {
    console.error("POST /api/security/override error:", err);
    return NextResponse.json({ error: (err as Error).message || "Server error" }, { status: 500 });
  }
}
