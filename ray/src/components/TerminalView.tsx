"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Icon } from "@iconify/react";

export interface TerminalViewProps {
  title?: string;
  initialCwd?: string;
  containerId?: string | null;
  containerName?: string | null;
  hasContainer?: boolean;
  projectPath?: string;
  projectName?: string;
  onContainerToggle?: (mode: "container" | "host") => void;
  shellMode?: "container" | "host";
}

interface TerminalLogItem {
  id: string;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  cwd: string;
  user: string;
  host: string;
  timestamp: number;
}

export default function TerminalView({
  title = "Interactive Terminal",
  initialCwd,
  containerId,
  containerName,
  hasContainer = false,
  projectPath,
  projectName,
  onContainerToggle,
  shellMode = containerId ? "container" : "host",
}: TerminalViewProps) {
  const [currentShellMode, setCurrentShellMode] = useState<"container" | "host">(shellMode);
  const [logs, setLogs] = useState<TerminalLogItem[]>([]);
  const [inputCmd, setInputCmd] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [currentOutput, setCurrentOutput] = useState("");
  const [runningCmd, setRunningCmd] = useState("");

  const [cwd, setCwd] = useState<string>(initialCwd || "~");
  const [sysUser, setSysUser] = useState<string>("user");
  const [sysHost, setSysHost] = useState<string>("localhost");

  const terminalScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync shell mode if prop changes
  useEffect(() => {
    if (shellMode) {
      setCurrentShellMode(shellMode);
    }
  }, [shellMode]);

  // Set initial CWD based on mode
  useEffect(() => {
    if (currentShellMode === "container") {
      setCwd("/app");
      setSysUser("root");
      setSysHost(containerName || "container");
    } else {
      setCwd(initialCwd || projectPath || "~");
      // Query host prompt info once
      fetch("/api/terminal/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "", cwd: initialCwd || projectPath || "" }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.cwd) setCwd(data.cwd);
          if (data.user) setSysUser(data.user);
          if (data.host) setSysHost(data.host);
        })
        .catch(() => {});
    }
  }, [currentShellMode, initialCwd, projectPath, containerName]);

  // Auto scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (terminalScrollRef.current) {
      terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [logs, currentOutput, scrollToBottom]);

  // Execute Command
  const handleExecute = async (commandToRun?: string) => {
    const cmd = (commandToRun ?? inputCmd).trim();
    if (!cmd || isRunning) return;

    // Handle internal clear command
    if (cmd === "clear" || cmd === "cls") {
      setLogs([]);
      setInputCmd("");
      setHistory((prev) => [cmd, ...prev.filter((c) => c !== cmd)]);
      setHistoryIndex(-1);
      return;
    }

    // Add to history
    setHistory((prev) => [cmd, ...prev.filter((c) => c !== cmd)]);
    setHistoryIndex(-1);
    setInputCmd("");
    setIsRunning(true);
    setRunningCmd(cmd);
    setCurrentOutput("");

    const targetContainer = currentShellMode === "container" ? containerId || undefined : undefined;
    const targetCwd = currentShellMode === "container" ? undefined : cwd;

    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch("/api/terminal/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: cmd,
          cwd: targetCwd,
          containerId: targetContainer,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(await res.text() || "Failed to execute command");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let outputAcc = "";
      let finalExitCode = 0;
      let newCwd = cwd;
      let finalUser = sysUser;
      let finalHost = sysHost;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            try {
              const ev = JSON.parse(trimmed.slice(6));
              if (ev.type === "output" && ev.delta) {
                outputAcc += ev.delta;
                setCurrentOutput(outputAcc);
              } else if (ev.type === "done") {
                finalExitCode = ev.exitCode ?? 0;
                if (ev.cwd) newCwd = ev.cwd;
                if (ev.user) finalUser = ev.user;
                if (ev.host) finalHost = ev.host;
              }
            } catch {
              /* ignore parse error */
            }
          }
        }
      }

      // Add completed entry to log
      setLogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          command: cmd,
          stdout: outputAcc,
          stderr: "",
          exitCode: finalExitCode,
          cwd: cwd,
          user: sysUser,
          host: sysHost,
          timestamp: Date.now(),
        },
      ]);

      setCwd(newCwd);
      setSysUser(finalUser);
      setSysHost(finalHost);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setLogs((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            command: cmd,
            stdout: "",
            stderr: err.message || "Command failed",
            exitCode: 1,
            cwd: cwd,
            user: sysUser,
            host: sysHost,
            timestamp: Date.now(),
          },
        ]);
      }
    } finally {
      setIsRunning(false);
      setRunningCmd("");
      setCurrentOutput("");
      abortControllerRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // Cancel running command (Ctrl+C)
  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (isRunning) {
      setLogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          command: runningCmd,
          stdout: currentOutput,
          stderr: "^C (Cancelled)",
          exitCode: 130,
          cwd: cwd,
          user: sysUser,
          host: sysHost,
          timestamp: Date.now(),
        },
      ]);
      setIsRunning(false);
      setRunningCmd("");
      setCurrentOutput("");
    }
  };

  // Keyboard navigation for history (Up/Down)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleExecute();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx < history.length) {
        setHistoryIndex(nextIdx);
        setInputCmd(history[nextIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIdx = historyIndex - 1;
      if (nextIdx >= 0) {
        setHistoryIndex(nextIdx);
        setInputCmd(history[nextIdx]);
      } else {
        setHistoryIndex(-1);
        setInputCmd("");
      }
    } else if (e.key === "c" && (e.ctrlKey || e.metaKey)) {
      if (isRunning) {
        e.preventDefault();
        handleCancel();
      }
    } else if (e.key === "l" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setLogs([]);
    }
  };

  const handleModeSwitch = (mode: "container" | "host") => {
    if (mode === currentShellMode) return;
    setCurrentShellMode(mode);
    onContainerToggle?.(mode);
  };

  // Format path for display (replace home with ~)
  const formatDisplayPath = (p: string) => {
    if (!p) return "~";
    return p.replace(/^\/Users\/[^/]+/, "~").replace(/^\/home\/[^/]+/, "~");
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0c0c] text-white border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl font-mono text-xs">
      {/* Top Header & Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#080808] border-b border-white/[0.06] flex-shrink-0 select-none gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/80 shrink-0">
              <Icon icon="lucide:terminal" width={13} height={13} />
            </div>
            <span className="text-xs font-semibold text-white/90 font-sans tracking-tight truncate">
              {title}
            </span>
          </div>

          {/* Mode Switcher (Container vs Host) if project has container */}
          {hasContainer && (
            <div className="flex items-center bg-[#111] rounded-lg p-0.5 border border-white/[0.08] text-[11px] font-sans">
              <button
                type="button"
                onClick={() => handleModeSwitch("container")}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentShellMode === "container"
                    ? "bg-white/[0.08] text-white border border-white/10 font-medium shadow-sm"
                    : "text-white/40 hover:text-white"
                }`}
              >
                <Icon icon="lucide:box" width={12} height={12} />
                <span>Docker Shell</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch("host")}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentShellMode === "host"
                    ? "bg-white/[0.08] text-white border border-white/10 font-medium shadow-sm"
                    : "text-white/40 hover:text-white"
                }`}
              >
                <Icon icon="lucide:hard-drive" width={12} height={12} />
                <span>Host Shell</span>
              </button>
            </div>
          )}

          {/* Current Path Badge */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.02] text-white/50 border border-white/[0.06] text-[11px]"
            title={cwd}
          >
            <Icon icon="lucide:folder" width={12} height={12} className="text-white/40" />
            <span className="max-w-[200px] truncate">{formatDisplayPath(cwd)}</span>
          </div>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2 font-sans shrink-0">
          {isRunning && (
            <button
              type="button"
              onClick={handleCancel}
              className="ray-btn-ghost text-red-400 hover:text-red-300 border-red-500/25 px-2.5 py-1 text-[11px] flex items-center gap-1.5 cursor-pointer"
              title="Cancel running command (Ctrl+C)"
            >
              <Icon icon="lucide:square" width={10} height={10} />
              <span>Cancel</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setLogs([])}
            className="ray-btn-ghost text-white/60 hover:text-white px-2.5 py-1 text-[11px] flex items-center gap-1.5 cursor-pointer"
            title="Clear terminal (Ctrl+L)"
          >
            <Icon icon="lucide:trash-2" width={11} height={11} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div
        ref={terminalScrollRef}
        onClick={() => inputRef.current?.focus()}
        className="flex-1 overflow-y-auto p-4 space-y-3 cursor-text select-text"
        style={{ minHeight: "220px" }}
      >
        {/* Welcome Banner */}
        <div className="text-white/30 text-[11px] border-b border-white/[0.04] pb-2 leading-relaxed">
          <div>PutmeIn Interactive Terminal • {currentShellMode === "container" ? `Container [${containerName || "app"}]` : `Host [${sysHost}]`}</div>
          <div>Working Directory: <span className="text-white/50">{cwd}</span></div>
          <div>Use <span className="text-white/60 font-semibold">Arrow Up/Down</span> for history • Type <span className="text-white/60 font-semibold">clear</span> or Ctrl+L to reset view</div>
        </div>

        {/* Previous Executed Command Logs */}
        {logs.map((log) => (
          <div key={log.id} className="space-y-1">
            {/* Command prompt line */}
            <div className="flex items-center gap-2 text-white/90">
              <span className={currentShellMode === "container" ? "text-blue-400 font-semibold" : "text-emerald-400 font-semibold"}>
                {log.user}@{log.host}
              </span>
              <span className="text-white/30">:</span>
              <span className="text-amber-300/80">{formatDisplayPath(log.cwd)}</span>
              <span className="text-white/40">{currentShellMode === "container" ? "#" : "$"}</span>
              <span className="font-semibold text-white">{log.command}</span>
              {log.exitCode !== 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                  exit {log.exitCode}
                </span>
              )}
            </div>

            {/* Command stdout output */}
            {log.stdout && (
              <pre className="text-white/80 whitespace-pre-wrap break-all leading-relaxed pl-3 border-l-2 border-white/10 font-mono text-[11.5px]">
                {log.stdout}
              </pre>
            )}

            {/* Command stderr output */}
            {log.stderr && (
              <pre className="text-red-400/90 whitespace-pre-wrap break-all leading-relaxed pl-3 border-l-2 border-red-500/40 font-mono text-[11.5px]">
                {log.stderr}
              </pre>
            )}
          </div>
        ))}

        {/* Live Running Command Output */}
        {isRunning && (
          <div className="space-y-1 animate-pulse">
            <div className="flex items-center gap-2 text-white/90">
              <span className={currentShellMode === "container" ? "text-blue-400" : "text-emerald-400"}>
                {sysUser}@{sysHost}
              </span>
              <span className="text-white/30">:</span>
              <span className="text-amber-300/80">{formatDisplayPath(cwd)}</span>
              <span className="text-white/40">{currentShellMode === "container" ? "#" : "$"}</span>
              <span className="font-semibold text-white">{runningCmd}</span>
              <Icon icon="lucide:loader-2" width={12} height={12} className="animate-spin text-white/40 ml-1" />
            </div>

            {currentOutput && (
              <pre className="text-white/80 whitespace-pre-wrap break-all leading-relaxed pl-3 border-l-2 border-amber-500/40 font-mono text-[11.5px]">
                {currentOutput}
              </pre>
            )}
          </div>
        )}

        {/* Active Input Line */}
        {!isRunning && (
          <div className="flex items-center gap-2 text-white/90 pt-1">
            <span className={currentShellMode === "container" ? "text-blue-400 font-semibold" : "text-emerald-400 font-semibold"}>
              {sysUser}@{sysHost}
            </span>
            <span className="text-white/30">:</span>
            <span className="text-amber-300/80">{formatDisplayPath(cwd)}</span>
            <span className="text-white/40">{currentShellMode === "container" ? "#" : "$"}</span>
            <input
              ref={inputRef}
              type="text"
              value={inputCmd}
              onChange={(e) => setInputCmd(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              spellCheck={false}
              autoComplete="off"
              className="flex-1 bg-transparent border-none outline-none text-white font-mono text-xs focus:ring-0 p-0"
              placeholder="Type command and press Enter..."
            />
          </div>
        )}
      </div>

      {/* Quick Shortcuts Bar */}
      <div className="px-3 py-2 bg-[#0d0d0d] border-t border-white/[0.05] flex items-center justify-between text-[11px] text-white/40 select-none overflow-x-auto gap-2">
        <div className="flex items-center gap-1.5 flex-nowrap">
          <span className="text-white/25 mr-1 font-sans">Quick:</span>
          {["ls -la", "pwd", "git status", currentShellMode === "container" ? "env" : "docker ps"].map((cmd) => (
            <button
              key={cmd}
              type="button"
              onClick={() => handleExecute(cmd)}
              disabled={isRunning}
              className="px-2 py-0.5 rounded bg-white/[0.03] hover:bg-white/10 text-white/50 hover:text-white border border-white/[0.05] transition-all cursor-pointer disabled:opacity-40"
            >
              {cmd}
            </button>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2 text-[10.5px] text-white/30 font-sans">
          <span>{currentShellMode === "container" ? "Container Shell" : "Host Shell"}</span>
          <span>•</span>
          <span>bash/sh</span>
        </div>
      </div>
    </div>
  );
}
