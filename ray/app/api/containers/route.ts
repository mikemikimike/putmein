import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { detectContainerStack } from "@/lib/project-detector";
import { getPrimaryProjectUrl } from "@/lib/domains";

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:4500";

// GET /api/containers — list all Docker containers with framework & stack visuals
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const res = await fetch(`${BRAIN_URL}/v1/containers`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) {
      return NextResponse.json({ containers: [], error: "Docker unavailable" }, { status: 200 });
    }
    const data = await res.json();
    const rawContainers: any[] = data.containers || [];

    // Fetch user's projects and deployments to link container to its source code
    const [projects, deployments] = await Promise.all([
      prisma.rayMonitorProject.findMany({ where: { userId: user.userId } }),
      prisma.rayDeployment.findMany({ where: { userId: user.userId } }),
    ]);

    const enriched = rawContainers.map((c) => {
      const cName = (c.name || "").toLowerCase();
      const matchedDep = deployments.find((d) => {
        const dName = (d.name || "").toLowerCase();
        const dContName = (d.containerName || "").toLowerCase();
        return (
          d.id === c.id ||
          d.containerId === c.id ||
          dContName === cName ||
          dName === cName ||
          cName.includes(dName) ||
          cName.includes("ray-" + dName)
        );
      });

      const matchedProj = projects.find((p) => {
        const pName = p.name.toLowerCase();
        return (
          matchedDep?.projectId === p.id ||
          pName === cName ||
          cName.includes(pName) ||
          cName.includes("ray-" + pName)
        );
      });

      const stack = detectContainerStack(
        { name: c.name, image: c.image },
        matchedProj ? { projectPath: matchedProj.projectPath, memory: matchedProj.memory, runCommand: matchedProj.runCommand } : undefined
      );

      return {
        ...c,
        port: c.port || matchedDep?.hostPort,
        url: getPrimaryProjectUrl(matchedProj?.projectUrl || matchedDep?.deployUrl, c.port || matchedDep?.hostPort) || c.url || (matchedDep?.hostPort ? `http://localhost:${matchedDep.hostPort}` : null),
        framework: stack.framework,
        frameworkSlug: stack.frameworkSlug,
        language: stack.language,
        icon: stack.icon,
        colorClasses: stack.colorClasses,
        projectId: matchedProj?.id || null,
        projectName: matchedProj?.name || null,
        deploymentId: matchedDep?.id || null,
      };
    });

    return NextResponse.json({ containers: enriched });
  } catch (err) {
    console.error("GET /api/containers:", err);
    return NextResponse.json({ containers: [], error: "Docker service unavailable" }, { status: 200 });
  }
}
