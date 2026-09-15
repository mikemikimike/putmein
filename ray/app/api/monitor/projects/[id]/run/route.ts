import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:4500";
const BRAIN_INTERNAL_SECRET = process.env.BRAIN_INTERNAL_SECRET || "";

// GET /api/monitor/projects/[id]/run  — detect if a process is already running
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const project = await prisma.rayMonitorProject.findFirst({
      where: { id, userId: user.userId },
      select: { id: true, name: true, projectPath: true, runCommand: true, managedPid: true, managedLogFile: true },
    });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Ask Brain to detect running processes
    interface RunningProc {
      pid: number;
      command: string;
      runtime: string;
      logFile: string;
      port?: number;
      url?: string;
    }
    let processes: RunningProc[] = [];
    let suggestedCommand = project.runCommand || "";
    let managedPort: number | null = null;
    let managedUrl: string | null = null;
    let container: any = null;

    try {
      const res = await fetch(
        `${BRAIN_URL}/v1/monitor/process/detect?path=${encodeURIComponent(project.projectPath)}&id=${encodeURIComponent(id)}&name=${encodeURIComponent(project.name)}`,
        { headers: { "x-internal-secret": BRAIN_INTERNAL_SECRET }, signal: AbortSignal.timeout(8000) }
      );
      if (res.ok) {
        const data = await res.json();
        processes = (data.processes || []) as RunningProc[];
        if (!suggestedCommand) suggestedCommand = data.suggestedCommand || "";
        if (data.managedPort) managedPort = data.managedPort;
        if (data.managedUrl) managedUrl = data.managedUrl;
        if (data.container) container = data.container;
      }
    } catch {
      // Brain offline — return what we know from DB
    }

    // If managedPort was not directly returned, check if any running process has a port
    if (!managedPort && processes.length > 0) {
      const foundWithPort = processes.find((p) => p.port && p.port > 0);
      if (foundWithPort?.port) {
        managedPort = foundWithPort.port;
        managedUrl = foundWithPort.url || `http://localhost:${foundWithPort.port}`;
      }
    }

    return NextResponse.json({
      processes,
      suggestedCommand,
      managedPid: project.managedPid,
      managedLogFile: project.managedLogFile,
      managedPort,
      managedUrl,
      container,
    });
  } catch (err) {
    console.error("GET /api/monitor/projects/[id]/run:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/monitor/projects/[id]/run  — spawn or stop the project process
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const project = await prisma.rayMonitorProject.findFirst({
      where: { id, userId: user.userId },
      select: { id: true, projectPath: true, runCommand: true },
    });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const { action, command, killPid, containerName } = body as { action: "spawn" | "stop" | "restart-container"; command?: string; killPid?: number; containerName?: string };

    if (action === "stop") {
      if (containerName) {
        try {
          await fetch(`${BRAIN_URL}/v1/tools/exec`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-internal-secret": BRAIN_INTERNAL_SECRET },
            body: JSON.stringify({ command: `docker stop ${containerName}` }),
            signal: AbortSignal.timeout(10000),
          });
        } catch { /* silent */ }
      }

      // Tell Brain to stop
      try {
        await fetch(`${BRAIN_URL}/v1/monitor/process/stop`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-internal-secret": BRAIN_INTERNAL_SECRET },
          body: JSON.stringify({ projectId: id, pid: killPid }),
          signal: AbortSignal.timeout(5000),
        });
      } catch { /* Brain offline */ }

      await prisma.rayMonitorProject.update({
        where: { id },
        data: { managedPid: null, managedLogFile: null, updatedAt: new Date() },
      });
      return NextResponse.json({ ok: true, action: "stopped" });
    }

    if (action === "restart-container") {
      if (containerName) {
        try {
          await fetch(`${BRAIN_URL}/v1/tools/exec`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-internal-secret": BRAIN_INTERNAL_SECRET },
            body: JSON.stringify({ command: `docker restart ${containerName}` }),
            signal: AbortSignal.timeout(15000),
          });
        } catch { /* silent */ }
      }
      return NextResponse.json({ ok: true, action: "restarted" });
    }

    // action === "spawn"
    const cmd = command || project.runCommand || "npm run dev";
    const res = await fetch(`${BRAIN_URL}/v1/monitor/process/spawn`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-secret": BRAIN_INTERNAL_SECRET },
      body: JSON.stringify({ projectId: id, projectPath: project.projectPath, command: cmd, killPid: killPid || 0 }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: res.status });
    }

    const data = await res.json();
    const { pid, logFile, port, url } = data as { pid: number; logFile: string; command: string; port?: number; url?: string };

    // Persist managed process info to DB
    await prisma.rayMonitorProject.update({
      where: { id },
      data: {
        managedPid: pid,
        managedLogFile: logFile,
        runCommand: cmd,
        // Add the log file to logCommand so monitoring can read it
        logCommand: `tail -n 300 ${logFile}`,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ pid, logFile, command: cmd, port, url });
  } catch (err) {
    console.error("POST /api/monitor/projects/[id]/run:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
