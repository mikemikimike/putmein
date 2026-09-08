import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/sessions/[id]/messages — save messages to session
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("ray_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await verifyToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify session belongs to user
    const session = await prisma.rayChatSession.findFirst({
      where: { id, userId: user.userId },
    });
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const body = await req.json();
    // messages: Array<{ role: "user" | "assistant", content: string }>
    const { messages } = body as {
      messages: { role: "user" | "assistant"; content: string }[];
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    // Insert messages in order
    await prisma.rayChatMessage.createMany({
      data: messages.map((m) => ({
        sessionId: id,
        role: m.role,
        content: m.content,
      })),
    });

    // Touch session updatedAt
    await prisma.rayChatSession.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ saved: messages.length }, { status: 201 });
  } catch (err) {
    console.error("POST /api/sessions/[id]/messages:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
