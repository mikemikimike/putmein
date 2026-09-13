import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { chatRunner } from "@/lib/chatRunner";

export const runtime = "nodejs";
export const maxDuration = 300;

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
  "x-vercel-ai-data-stream": "v1",
};

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
    let {
      sessionId,
      messages,
      modelId = "MiniMax-M3",
      userMessageToSave,
      attachedContextItem,
      executionMode,
    } = body;

    // Ensure session exists and belongs to this user
    if (sessionId) {
      const existingSession = await prisma.rayChatSession.findFirst({
        where: { id: sessionId, userId: user.userId },
      });
      if (!existingSession) {
        return new Response(JSON.stringify({ error: "Session not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
    } else {
      // Create session if not passed
      const firstUserMsg = Array.isArray(messages) && messages.length > 0
        ? messages[messages.length - 1]?.content || "New Chat"
        : "New Chat";
      const title = firstUserMsg.slice(0, 40).replace(/\n/g, " ");
      const newSession = await prisma.rayChatSession.create({
        data: {
          userId: user.userId,
          title,
          model: modelId,
        },
      });
      sessionId = newSession.id;
    }

    // Start background chat run (if not already running)
    await chatRunner.startRun({
      sessionId,
      userId: user.userId,
      messages,
      modelId,
      userMessageToSave,
      attachedContextItem,
      executionMode,
    });

    // Subscribe to SSE stream (replaying buffer + live stream)
    const stream = chatRunner.subscribe(sessionId, user.userId);

    return new Response(stream, {
      headers: {
        ...SSE_HEADERS,
        "x-ray-session-id": sessionId,
      },
    });
  } catch (error) {
    console.error("Chat run error:", error);
    return new Response(
      JSON.stringify({ error: "Unable to start chat run. Something went wrong." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// GET /api/chat?sessionId=... — attach to active or completed stream
export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return new Response(JSON.stringify({ error: "sessionId required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const session = await prisma.rayChatSession.findFirst({
    where: { id: sessionId, userId: user.userId },
  });

  if (!session) {
    return new Response(JSON.stringify({ error: "Session not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = chatRunner.subscribe(sessionId, user.userId);

  return new Response(stream, {
    headers: {
      ...SSE_HEADERS,
      "x-ray-session-id": sessionId,
    },
  });
}
