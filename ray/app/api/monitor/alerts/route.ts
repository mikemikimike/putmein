import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/monitor/alerts — list alerts (optionally filter by projectId, dismissed)
export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId") || undefined;
    const dismissed = url.searchParams.get("dismissed");

    // Get all project IDs for this user first (ownership check)
    const userProjects = await prisma.rayMonitorProject.findMany({
      where: { userId: user.userId },
      select: { id: true },
    });
    const userProjectIds = userProjects.map((p) => p.id);

    const whereClause: Record<string, unknown> = {
      projectId: projectId
        ? { in: [projectId].filter((id) => userProjectIds.includes(id)) }
        : { in: userProjectIds },
    };

    if (dismissed === "false") {
      whereClause.dismissed = false;
    } else if (dismissed === "true") {
      whereClause.dismissed = true;
    }

    const alerts = await prisma.rayMonitorAlert.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        project: { select: { name: true } },
      },
    });

    // Count undismissed alerts per severity for the sidebar badge
    const undismissedCount = await prisma.rayMonitorAlert.count({
      where: { projectId: { in: userProjectIds }, dismissed: false },
    });

    return NextResponse.json({ alerts, undismissedCount });
  } catch (err) {
    console.error("GET /api/monitor/alerts:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
