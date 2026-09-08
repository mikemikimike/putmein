import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { getFullPortRegistry, findGuaranteedFreePort } from "@/lib/port-manager";

export const runtime = "nodejs";

// GET /api/ports — inspect all claimed ports across dashboard projects, docker, and system
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    let userId: string | undefined;

    if (token) {
      const user = await verifyToken(token);
      if (user) {
        userId = user.userId;
      }
    }

    const registry = await getFullPortRegistry(userId);
    return NextResponse.json(registry);
  } catch (err: unknown) {
    console.error("GET /api/ports error:", err);
    return NextResponse.json(
      { error: "Failed to resolve port registry", message: (err as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/ports — request a guaranteed free port for a deployment or service
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    let userId: string | undefined;

    if (token) {
      const user = await verifyToken(token);
      if (user) {
        userId = user.userId;
      }
    }

    const body = await req.json().catch(() => ({}));
    const preferredPort = body.preferredPort ? parseInt(body.preferredPort, 10) : undefined;

    const allocation = await findGuaranteedFreePort(preferredPort, userId);
    return NextResponse.json(allocation);
  } catch (err: unknown) {
    console.error("POST /api/ports error:", err);
    return NextResponse.json(
      { error: "Failed to allocate port", message: (err as Error).message },
      { status: 500 }
    );
  }
}
