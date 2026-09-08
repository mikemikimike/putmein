import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import LiveMetrics from "./LiveMetrics";
import { getLiveSystemStats } from "./actions";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ray_token")?.value;
  const user = token ? await verifyToken(token) : null;
  const firstName = user?.name?.split(" ")[0] || "there";

  const sysStats = await getLiveSystemStats(); // No network delay for instant load

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 sm:py-6">
      {/* Header */}
      <div className="mb-5 animate-fade-in">
        <h1 className="font-jersey text-3xl sm:text-4xl text-white tracking-wide mb-0.5">Dashboard</h1>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>
          Welcome back, {firstName} — system overview
        </p>
      </div>

      <LiveMetrics initialStats={sysStats} />
    </div>
  );
}
