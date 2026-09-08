import { redirect } from "next/navigation";

export default function DashboardRootPage() {
  // Default landing page when authenticated: redirect to chat
  redirect("/chat");
}
