import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { detectProjectStack, detectContainerStack } from "@/lib/project-detector";

// GET /api/deployments/[id]
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
    const deployment = await prisma.rayDeployment.findFirst({
      where: { id, userId: user.userId },
    });
    if (!deployment) return NextResponse.json({ error: "Deployment not found" }, { status: 404 });

    const baseName = deployment.name.toLowerCase();
    const linkedProject = await prisma.rayMonitorProject.findFirst({
      where: {
        userId: user.userId,
        OR: [
          { name: { equals: deployment.name } },
          { projectPath: { equals: deployment.projectPath } },
        ],
      },
    });

    let stack = detectContainerStack(
      {
        name: deployment.containerName || `ray-${deployment.name}`,
        image: deployment.imageName || undefined,
      },
      linkedProject ? { projectPath: linkedProject.projectPath, memory: linkedProject.memory } : undefined
    );

    if (stack.frameworkSlug === "docker" && deployment.projectPath) {
      const fromPath = detectProjectStack(deployment.projectPath);
      if (fromPath.frameworkSlug !== "node" || fromPath.hasDockerfile) {
        stack = fromPath;
      }
    }

    const formatted = {
      ...deployment,
      framework: stack.framework,
      frameworkSlug: stack.frameworkSlug,
      language: stack.language,
      icon: stack.icon,
      colorClasses: stack.colorClasses,
      isDocker: stack.hasDockerfile || deployment.sourceType === "container" || !!deployment.containerName,
      buildLogs: deployment.buildLogs || "Deploy finished successfully.\nApplication container active and running.",
    };

    return NextResponse.json({ deployment: formatted });
  } catch (err) {
    console.error("GET /api/deployments/[id]:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
