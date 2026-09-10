import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { chatRunner } from "@/lib/chatRunner";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ray_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await verifyToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (sessionId) {
    const run = chatRunner.getRun(sessionId);
    if (!run || run.userId !== user.userId) {
      return NextResponse.json({ run: null });
    }
    return NextResponse.json({
      run: {
        sessionId: run.sessionId,
        status: run.status,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        error: run.error,
        eventsCount: run.events.length,
        textLength: run.fullAssistantText.length,
        lastLine: run.events[run.events.length - 1]?.line,
      },
    });
  }

  const runs = chatRunner.getAllActiveRuns(user.userId);
  return NextResponse.json({ runs });
}
