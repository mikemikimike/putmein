import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { NextRequest } from "next/server";

import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 300;

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:3100";

export async function POST(request: NextRequest) {
  // Verify authentication
  const cookieStore = await cookies();
  const token = cookieStore.get("ray_token")?.value;

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const user = await verifyToken(token);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const { messages, modelId = "MiniMax-M3" } = body;

    // Fetch user's monitor projects from DB to give AI full context
    let monitorProjects: unknown[] = [];
    try {
      const dbProjects = await prisma.rayMonitorProject.findMany({
        where: { userId: user.userId },
        orderBy: { updatedAt: "desc" },
        include: {
          alerts: {
            where: { dismissed: false },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      });
      monitorProjects = dbProjects.map((p) => ({
        id: p.id,
        name: p.name,
        projectPath: p.projectPath,
        logPaths: p.logPaths,
        logCommand: p.logCommand,
        runCommand: p.runCommand,
        intervalSec: p.intervalSec,
        status: p.status,
        memory: p.memory,
        memoryStatus: p.memoryStatus,
        projectUrl: p.projectUrl,
        managedPid: p.managedPid,
        managedLogFile: p.managedLogFile,
        alerts: p.alerts.map((a) => ({
          severity: a.severity,
          message: a.message,
          createdAt: a.createdAt.toISOString(),
        })),
      }));
    } catch (dbErr) {
      console.warn("Could not load monitor projects for chat:", dbErr);
    }

    // Fetch user's GitHub integration for authenticated git operations
    let githubToken: string | null = null;
    let githubUsername = "";
    try {
      const { getEffectiveGitHubToken } = await import("@/lib/github-app");
      githubToken = await getEffectiveGitHubToken(user.userId);
      const integration = await prisma.rayGithubIntegration.findFirst({
        where: { userId: user.userId },
      });
      if (integration?.githubUsername) {
        githubUsername = integration.githubUsername;
      }
    } catch { /* silent */ }

    // Proxy the request to brain — brain owns all AI logic
    // Sanitize messages so internal metadata comments are stripped from the AI context
    const sanitizedMessages = Array.isArray(messages)
      ? messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: typeof m.content === "string"
            ? m.content.replace(/^<!-- (rayAssistantMeta|attachedContext):[\s\S]*?-->\n?/, "")
            : m.content,
        }))
      : messages;

    const brainResponse = await fetch(`${BRAIN_URL}/v1/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: sanitizedMessages,
        modelId,
        mode: "web",
        userId: user.userId,
        monitorProjects,
        githubToken: githubToken || undefined,
        githubUsername: githubUsername || undefined,
      }),
    });

    if (!brainResponse.ok) {
      const errText = await brainResponse.text();
      console.error("Brain error:", brainResponse.status, errText);
      const message = errText.trim()
        ? `Brain AI service error (${brainResponse.status}): ${errText.trim()}`
        : "Brain AI service is not available. Something went wrong.";
      return new Response(
        JSON.stringify({ error: message }),
        {
          status: brainResponse.status >= 400 && brainResponse.status < 600 ? brainResponse.status : 502,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Pipe brain's SSE stream directly back to the client
    // brain already emits Vercel AI SDK-compatible format (0:, d: lines)
    return new Response(brainResponse.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        "x-vercel-ai-data-stream": "v1",
      },
    });
  } catch (error) {
    console.error("Chat proxy error:", error);
    return new Response(
      JSON.stringify({ error: "Server connection error: Unable to communicate with Brain AI backend. Something went wrong." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
