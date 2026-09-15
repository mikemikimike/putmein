import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:4500";

// PATCH /api/monitor/projects/[id] — update project (enable/disable, rename, change interval, log command)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { enabled, intervalSec, name, logCommand, projectUrl, addLogPath } = body;

    // Verify ownership
    const existing = await prisma.rayMonitorProject.findFirst({
      where: { id, userId: user.userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (enabled !== undefined) updateData.enabled = enabled;
    if (intervalSec !== undefined) updateData.intervalSec = intervalSec;
    if (name !== undefined) updateData.name = name;
    if (logCommand !== undefined) updateData.logCommand = logCommand || null;
    if (projectUrl !== undefined) updateData.projectUrl = projectUrl || null;

    // Add a new log path to the JSON array
    if (addLogPath && typeof addLogPath === "string") {
      const currentPaths: string[] = (() => {
        try { return JSON.parse(existing.logPaths || "[]") as string[]; } catch { return []; }
      })();
      if (!currentPaths.includes(addLogPath)) {
        currentPaths.push(addLogPath);
        updateData.logPaths = JSON.stringify(currentPaths);
      }
    }

    if (enabled !== undefined) {
      updateData.status = enabled ? "active" : "paused";
    }

    const project = await prisma.rayMonitorProject.update({
      where: { id },
      data: updateData,
    });

    // Notify Brain
    try {
      await fetch(`${BRAIN_URL}/v1/monitor/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, intervalSec, name, logCommand }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // Brain offline — DB is already updated
    }

    return NextResponse.json({ project });
  } catch (err) {
    console.error("PATCH /api/monitor/projects/[id]:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/monitor/projects/[id] — remove a monitored project
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify ownership
    const existing = await prisma.rayMonitorProject.findFirst({
      where: { id, userId: user.userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Tell Brain to stop monitoring
    try {
      await fetch(`${BRAIN_URL}/v1/monitor/projects/${id}`, {
        method: "DELETE",
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // Brain offline — still delete from DB
    }

    await prisma.rayMonitorProject.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/monitor/projects/[id]:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
