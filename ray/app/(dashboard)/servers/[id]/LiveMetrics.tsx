"use client";

import { useEffect, useState } from "react";
import { getLiveSystemStats } from "./actions";

const recentActivity = [
  { action: "Deployment", detail: "app-server-v2.1 deployed successfully", time: "2m ago", status: "ok" },
  { action: "Security Scan", detail: "No vulnerabilities detected", time: "1h ago", status: "ok" },
  { action: "Backup", detail: "Daily backup completed (4.2 GB)", time: "3h ago", status: "ok" },
  { action: "Alert", detail: "Memory usage spiked to 85%", time: "6h ago", status: "warn" },
  { action: "Update", detail: "nginx 1.25.3 → 1.27.0 applied", time: "1d ago", status: "ok" },
];

function KPICard({
  label,
  value,
  unit,
  percent,
  icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  percent?: number;
  icon: React.ReactNode;
}) {
  const getBarColor = (p: number) => {
    if (p < 60) return "rgba(255,255,255,0.5)";
    if (p < 80) return "#eab308";
    return "#ef4444";
  };

  return (
    <div className="ray-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-jersey text-sm tracking-widest" style={{ color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em" }}>
          {label.toUpperCase()}
        </span>
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            color: "rgba(255,255,255,0.4)",
          }}
        >
          {icon}
        </div>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="font-jersey text-5xl text-white leading-none">{value}</span>
        {unit && <span className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>{unit}</span>}
      </div>

      {percent !== undefined && (
        <div className="flex flex-col gap-1.5">
          <div className="w-full h-[2px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${percent}%`, background: getBarColor(percent) }}
            />
          </div>
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-mono)" }}>
            {percent}% in use
          </span>
        </div>
      )}
    </div>
  );
}

export default function LiveMetrics({ initialStats }: { initialStats: any }) {
  const [stats, setStats] = useState(initialStats);

  useEffect(() => {
    let mounted = true;

    async function poll() {
      while (mounted) {
        try {
          const newStats = await getLiveSystemStats();
          if (mounted) setStats(newStats);
        } catch (e) {
          console.error("Failed to fetch live stats", e);
        }
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    poll();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <div
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl mb-5 animate-fade-in"
        style={{
          background: "rgba(34,197,94,0.04)",
          border: "1px solid rgba(34,197,94,0.12)",
          animationDelay: "40ms",
        }}
      >
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{
            background: "#22c55e",
            boxShadow: "0 0 8px rgba(34,197,94,0.6)",
          }}
        />
        <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
          All systems operational
        </span>
        <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-mono)" }}>
          ↑ {stats.uptime}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 stagger-children">
        <KPICard
          label="CPU"
          value={stats.cpu}
          unit="%"
          percent={stats.cpu}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" />
              <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
              <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
              <line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" />
              <line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" />
            </svg>
          }
        />
        <KPICard
          label="Memory"
          value={stats.memory}
          unit="%"
          percent={stats.memory}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 19v-3"/><path d="M10 19v-3"/><path d="M14 19v-3"/><path d="M18 19v-3"/>
              <path d="M8 11V9"/><path d="M16 11V9"/><path d="M12 11V9"/>
              <path d="M2 15h20"/>
              <path d="M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1.1a2 2 0 0 0 0 3.837V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5.1a2 2 0 0 0 0-3.837Z"/>
            </svg>
          }
        />
        <KPICard
          label="Disk"
          value={stats.disk}
          unit="%"
          percent={stats.disk}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3"/>
              <path d="M3 5v14a9 3 0 0 0 18 0V5"/>
              <path d="M3 12a9 3 0 0 0 18 0"/>
            </svg>
          }
        />

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 animate-fade-in" style={{ animationDelay: "180ms" }}>
        <div className="ray-card p-5 lg:col-span-2">
          <h3 className="font-jersey text-xl text-white tracking-wide mb-4">Load Average</h3>
          <div className="flex flex-col gap-4">
            {["1 min", "5 min", "15 min"].map((label, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[11px] w-10 flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-mono)" }}>
                  {label}
                </span>
                <div className="flex-1 h-[2px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(stats.loadAvg[i] / 4) * 100}%`,
                      background: "rgba(255,255,255,0.45)",
                      transition: "width 0.8s ease",
                    }}
                  />
                </div>
                <span className="font-jersey text-lg w-10 text-right text-white">
                  {stats.loadAvg[i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="ray-card p-5 lg:col-span-3">
          <h3 className="font-jersey text-xl text-white tracking-wide mb-4">Recent Activity</h3>
          <div className="flex flex-col gap-3">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{
                    background: item.status === "ok" ? "#22c55e" : "#eab308",
                    boxShadow: item.status === "ok"
                      ? "0 0 6px rgba(34,197,94,0.6)"
                      : "0 0 6px rgba(234,179,8,0.5)",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>
                    {item.action}
                  </span>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                    {" · "}{item.detail}
                  </span>
                </div>
                <span className="text-[11px] flex-shrink-0" style={{ color: "rgba(255,255,255,0.15)", fontFamily: "var(--font-mono)" }}>
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
