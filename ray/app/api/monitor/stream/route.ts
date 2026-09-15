import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:4500";

// GET /api/monitor/stream — SSE proxy from Brain to the client
// This proxies brain's /v1/monitor/stream and also persists alerts to the DB
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ray_token")?.value;
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await verifyToken(token);
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get user's project IDs to filter alerts from brain
  const userProjects = await prisma.rayMonitorProject.findMany({
    where: { userId: user.userId },
    select: { id: true },
  });
  const userProjectIds = new Set(userProjects.map((p) => p.id));

  // Create a readable stream that proxies brain's SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendSSE = (event: string, data: string) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
      };

      sendSSE("ping", "connected");

      try {
        const brainRes = await fetch(`${BRAIN_URL}/v1/monitor/stream`, {
          headers: { Accept: "text/event-stream" },
          signal: AbortSignal.timeout(300_000), // 5 minute timeout
        });

        if (!brainRes.ok || !brainRes.body) {
          controller.close();
          return;
        }

        const reader = brainRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let currentEvent = "message";
          for (const line of lines) {
            if (line.startsWith("event:")) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              const data = line.slice(5).trim();
              if (currentEvent === "alert") {
                try {
                  const alert = JSON.parse(data);
                  // Only forward alerts that belong to this user's projects
                  if (alert.projectId && userProjectIds.has(alert.projectId)) {
                    // Persist alert to DB
                    try {
                      await prisma.rayMonitorAlert.create({
                        data: {
                          projectId: alert.projectId,
                          severity: alert.severity || "info",
                          message: alert.message || "",
                          rawLog: alert.rawLog || "",
                        },
                      });
                    } catch {
                      // May fail if alert already persisted — ignore
                    }
                    sendSSE("alert", data);
                  }
                } catch {
                  // Invalid JSON — ignore
                }
              } else {
                sendSSE(currentEvent, data);
              }
              currentEvent = "message";
            }
          }
        }
      } catch {
        // Brain disconnected — close stream
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
