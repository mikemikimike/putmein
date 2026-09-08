import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/sessions — list user's chat sessions
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sessions = await prisma.rayChatSession.findMany({
      where: { userId: user.userId },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        model: true,
        updatedAt: true,
        createdAt: true,
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json({ sessions });
  } catch (err) {
    console.error("GET /api/sessions:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/sessions — create a new session
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const model = body.model || body.modelId || cookieStore.get("ray_selected_model")?.value || "MiniMax-M3";
    const { title = "New Chat" } = body;

    const session = await prisma.rayChatSession.create({
      data: { userId: user.userId, title, model },
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (err) {
    console.error("POST /api/sessions:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/sessions — batch delete sessions by ID
export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { ids } = body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No session IDs provided" }, { status: 400 });
    }

    const result = await prisma.rayChatSession.deleteMany({
      where: {
        id: { in: ids },
        userId: user.userId,
      },
    });

    return NextResponse.json({ deletedCount: result.count });
  } catch (err) {
    console.error("DELETE /api/sessions:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

