import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { detectContainerStack } from "@/lib/project-detector";

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:4500";

// GET /api/containers/[id] — inspect container with stack & framework visuals
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
    const res = await fetch(`${BRAIN_URL}/v1/containers/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      return NextResponse.json({ error: "Container not found" }, { status: res.status });
    }
    const data = await res.json();
    const rawObj = Array.isArray(data) ? data[0] : data;
    const containerName = (rawObj?.Name ? rawObj.Name.replace(/^\//, "") : id).toLowerCase();
    const image = (rawObj?.Config?.Image || rawObj?.Image || "").toLowerCase();

    // Look for matching deployment/project
    const [project, deployment] = await Promise.all([
      prisma.rayMonitorProject.findFirst({
        where: {
          userId: user.userId,
          OR: [
            { name: containerName },
            { name: containerName.replace(/^ray-/, "") },
          ],
        },
      }),
      prisma.rayDeployment.findFirst({
        where: {
          userId: user.userId,
          OR: [
            { id },
            { containerId: id },
            { containerName: containerName },
            { name: containerName },
            { name: containerName.replace(/^ray-/, "") },
          ],
        },
      }),
    ]);

    const stack = detectContainerStack(
      { name: containerName, image },
      project ? { projectPath: project.projectPath, memory: project.memory, runCommand: project.runCommand } : undefined
    );

    return NextResponse.json({
      ...rawObj,
      framework: stack.framework,
      frameworkSlug: stack.frameworkSlug,
      language: stack.language,
      icon: stack.icon,
      colorClasses: stack.colorClasses,
      projectId: project?.id || null,
      projectName: project?.name || null,
      deploymentId: deployment?.id || null,
    });
  } catch (err) {
    console.error("GET /api/containers/[id]:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
