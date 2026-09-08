import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import os from "os";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { detectProjectStack } from "@/lib/project-detector";

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:3100";

function getLocalIp(): string {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch { /* fallback */ }
  return "127.0.0.1";
}

function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  if (
    ip === "127.0.0.1" ||
    ip === "localhost" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("169.254.")
  ) {
    return true;
  }
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
  return false;
}

async function detectServerIp(): Promise<{
  localIp: string;
  publicIp: string;
  isPrivateNetwork: boolean;
  isPubliclyExposed: boolean;
}> {
  const localIp = getLocalIp();
  let publicIp = localIp;
  try {
    const res = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ip) publicIp = data.ip;
    }
  } catch {
    // If public lookup times out, use local IP
  }

  const isPrivateNetwork = isPrivateIp(localIp);
  const isPubliclyExposed = !isPrivateNetwork;

  return { localIp, publicIp, isPrivateNetwork, isPubliclyExposed };
}

// GET /api/projects/[id] — project details with connected container, CI/CD, GitHub, and server IP
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

    const project = await prisma.rayMonitorProject.findFirst({
      where: { id, userId: user.userId },
      include: {
        _count: {
          select: { alerts: { where: { dismissed: false } } },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 1. Fetch active containers from Brain/Docker and registered deployments
    let container: any = null;
    try {
      const cRes = await fetch(`${BRAIN_URL}/v1/containers`, { signal: AbortSignal.timeout(2500) });
      if (cRes.ok) {
        const cData = await cRes.json();
        const containers = cData.containers || [];
        const baseName = project.name.toLowerCase();
        container = containers.find((c: any) => {
          const cName = (c.name || "").toLowerCase();
          return cName.includes("ray-" + baseName) || cName === baseName || cName.includes(baseName);
        }) || null;
      }
    } catch { /* Brain offline */ }

    // Fetch registered deployment for this project
    const deployment = await prisma.rayDeployment.findFirst({
      where: {
        userId: user.userId,
        OR: [
          { projectId: project.id },
          { name: project.name },
          { name: project.name.toLowerCase() },
          { containerName: `ray-${project.name.toLowerCase()}` },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    // Extract port from projectUrl if available
    let urlPort: number | null = null;
    if (project.projectUrl) {
      const portMatch = project.projectUrl.match(/:(\d+)/);
      if (portMatch) urlPort = parseInt(portMatch[1], 10);
    }

    const resolvedPort = container?.port || urlPort || deployment?.hostPort || null;

    if (!container && deployment) {
      container = {
        id: deployment.containerId || deployment.id,
        name: deployment.containerName || `ray-${project.name.toLowerCase()}`,
        status: deployment.status === "healthy" ? "running" : deployment.status,
        port: resolvedPort,
        url: deployment.deployUrl || (resolvedPort ? `http://localhost:${resolvedPort}` : null),
        image: deployment.imageName,
      };
    } else if (container) {
      container.port = resolvedPort;
      if (!container.url && resolvedPort) {
        container.url = `http://localhost:${resolvedPort}`;
      }
    }

    // 2. Fetch linked CI/CD Pipeline
    const pipeline = await prisma.rayPipeline.findFirst({
      where: {
        userId: user.userId,
        OR: [
          { projectId: project.id },
          { name: project.name },
        ],
      },
      include: {
        runs: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
    });

    // 3. Fetch GitHub integration status
    const githubIntegration = await prisma.rayGithubIntegration.findFirst({
      where: { userId: user.userId },
      select: { id: true, githubUsername: true, avatarUrl: true, createdAt: true },
    });

    // 4. Server IP detection for sslip.io and domain mapping
    const { localIp, publicIp, isPrivateNetwork, isPubliclyExposed } = await detectServerIp();

    const stackInfo = detectProjectStack(project.projectPath, {
      projectName: project.name,
      runCommand: project.runCommand,
      memory: project.memory,
      containerImage: container?.image || deployment?.imageName,
    });

    return NextResponse.json({
      project: {
        ...project,
        container,
        deployment: deployment || null,
        isDocker: !!container || stackInfo.hasDockerfile || (project.memory || "").toLowerCase().includes("docker") || (project.logPaths || "").includes("docker"),
        framework: stackInfo.framework,
        frameworkSlug: stackInfo.frameworkSlug,
        language: stackInfo.language,
        icon: stackInfo.icon,
        colorClasses: stackInfo.colorClasses,
      },
      deployment: deployment || null,
      pipeline: pipeline || null,
      github: {
        connected: !!githubIntegration,
        integration: githubIntegration || null,
      },
      network: {
        localIp,
        publicIp,
        isPrivateNetwork,
        isPubliclyExposed,
      },
    });
  } catch (err) {
    console.error("GET /api/projects/[id]:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PATCH /api/projects/[id] — update project name, projectUrl / domain, etc.
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
    const { name, projectUrl, enabled, intervalSec } = body;

    const existing = await prisma.rayMonitorProject.findFirst({
      where: { id, userId: user.userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined && typeof name === "string" && name.trim()) {
      updateData.name = name.trim();
    }
    if (projectUrl !== undefined) {
      updateData.projectUrl = projectUrl ? projectUrl.trim() : null;
    }
    if (enabled !== undefined) {
      updateData.enabled = !!enabled;
      updateData.status = enabled ? "active" : "paused";
    }
    if (intervalSec !== undefined) {
      updateData.intervalSec = Number(intervalSec) || 30;
    }

    const updated = await prisma.rayMonitorProject.update({
      where: { id },
      data: updateData,
    });

    // Notify Brain if running
    try {
      await fetch(`${BRAIN_URL}/v1/monitor/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
        signal: AbortSignal.timeout(3000),
      });
    } catch { /* Brain offline */ }

    return NextResponse.json({ project: updated });
  } catch (err) {
    console.error("PATCH /api/projects/[id]:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/projects/[id] — complete deletion of project, docker containers, files, logs, and database records
export async function DELETE(
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

    const project = await prisma.rayMonitorProject.findFirst({
      where: { id, userId: user.userId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 1. Collect all linked deployments and container names
    const deployments = await prisma.rayDeployment.findMany({
      where: {
        userId: user.userId,
        OR: [
          { projectId: project.id },
          { name: project.name },
          { name: project.name.toLowerCase() },
          { containerName: `ray-${project.name.toLowerCase()}` },
        ],
      },
    });

    const containerNamesToKill = new Set<string>();
    const imageNamesToKill = new Set<string>();

    // Standard naming convention
    const cleanBaseName = project.name.toLowerCase().replace(/[^a-z0-9-_]/g, "");
    if (cleanBaseName) {
      containerNamesToKill.add(`ray-${cleanBaseName}`);
      containerNamesToKill.add(cleanBaseName);
      imageNamesToKill.add(`ray-${cleanBaseName}:latest`);
      imageNamesToKill.add(`ray-${cleanBaseName}`);
    }

    for (const dep of deployments) {
      if (dep.containerName) containerNamesToKill.add(dep.containerName);
      if (dep.containerId) containerNamesToKill.add(dep.containerId);
      if (dep.imageName) imageNamesToKill.add(dep.imageName);
    }

    // 2. Kill and remove Docker containers, compose stacks, volumes, and networks
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);
    const fs = await import("fs");
    const path = await import("path");

    // 2a. Run docker compose down if compose file exists in project directory
    if (project.projectPath && fs.existsSync(project.projectPath)) {
      try {
        const hasCompose =
          fs.existsSync(path.join(project.projectPath, "docker-compose.yml")) ||
          fs.existsSync(path.join(project.projectPath, "docker-compose.yaml")) ||
          fs.existsSync(path.join(project.projectPath, "compose.yml")) ||
          fs.existsSync(path.join(project.projectPath, "compose.yaml"));

        if (hasCompose) {
          await execAsync(
            `cd "${project.projectPath}" && (docker compose down -v --remove-orphans 2>/dev/null || docker-compose down -v --remove-orphans 2>/dev/null || true)`
          );
        }
      } catch { /* ignore compose errors */ }
    }

    // 2b. Discover any active or stopped containers associated with this project name
    try {
      const { stdout: psOut } = await execAsync(
        `docker ps -a --format "{{.ID}}\t{{.Names}}\t{{.Image}}" 2>/dev/null || true`
      );
      if (psOut) {
        for (const line of psOut.split("\n")) {
          const [cId, cNames, cImage] = line.split("\t");
          if (!cId) continue;
          const lowerNames = (cNames || "").toLowerCase();
          const lowerImage = (cImage || "").toLowerCase();

          if (
            (cleanBaseName && (
              lowerNames.includes(cleanBaseName) ||
              lowerNames.startsWith(`${cleanBaseName}-`) ||
              lowerNames.startsWith(`${cleanBaseName}_`) ||
              lowerNames.startsWith(`ray-${cleanBaseName}`) ||
              lowerImage.includes(`ray-${cleanBaseName}`)
            ))
          ) {
            containerNamesToKill.add(cId);
            if (cNames) containerNamesToKill.add(cNames);
          }
        }
      }
    } catch { /* Docker daemon not available */ }

    // 2c. Force remove all discovered containers
    for (const cName of containerNamesToKill) {
      try {
        await execAsync(`docker rm -f ${cName} 2>/dev/null || true`);
      } catch { /* ignore */ }
      // Also notify Brain container action endpoint
      try {
        await fetch(`${BRAIN_URL}/v1/containers/${encodeURIComponent(cName)}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "remove" }),
          signal: AbortSignal.timeout(2000),
        });
      } catch { /* ignore */ }
    }

    // 2d. Force remove associated Docker images, volumes, and networks
    for (const img of imageNamesToKill) {
      try {
        await execAsync(`docker rmi -f ${img} 2>/dev/null || true`);
      } catch { /* ignore */ }
    }

    if (cleanBaseName) {
      try {
        await execAsync(
          `docker volume ls -q --filter name=${cleanBaseName} 2>/dev/null | xargs -r docker volume rm -f 2>/dev/null || true`
        );
        await execAsync(
          `docker network ls -q --filter name=${cleanBaseName} 2>/dev/null | xargs -r docker network rm 2>/dev/null || true`
        );
      } catch { /* ignore */ }
    }

    // 3. Stop managed PID if running
    if (project.managedPid) {
      try {
        process.kill(project.managedPid, "SIGTERM");
      } catch { /* process already dead */ }
    }

    // 4. Safely delete physical project folder files on disk
    const isSafeToDelete = (targetPath: string): boolean => {
      if (!targetPath || typeof targetPath !== "string") return false;
      try {
        const resolved = path.resolve(targetPath);
        const root = path.parse(resolved).root;
        if (resolved === root) return false;

        const forbiddenExact = [
          "/",
          "/Users",
          "/home",
          "/etc",
          "/var",
          "/tmp",
          "/usr",
          "/bin",
          "/sbin",
          "/Applications",
          "/System",
          "/Library",
          os.homedir(),
          process.cwd(),
        ];
        if (forbiddenExact.includes(resolved)) return false;
        if (resolved === os.homedir()) return false;

        // Ensure path exists before attempting deletion
        return fs.existsSync(resolved);
      } catch {
        return false;
      }
    };

    if (isSafeToDelete(project.projectPath)) {
      try {
        fs.rmSync(project.projectPath, { recursive: true, force: true });
      } catch (err) {
        console.error("Failed to delete project directory:", err);
      }
    }

    if (project.managedLogFile && fs.existsSync(project.managedLogFile)) {
      try {
        fs.rmSync(project.managedLogFile, { force: true });
      } catch { /* ignore */ }
    }

    // 5. Notify Brain monitor loop to stop monitoring
    try {
      await fetch(`${BRAIN_URL}/v1/monitor/projects/${id}`, {
        method: "DELETE",
        signal: AbortSignal.timeout(3000),
      });
    } catch { /* Brain offline */ }

    // 6. Cascade delete database records
    // Alerts
    await prisma.rayMonitorAlert.deleteMany({
      where: { projectId: project.id },
    });

    // Pipelines & Pipeline Runs
    const pipelines = await prisma.rayPipeline.findMany({
      where: {
        userId: user.userId,
        OR: [{ projectId: project.id }, { name: project.name }],
      },
      select: { id: true },
    });
    const pipelineIds = pipelines.map((p) => p.id);
    if (pipelineIds.length > 0) {
      await prisma.rayPipelineRun.deleteMany({
        where: { pipelineId: { in: pipelineIds } },
      });
      await prisma.rayPipeline.deleteMany({
        where: { id: { in: pipelineIds } },
      });
    }

    // Deployments
    await prisma.rayDeployment.deleteMany({
      where: {
        userId: user.userId,
        OR: [
          { projectId: project.id },
          { name: project.name },
          { name: project.name.toLowerCase() },
          { containerName: `ray-${project.name.toLowerCase()}` },
        ],
      },
    });

    // RayMonitorProject
    await prisma.rayMonitorProject.delete({
      where: { id: project.id },
    });

    return NextResponse.json({
      ok: true,
      message: `Project ${project.name} and all linked resources deleted successfully.`,
    });
  } catch (err) {
    console.error("DELETE /api/projects/[id]:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
