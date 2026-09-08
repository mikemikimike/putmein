import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { getDefaultDeploymentsDir, getDeploymentsDir } from "@/lib/settings";
import os from "os";

export const runtime = "nodejs";

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:3100";

// GET /api/settings — returns current agent and deployment directory settings
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let autonomous = false;
    let deploymentsPath = await getDeploymentsDir();
    const defaultDeploymentsPath = getDefaultDeploymentsDir();
    let apiKeys: Record<string, boolean> = {
      ozias: false,
      minimax: false,
      claude: false,
      openai: false,
      deepseek: false,
      gemini: false,
      openrouter: false,
    };

    try {
      const res = await fetch(`${BRAIN_URL}/v1/settings`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const data = await res.json();
        autonomous = data.autonomous ?? false;
        if (data.deploymentsPath) deploymentsPath = data.deploymentsPath;
        if (data.apiKeys) apiKeys = data.apiKeys;
      }
    } catch {
      // Use resolved fallback
    }

    return NextResponse.json({
      autonomous,
      deploymentsPath,
      defaultDeploymentsPath,
      platform: os.platform(),
      apiKeys,
    });
  } catch (err) {
    console.error("GET /api/settings error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/settings — updates agent and deployment directory settings
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const res = await fetch(`${BRAIN_URL}/v1/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Failed to update settings in Brain" }, { status: 502 });
  } catch (err) {
    console.error("POST /api/settings error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
