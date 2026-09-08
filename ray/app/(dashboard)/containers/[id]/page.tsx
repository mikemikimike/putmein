"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

const SpinIcon = ({ size = 14 }: { size?: number }) => (
  <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export default function ContainerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [inspectData, setInspectData] = useState<any>(null);
  const [logs, setLogs] = useState("");
  const [loading, setLoading] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [search, setSearch] = useState("");
  const [tailLines, setTailLines] = useState(300);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/containers/${encodeURIComponent(id)}/logs?lines=${tailLines}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || "");
      }
    } catch { /* silent */ }
  }, [id, tailLines]);

  const fetchInspect = useCallback(async () => {
    try {
      const res = await fetch(`/api/containers/${encodeURIComponent(id)}`);
      if (res.ok) {
        const data = await res.json();
        const obj = Array.isArray(data) ? data[0] : data;
        setInspectData(obj || null);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    fetchInspect();
    fetchLogs();
    const interval = setInterval(() => {
      fetchLogs();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchInspect, fetchLogs]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const handleAction = async (action: "start" | "stop" | "restart" | "remove") => {
    setActionLoading(action);
    try {
      await fetch(`/api/containers/${encodeURIComponent(id)}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (action === "remove") {
        router.push("/containers");
      } else {
        fetchInspect();
        fetchLogs();
      }
    } catch { /* silent */ }
    finally { setActionLoading(null); }
  };

  const copyLogs = () => {
    navigator.clipboard.writeText(logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const containerName = inspectData?.Name ? inspectData.Name.replace(/^\//, "") : id;
  const image = inspectData?.Config?.Image || inspectData?.Image || "";
  const isRunning = inspectData?.State?.Running ?? true;
  const statusStr = inspectData?.State?.Status || (isRunning ? "running" : "stopped");

  // Extract port mapping
  let port = "";
  const portBindings = inspectData?.HostConfig?.PortBindings || inspectData?.NetworkSettings?.Ports;
  if (portBindings) {
    for (const key of Object.keys(portBindings)) {
      const b = portBindings[key];
      if (b && b[0]?.HostPort) {
        port = b[0].HostPort;
        break;
      }
    }
  }

  const effectiveUrl = port ? `http://localhost:${port}` : null;

  // Filter logs by search
  const filteredLogs = search
    ? logs
        .split("\n")
        .filter((line) => line.toLowerCase().includes(search.toLowerCase()))
        .join("\n")
    : logs;

  return (
    <div className="flex-1 flex flex-col overflow-hidden font-sans">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.06] bg-[#060606] flex items-center justify-between gap-4 flex-shrink-0">
        <div>
          <button
            onClick={() => router.push("/containers")}
            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white mb-1.5 transition-colors cursor-pointer"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
            <span>Back to Containers</span>
          </button>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 text-white shadow-sm">
              <Icon icon={inspectData?.icon || "logos:docker-icon"} width={20} height={20} className="shrink-0" />
            </div>
            <h1 className="font-jersey text-3xl text-white tracking-wide mr-1">{containerName}</h1>

            {/* 1. Framework Badge (1st) */}
            {inspectData?.framework && inspectData.framework !== "Docker" && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[11px] font-mono ${
                  inspectData.colorClasses || "bg-white/[0.04] border-white/[0.08] text-white/70"
                }`}
              >
                <Icon icon={inspectData.icon || "logos:nodejs-icon"} width={12} height={12} className="shrink-0" />
                <span>{inspectData.framework.toLowerCase()}</span>
              </span>
            )}

            {/* 2. Docker Badge (2nd) */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-sky-500/[0.08] border border-sky-500/20 text-[11px] font-mono text-sky-300">
              <Icon icon="logos:docker-icon" width={13} height={13} className="shrink-0" />
              <span>docker</span>
            </span>

            {/* 3. State Badge (No dots) */}
            <span
              className={`inline-flex items-center gap-1.5 text-[10.5px] font-mono font-bold px-2.5 py-0.5 rounded-md ${
                isRunning
                  ? "bg-emerald-500/[0.1] border border-emerald-500/25 text-emerald-300"
                  : "bg-red-500/[0.12] border border-red-500/25 text-red-300"
              }`}
            >
              <Icon
                icon={isRunning ? "lucide:check-circle-2" : "lucide:stop-circle"}
                width={11}
                height={11}
                className={isRunning ? "text-emerald-400" : "text-red-400"}
              />
              <span>{statusStr}</span>
            </span>

            {/* 4. Port Badge */}
            {port && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-500/[0.08] border border-blue-500/20 text-[11px] font-mono text-blue-300">
                <Icon icon="lucide:radio" width={11} height={11} className="text-blue-400/80" />
                <span>:{port}</span>
              </span>
            )}
          </div>
          <p className="text-[11px] font-mono text-white/40 mt-1">
            Image: {image} · ID: {id.substring(0, 12)}
          </p>
        </div>
        {/* Top Controls */}
        <div className="flex items-center gap-2">
          {effectiveUrl && (
            <a
              href={effectiveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ray-btn-primary flex items-center gap-1.5 text-xs px-3.5 py-1.5 cursor-pointer"
            >
              <Icon icon="lucide:external-link" width={12} height={12} />
              <span>Open App</span>
            </a>
          )}

          {isRunning ? (
            <>
              <button
                onClick={() => handleAction("restart")}
                disabled={!!actionLoading}
                className="ray-btn-ghost flex items-center gap-1.5 text-xs px-3 py-1.5 cursor-pointer disabled:opacity-40"
              >
                {actionLoading === "restart" ? <SpinIcon size={12} /> : <Icon icon="lucide:rotate-cw" width={12} height={12} />}
                <span>Restart</span>
              </button>
              <button
                onClick={() => handleAction("stop")}
                disabled={!!actionLoading}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
              >
                {actionLoading === "stop" ? <SpinIcon size={12} /> : <Icon icon="lucide:square" width={11} height={11} />}
                <span>Stop</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => handleAction("start")}
              disabled={!!actionLoading}
              className="ray-btn-primary flex items-center gap-1.5 text-xs px-3.5 py-1.5 cursor-pointer disabled:opacity-40"
            >
              {actionLoading === "start" ? <SpinIcon size={12} /> : <Icon icon="lucide:play" width={12} height={12} />}
              <span>Start</span>
            </button>
          )}
        </div>
      </div>

      {/* Terminal Toolbar */}
      <div className="px-6 py-2.5 border-b border-white/[0.06] bg-[#090909] flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">Live Logs Stream</span>
          <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-white/[0.04] border border-white/[0.06] text-white/40">
            docker logs -f {containerName}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Filter logs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#141414] border border-white/10 focus:border-white/25 focus:outline-none text-xs font-mono text-white placeholder:text-white/30 rounded-lg py-1 px-2.5 w-44 transition-all"
            />
          </div>

          <select
            value={tailLines}
            onChange={(e) => setTailLines(Number(e.target.value))}
            className="bg-[#141414] border border-white/10 text-xs font-mono text-white/80 rounded-lg py-1 px-2.5 cursor-pointer focus:outline-none"
          >
            <option value={100}>100 lines</option>
            <option value={300}>300 lines</option>
            <option value={1000}>1000 lines</option>
          </select>

          <label className="flex items-center gap-1.5 text-xs text-white/60 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="accent-white cursor-pointer"
            />
            <span>Auto-scroll</span>
          </label>

          <button
            onClick={copyLogs}
            className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/10 text-white/70 hover:text-white border border-white/[0.08] transition-colors cursor-pointer"
          >
            {copied ? "✓ Copied" : "Copy Logs"}
          </button>
        </div>
      </div>

      {/* Terminal View */}
      <div className="flex-1 overflow-y-auto p-6 font-mono text-xs leading-relaxed bg-[#020202] text-[#e2e8f0]">
        {filteredLogs ? (
          <pre className="whitespace-pre-wrap font-mono">{filteredLogs}</pre>
        ) : (
          <div className="flex items-center justify-center py-20 gap-2 text-white/30">
            <SpinIcon /><span className="text-xs font-mono">Connecting to container stream…</span>
          </div>
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
