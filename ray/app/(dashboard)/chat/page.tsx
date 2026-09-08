import { cookies } from "next/headers";
import ChatInterface from "@/components/ChatInterface";

// /chat — blank new session page
export default async function ChatPage() {
  const cookieStore = await cookies();
  const savedModel = cookieStore.get("ray_selected_model")?.value || "MiniMax-M3";
  return <ChatInterface initialModel={savedModel} />;
}
