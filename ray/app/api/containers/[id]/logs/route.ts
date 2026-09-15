import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:4500";

// GET /api/containers/[id]/logs?lines=300
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
    const lines = req.nextUrl.searchParams.get("lines") || "300";

    const res = await fetch(`${BRAIN_URL}/v1/containers/${encodeURIComponent(id)}/logs?lines=${lines}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to read logs" }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/containers/[id]/logs:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
