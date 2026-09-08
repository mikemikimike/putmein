import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CursorGlow from "@/components/CursorGlow";
import { Link2, Key, Activity, GitBranch, RefreshCw, Shield, Database, ExternalLink } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Reference | PutMe.in",
  description: "Public REST, WebSocket, and Webhook API reference documentation for PutMe.in platforms.",
};

interface ApiCategory {
  category: string;
  endpoints: {
    name: string;
    method: "GET" | "POST" | "DELETE" | "WS";
    path: string;
    desc: string;
    href?: string;
  }[];
}

const API_GROUPS: ApiCategory[] = [
  {
    category: "Authentication & Keys",
    endpoints: [
      {
        name: "Create API Session Key",
        method: "POST",
        path: "/api/v1/auth/tokens",
        desc: "Generate scoped tokens for CI/CD runners and local agent daemons.",
        href: "#",
      },
      {
        name: "Verify Agent Permissions",
        method: "GET",
        path: "/api/v1/auth/verify",
        desc: "Inspect active Aegis sandbox and privilege escalation boundaries.",
        href: "#",
      },
    ],
  },
  {
    category: "Telemetry & SRE Monitoring",
    endpoints: [
      {
        name: "Live System Vitals Stream",
        method: "WS",
        path: "/api/v1/telemetry/stream",
        desc: "Real-time CPU, memory, socket latency, and cgroup metrics feed.",
        href: "#",
      },
      {
        name: "Query Incident Event Logs",
        method: "GET",
        path: "/api/v1/telemetry/incidents",
        desc: "Fetch structured post-mortem telemetry for crashed upstream processes.",
        href: "#",
      },
    ],
  },
  {
    category: "Autonomous Deployments",
    endpoints: [
      {
        name: "Trigger Nix Atomic Build",
        method: "POST",
        path: "/api/v1/deploy/nix-build",
        desc: "Submit git commit hash or Nix flake url for sandboxed compilation.",
        href: "#",
      },
      {
        name: "Execute Zero-Downtime Swap",
        method: "POST",
        path: "/api/v1/deploy/switchover",
        desc: "Atomically update production profile symlink across server fleet.",
        href: "#",
      },
    ],
  },
  {
    category: "Self-Healing & Shadow Proxy",
    endpoints: [
      {
        name: "Engage Shadow Proxy Reroute",
        method: "POST",
        path: "/api/v1/sre/shadow-proxy/reroute",
        desc: "Redirect ingress traffic to standby socket in under 1 second.",
        href: "#",
      },
      {
        name: "Trigger Worker Auto-Recycle",
        method: "POST",
        path: "/api/v1/sre/recycle-worker",
        desc: "Isolate memory-leaking thread and cleanly restart systemd unit.",
        href: "#",
      },
    ],
  },
  {
    category: "Aegis Security & SOC 2 Vault",
    endpoints: [
      {
        name: "Inspect Quarantined Payloads",
        method: "GET",
        path: "/api/v1/security/threats",
        desc: "Review prompt injections and unverified root commands blocked by Aegis.",
        href: "#",
      },
      {
        name: "Fetch Cryptographic Audit Trail",
        method: "GET",
        path: "/api/v1/security/audit-log",
        desc: "Retrieve tamper-proof SHA-256 signed records of autonomous actions.",
        href: "#",
      },
    ],
  },
];

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden selection:bg-white/20">
      <CursorGlow />
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 md:px-16 pt-36 pb-24">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="pixel-font text-5xl sm:text-6xl md:text-7xl font-bold text-white tracking-tight mb-4">
            API Reference
          </h1>
          <p className="text-zinc-400 text-base sm:text-lg font-light">
            Central directory for PutMe.in public APIs, streaming endpoints, and webhook specifications. Links and endpoint references will be populated here.
          </p>
        </div>

        {/* API Category Groups */}
        <div className="space-y-12">
          {API_GROUPS.map((group, gIdx) => (
            <div key={gIdx} className="space-y-4">
              <h2 className="text-xl font-bold text-white tracking-tight border-b border-white/10 pb-3">
                {group.category}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.endpoints.map((ep, eIdx) => {
                  const methodColor =
                    ep.method === "GET"
                      ? "text-blue-400 bg-blue-500/10 border-blue-500/30"
                      : ep.method === "POST"
                      ? "text-green-400 bg-green-500/10 border-green-500/30"
                      : ep.method === "WS"
                      ? "text-purple-400 bg-purple-500/10 border-purple-500/30"
                      : "text-amber-400 bg-amber-500/10 border-amber-500/30";

                  return (
                    <a
                      key={eIdx}
                      href={ep.href || "#"}
                      className="group p-5 rounded-xl bg-zinc-950/70 border border-white/10 hover:border-white/25 hover:bg-zinc-900/40 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${methodColor}`}
                          >
                            {ep.method}
                          </span>
                          <span className="text-xs font-mono text-zinc-500 group-hover:text-white transition-colors flex items-center gap-1">
                            <span>Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        </div>

                        <h3 className="text-base font-semibold text-white group-hover:text-white mb-1">
                          {ep.name}
                        </h3>

                        <code className="text-xs font-mono text-zinc-400 block mb-2 break-all">
                          {ep.path}
                        </code>

                        <p className="text-xs text-zinc-400 font-light leading-relaxed">
                          {ep.desc}
                        </p>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
