import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * PATCH /api/monitor/internal/update-project
 *
 * Internal Brain → Ray endpoint for updating a monitored project's status and lastChecked.
 * Called by Brain's persistProject callback after each poll cycle.
 * Requires X-Brain-Secret header matching BRAIN_INTERNAL_SECRET env var.
 */
export async function PATCH(req: NextRequest) {
  try {
    const secret = req.headers.get("x-brain-secret");
    const expected = process.env.BRAIN_INTERNAL_SECRET;
    if (!expected || secret !== expected) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, status, lastChecked } = body as {
      id: string;
      status: string;
      lastChecked?: string;
    };

    if (!id || !status) {
      return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    }

    const updated = await prisma.rayMonitorProject.update({
      where: { id },
      data: {
        status,
        ...(lastChecked ? { lastChecked: new Date(lastChecked) } : {}),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ project: updated });
  } catch (err) {
    console.error("PATCH /api/monitor/internal/update-project:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
