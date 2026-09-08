import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";
import ChatInterface from "@/components/ChatInterface";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function ChatSessionPage({ params }: PageProps) {
  const { sessionId } = await params;

  // Auth check
  const cookieStore = await cookies();
  const token = cookieStore.get("ray_token")?.value;
  if (!token) return notFound();
  const user = await verifyToken(token);
  if (!user) return notFound();

  // Load session with messages
  const session = await prisma.rayChatSession.findFirst({
    where: { id: sessionId, userId: user.userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!session) return notFound();

  // Map DB messages to component format
  const initialMessages = session.messages.map((m) => {
    let content = m.content;
    let attachedContext = undefined;
    let thinking: string | undefined = undefined;
    let toolBlocks = undefined;

    const match = content.match(/^<!-- attachedContext:(.*?) -->\n?/);
    if (match) {
      try {
        attachedContext = JSON.parse(match[1]);
        content = content.replace(/^<!-- attachedContext:(.*?) -->\n?/, "");
      } catch { /* not json */ }
    }

    const metaMatch = content.match(/^<!-- rayAssistantMeta:(.*?) -->\n?/);
    if (metaMatch) {
      try {
        const meta = JSON.parse(metaMatch[1]);
        if (meta.thinking) thinking = meta.thinking;
        if (Array.isArray(meta.toolBlocks)) toolBlocks = meta.toolBlocks;
        content = content.replace(/^<!-- rayAssistantMeta:(.*?) -->\n?/, "");
      } catch { /* not json */ }
    }

    return {
      id: m.id,
      role: m.role as "user" | "assistant",
      content,
      thinking,
      toolBlocks,
      attachedContext,
      timestamp: m.createdAt,
      streaming: false,
    };
  });

  return (
    <ChatInterface
      initialSessionId={sessionId}
      initialMessages={initialMessages}
      initialModel={session.model}
    />
  );
}
