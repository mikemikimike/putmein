import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:3100";
const BRAIN_INTERNAL_SECRET = process.env.BRAIN_INTERNAL_SECRET || "";

// GET /api/monitor/process?action=detect&path=...
// POST /api/monitor/process?action=spawn|stop
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ray_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await verifyToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const path = req.nextUrl.searchParams.get("path") || "";
  if (!path) return NextResponse.json({ error: "path required" }, { status: 400 });

  try {
    const res = await fetch(`${BRAIN_URL}/v1/monitor/process/detect?path=${encodeURIComponent(path)}`, {
      headers: { "x-internal-secret": BRAIN_INTERNAL_SECRET },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("process detect error:", err);
    return NextResponse.json({ processes: [], suggestedCommand: "" });
  }
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ray_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await verifyToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const action = req.nextUrl.searchParams.get("action") || "spawn";
  const body = await req.json();

  const endpoint = action === "stop" ? "stop" : "spawn";

  try {
    const res = await fetch(`${BRAIN_URL}/v1/monitor/process/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": BRAIN_INTERNAL_SECRET,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error(`process ${action} error:`, err);
    return NextResponse.json({ error: "Brain offline" }, { status: 503 });
  }
}
