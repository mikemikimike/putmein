import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:4500";

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

    const session = await prisma.rayChatSession.findFirst({
      where: { id, userId: user.userId },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 2 } },
    });

    if (!session || session.messages.length === 0) {
      return NextResponse.json({ error: "Session or messages not found" }, { status: 404 });
    }

    const userMessage = session.messages[0].content;
    const aiMessage = session.messages[1]?.content || "";

    function extractCleanSnippet(msg: string): string {
      // Strip XML tags e.g. <deploy ...>, <exec>...</exec>
      let clean = msg.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (!clean) {
        const nameMatch = msg.match(/name=["']([^"']+)["']/i);
        if (nameMatch) {
          clean = `Deploy ${nameMatch[1]}`;
        } else {
          clean = "New Task";
        }
      }
      return clean.split(/\s+/).slice(0, 5).join(" ").trim() || "New Chat";
    }

    let newTitle = "New Chat";
    try {
      const res = await fetch(`${BRAIN_URL}/v1/sessions/generate-title`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstMessage: userMessage,
          userMessage,
          assistantMessage: aiMessage,
          modelId: session.model,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.title && typeof data.title === "string") {
          newTitle = data.title.replace(/<[^>]+>/g, "").trim().replace(/^["']|["']$/g, "");
        }
      } else {
        throw new Error(`Brain title status ${res.status}`);
      }
    } catch (aiErr) {
      console.warn("AI title generation failed, falling back to message snippet:", aiErr);
      newTitle = extractCleanSnippet(userMessage);
    }

    await prisma.rayChatSession.update({
      where: { id: session.id },
      data: { title: newTitle },
    });

    return NextResponse.json({ title: newTitle });
  } catch (err) {
    console.error("POST /api/sessions/[id]/generate-title:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
