import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:3100";

// POST /api/terminal/stream — proxy live SSE terminal streaming to Brain
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const brainRes = await fetch(`${BRAIN_URL}/v1/terminal/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!brainRes.ok || !brainRes.body) {
      const errText = await brainRes.text();
      return NextResponse.json(
        { error: errText || "Failed to start terminal stream" },
        { status: brainRes.status }
      );
    }

    return new Response(brainRes.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    console.error("POST /api/terminal/stream error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
