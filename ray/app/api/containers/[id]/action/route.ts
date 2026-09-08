import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:3100";

// POST /api/containers/[id]/action — { action: "start" | "stop" | "restart" | "remove" }
export async function POST(
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
    const action = body.action || "restart";

    const res = await fetch(`${BRAIN_URL}/v1/containers/${encodeURIComponent(id)}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText || "Action failed" }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("POST /api/containers/[id]/action:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
