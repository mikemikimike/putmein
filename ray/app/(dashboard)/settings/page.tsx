"use client";

import { useState, useEffect } from "react";

const BRAIN_URL = process.env.NEXT_PUBLIC_BRAIN_URL || "http://localhost:3100";

export default function SettingsPage() {
  const [activeView, setActiveView] = useState<"general" | "keys">("general");
  const [saved, setSaved] = useState(false);
  const [autonomous, setAutonomous] = useState(false);
  const [autonomousLoading, setAutonomousLoading] = useState(true);
  const [autonomousSaving, setAutonomousSaving] = useState(false);

  const [deploymentsPath, setDeploymentsPath] = useState("");
  const [defaultDeploymentsPath, setDefaultDeploymentsPath] = useState("");
  const [deploymentsSaving, setDeploymentsSaving] = useState(false);
  const [deploymentsSaved, setDeploymentsSaved] = useState(false);

  // AI Model Keys state
  const [apiKeysStatus, setApiKeysStatus] = useState<Record<string, boolean>>({});
  const [apiKeysInput, setApiKeysInput] = useState<Record<string, string>>({
    ozias: "",
    claude: "",
    openai: "",
    deepseek: "",
    gemini: "",
    openrouter: "",
  });
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [keysSaving, setKeysSaving] = useState(false);
  const [keysSaved, setKeysSaved] = useState(false);

  // Fetch current settings on mount & check URL params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "keys") {
        setActiveView("keys");
      }
    }

    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setAutonomous(data.autonomous ?? false);
        setDeploymentsPath(data.deploymentsPath ?? "");
        setDefaultDeploymentsPath(data.defaultDeploymentsPath ?? "");
        if (data.apiKeys) {
          setApiKeysStatus(data.apiKeys);
        }
        setAutonomousLoading(false);
      })
      .catch(() => setAutonomousLoading(false));
  }, []);

  const handleSaveApiKeys = async (e?: React.FormEvent, specificKey?: string) => {
    if (e) e.preventDefault();
    setKeysSaving(true);
    try {
      const payload = specificKey
        ? { [specificKey]: apiKeysInput[specificKey] }
        : apiKeysInput;

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKeys: payload }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.apiKeys) setApiKeysStatus(data.apiKeys);
        // Clear input values after saving for security
        setApiKeysInput({
          ozias: "",
          claude: "",
          openai: "",
          deepseek: "",
          gemini: "",
          openrouter: "",
        });
        setKeysSaved(true);
        setTimeout(() => setKeysSaved(false), 2500);
      }
    } catch { /* silent */ }
    setKeysSaving(false);
  };

  const handleRemoveApiKey = async (providerId: string) => {
    setKeysSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeApiKey: providerId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.apiKeys) setApiKeysStatus(data.apiKeys);
        setApiKeysInput((prev) => ({ ...prev, [providerId]: "" }));
        setKeysSaved(true);
        setTimeout(() => setKeysSaved(false), 2500);
      }
    } catch { /* silent */ }
    setKeysSaving(false);
  };

  const toggleAutonomous = async () => {
    setAutonomousSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autonomous: !autonomous }),
      });
      const data = await res.json();
      setAutonomous(data.autonomous ?? !autonomous);
    } catch {
      // Optimistic toggle
      setAutonomous((v) => !v);
    }
    setAutonomousSaving(false);
  };

  const handleSaveDeploymentsPath = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setDeploymentsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deploymentsPath }),
      });
      if (res.ok) {
        const data = await res.json();
        setDeploymentsPath(data.deploymentsPath);
        setDeploymentsSaved(true);
        setTimeout(() => setDeploymentsSaved(false), 2500);
      }
    } catch { /* silent */ }
    setDeploymentsSaving(false);
  };

  const handleResetDefaultDeploymentsPath = async () => {
    setDeploymentsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deploymentsPath: "" }),
      });
      if (res.ok) {
        const data = await res.json();
        setDeploymentsPath(data.deploymentsPath);
        setDeploymentsSaved(true);
        setTimeout(() => setDeploymentsSaved(false), 2500);
      }
    } catch { /* silent */ }
    setDeploymentsSaving(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const PROVIDER_CARDS = [
    {
      id: "ozias",
      name: "Ozias Agent",
      logo: "/ai/ozias.png",
      status: apiKeysStatus.ozias || apiKeysStatus.minimax,
      subtitle: "Autonomous DevOps & system execution agent",
      placeholder: "sk-api-…",
      models: ["Ozias (MiniMax-M3)", "Agent Shell Execution"],
      docUrl: "https://platform.minimaxi.com",
    },
    {
      id: "claude",
      name: "Anthropic Claude",
      logo: "/ai/Claude.svg",
      status: apiKeysStatus.claude,
      subtitle: "Frontier reasoning, deep architecture & coding",
      placeholder: "sk-ant-…",
      models: ["Sonnet 5", "Opus 5", "Claude 4.6 Sonnet/Opus", "Claude 4.7 Opus", "Fable 5.1", "Haiku 4.5"],
      docUrl: "https://console.anthropic.com/settings/keys",
    },
    {
      id: "openai",
      name: "OpenAI ChatGPT",
      logo: "/ai/OpenAI.svg",
      status: apiKeysStatus.openai,
      subtitle: "Advanced foundation & reasoning models",
      placeholder: "sk-proj-…",
      models: ["GPT-6", "GPT-5.6", "GPT-5.5", "GPT-5.4"],
      docUrl: "https://platform.openai.com/api-keys",
    },
    {
      id: "deepseek",
      name: "DeepSeek AI",
      logo: "/ai/DeepSeek.svg",
      status: apiKeysStatus.deepseek,
      subtitle: "High efficiency code, math & multimodal",
      placeholder: "sk-…",
      models: ["DeepSeek V4 Flash Vision Exp", "DeepSeek V4 Pro", "DeepSeek V4 Flash"],
      docUrl: "https://platform.deepseek.com/api_keys",
    },
    {
      id: "gemini",
      name: "Google Gemini",
      logo: "/ai/Gemini.svg",
      status: apiKeysStatus.gemini,
      subtitle: "Multimodal intelligence with thinking controls",
      placeholder: "AIzaSy…",
      models: ["Gemini 3.8 Flash (High/Med/Low)", "Gemini 3.7 Flash", "Gemini 3.1 Pro Preview"],
      docUrl: "https://aistudio.google.com/app/apikey",
    },
    {
      id: "openrouter",
      name: "OpenRouter",
      logo: "/ai/OpenRouter.svg",
      status: apiKeysStatus.openrouter,
      subtitle: "Universal gateway to hundreds of open & custom models",
      placeholder: "sk-or-v1-…",
      models: ["Claude 3.7 Sonnet", "DeepSeek R1", "Llama 3.3 70B", "Custom routing"],
      docUrl: "https://openrouter.ai/keys",
    },
  ];

  /* ── VIEW 2: DEDICATED AI MODEL KEYS SUBPAGE ── */
  if (activeView === "keys") {
    return (
      <div className="flex-1 overflow-y-auto px-6 py-6 font-sans">
        <div className="max-w-4xl mx-auto animate-fade-in pb-16">
          {/* Top Back Navigation & Page Header */}
          <div className="mb-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                setActiveView("general");
                if (typeof window !== "undefined") {
                  window.history.replaceState({}, "", "/settings");
                }
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-white transition-colors cursor-pointer w-fit py-1 px-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
              <span>Back to Settings</span>
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-jersey text-3xl text-white tracking-wide mb-1">
                  AI Model Keys
                </h1>
                <p className="text-xs text-white/50">
                  Configure single API keys per provider. Each key powers all corresponding models in Ray Chat and Brain.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {keysSaved && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 font-medium">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    <span>Keys Updated!</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => handleSaveApiKeys(e)}
                  disabled={keysSaving}
                  className="ray-btn-primary flex items-center gap-1.5 text-xs px-4 py-2 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {keysSaving ? (
                    <>
                      <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save All Keys</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Cards Grid: 2 Columns */}
          <form onSubmit={handleSaveApiKeys} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PROVIDER_CARDS.map((card) => {
              const isSet = card.status;
              const hasInput = !!apiKeysInput[card.id];

              return (
                <div
                  key={card.id}
                  className="rounded-2xl border border-white/[0.08] bg-[#0c0c0c] p-5 shadow-lg flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Logo, Name, and Status */}
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={card.logo}
                          alt={card.name}
                          width={28}
                          height={28}
                          className="rounded-lg object-contain shrink-0"
                        />
                        <div>
                          <h3 className="font-sans font-bold text-sm text-white tracking-tight">
                            {card.name}
                          </h3>
                          <p className="text-[11px] text-white/45 line-clamp-1">
                            {card.subtitle}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md flex-shrink-0 ${isSet
                          ? "bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-300"
                          : "bg-white/[0.03] border border-white/[0.06] text-white/40"
                          }`}
                      >
                        {isSet ? "● Configured" : "○ Not Set"}
                      </span>
                    </div>

                    {/* Supported Models List Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap my-3">
                      {card.models.map((m) => (
                        <span
                          key={m}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-white/60"
                        >
                          {m}
                        </span>
                      ))}
                    </div>

                    {/* API Key Input */}
                    <div className="mt-3">
                      <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">
                        API Key
                      </label>
                      <div className="relative">
                        <input
                          type={showKey[card.id] ? "text" : "password"}
                          placeholder={isSet ? "••••••••••••••••••••••••" : card.placeholder}
                          value={apiKeysInput[card.id]}
                          onChange={(e) =>
                            setApiKeysInput((prev) => ({ ...prev, [card.id]: e.target.value }))
                          }
                          className="w-full bg-[#141414] border border-white/10 focus:border-white/25 focus:outline-none text-xs font-mono text-white placeholder:text-white/30 rounded-lg py-2 px-3 pr-16 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowKey((prev) => ({ ...prev, [card.id]: !prev[card.id] }))
                          }
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-white/40 hover:text-white px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                        >
                          {showKey[card.id] ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Footer: External Get Key Link & Quick Save / Remove */}
                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                    <a
                      href={card.docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-white/40 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>Get API key ↗</span>
                    </a>

                    <div className="flex items-center gap-2">
                      {isSet && (
                        <button
                          type="button"
                          disabled={keysSaving}
                          onClick={() => handleRemoveApiKey(card.id)}
                          className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 transition-all disabled:opacity-30 cursor-pointer flex items-center gap-1"
                          title="Remove configured API key"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                          <span>Remove</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={!hasInput || keysSaving}
                        onClick={(e) => handleSaveApiKeys(e, card.id)}
                        className="px-3 py-1 text-[11px] font-semibold rounded-lg bg-white/[0.05] hover:bg-white/10 text-white/70 hover:text-white border border-white/[0.08] transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      >
                        Save Key
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </form>
        </div>
      </div>
    );
  }

  /* ── VIEW 1: MAIN SETTINGS PAGE ── */
  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 font-sans">
      <div className="max-w-2xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-jersey text-4xl text-white tracking-wide mb-1">
            Settings
          </h1>
          <p className="text-sm text-[#52525b]">
            Manage your account and preferences
          </p>
        </div>

        {/* AI Model Keys Summary Card */}
        <div
          className="ray-card p-6 mb-4"
          style={{
            background: "#0a0a0a",
            border: "1px solid #1a1a1a",
            borderRadius: "12px",
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
            <div>
              <h2 className="font-jersey text-xl text-white tracking-wide mb-1">
                AI Model Keys & Providers
              </h2>
              <p className="text-xs text-[#52525b]">
                Manage authentication keys for Ozias, Claude, OpenAI, DeepSeek, Gemini, and OpenRouter.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveView("keys");
                if (typeof window !== "undefined") {
                  window.history.pushState({}, "", "/settings?tab=keys");
                }
              }}
              className="ray-btn-primary px-4 py-2 text-xs flex items-center gap-2 cursor-pointer flex-shrink-0"
            >
              <span>Change AI Model Keys</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>

          {/* Provider Status Chips Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 border-t border-white/[0.04]">
            {PROVIDER_CARDS.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  setActiveView("keys");
                  if (typeof window !== "undefined") {
                    window.history.pushState({}, "", "/settings?tab=keys");
                  }
                }}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/10 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <img src={p.logo} alt={p.name} width={18} height={18} className="rounded-md object-contain shrink-0" />
                  <span className="text-xs font-semibold text-white/80 group-hover:text-white truncate">{p.name}</span>
                </div>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${p.status ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" : "text-white/30 bg-white/[0.03] border border-white/[0.06]"}`}>
                  {p.status ? "● Set" : "○ Off"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Settings */}
        <div className="ray-card p-6 mb-4">
          <h2 className="font-jersey text-xl text-white tracking-wide mb-1">
            Agent
          </h2>
          <p className="text-xs text-[#52525b] mb-5">
            Control how the AI agent behaves on your server
          </p>

          {/* Autonomous Mode Toggle */}
          <div
            className="flex items-center justify-between p-4 rounded-lg"
            style={{ background: "#111", border: "1px solid #222" }}
          >
            <div>
              <div className="text-sm font-medium text-white mb-0.5">
                Autonomous Mode
              </div>
              <div className="text-xs text-[#52525b]">
                Allow the agent to run commands and access files without asking
                for permission each time
              </div>
            </div>
            <button
              onClick={toggleAutonomous}
              disabled={autonomousLoading || autonomousSaving}
              id="autonomous-mode-toggle"
              aria-label="Toggle autonomous mode"
              style={{
                position: "relative",
                flexShrink: 0,
                marginLeft: 16,
                width: 36,
                height: 20,
                borderRadius: 10,
                border: "none",
                outline: "none",
                cursor: autonomousLoading || autonomousSaving ? "not-allowed" : "pointer",
                background: autonomous ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.12)",
                transition: "background 180ms",
                opacity: autonomousLoading ? 0.4 : 1,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  left: autonomous ? 19 : 3,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: autonomous ? "#111" : "rgba(255,255,255,0.6)",
                  transition: "left 180ms, background 180ms",
                }}
              />
            </button>
          </div>

          {autonomous && (
            <div
              className="mt-3 flex items-start gap-2 p-3 rounded-lg text-xs"
              style={{
                background: "rgba(255,214,10,0.06)",
                border: "1px solid rgba(255,214,10,0.2)",
                color: "#FFD60A",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="flex-shrink-0 mt-0.5"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>
                <strong>Autonomous mode is active.</strong> The agent will
                execute shell commands, read and write files without asking for
                your permission. Disable this if you want to review each action.
              </span>
            </div>
          )}
        </div>

        {/* Deployments & Containers Base Directory */}
        <div
          className="ray-card p-6 mb-4"
          style={{
            background: "#0a0a0a",
            border: "1px solid #1a1a1a",
            borderRadius: "12px",
          }}
        >
          <div className="flex items-start justify-between gap-4 mb-1">
            <div>
              <h2 className="font-jersey text-xl text-white tracking-wide mb-1">
                Deployments & Containers
              </h2>
              <p className="text-xs text-[#52525b]">
                Specify where container workspaces, cloned repositories, and project deployments are stored.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveDeploymentsPath} className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wide">
                  Base Deployment Directory
                </label>
                {defaultDeploymentsPath && (
                  <span className="text-[10px] text-white/30 font-mono truncate max-w-[300px]">
                    Default: {defaultDeploymentsPath}
                  </span>
                )}
              </div>
              <input
                className="ray-input font-mono text-xs"
                type="text"
                placeholder={defaultDeploymentsPath || "~/.ray/deployments"}
                value={deploymentsPath}
                onChange={(e) => setDeploymentsPath(e.target.value)}
              />
              <p className="text-[11px] text-[#52525b] mt-0.5">
                The AI agent, GitHub auto-sync, and container builder automatically deploy into subdirectories inside this folder.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={deploymentsSaving}
                className="ray-btn-primary px-4 py-2 text-xs flex items-center gap-2 cursor-pointer"
              >
                {deploymentsSaved ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Saved!</span>
                  </>
                ) : deploymentsSaving ? (
                  "Saving..."
                ) : (
                  "Save Directory"
                )}
              </button>

              <button
                type="button"
                onClick={handleResetDefaultDeploymentsPath}
                disabled={deploymentsSaving}
                className="ray-btn-ghost px-3 py-2 text-xs cursor-pointer"
              >
                Reset to Default
              </button>
            </div>
          </form>
        </div>

        {/* Profile Section */}
        <div
          className="ray-card p-6 mb-4"
          style={{
            background: "#0a0a0a",
            border: "1px solid #1a1a1a",
            borderRadius: "12px",
          }}
        >
          <h2 className="font-jersey text-xl text-white tracking-wide mb-5">
            Profile
          </h2>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wide">
                Display Name
              </label>
              <input
                className="ray-input"
                type="text"
                placeholder="Your name"
                defaultValue=""
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wide">
                Email
              </label>
              <input
                className="ray-input"
                type="email"
                placeholder="you@example.com"
                defaultValue=""
              />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                className="ray-btn-primary px-5 py-2"
                style={{ fontSize: "0.875rem" }}
              >
                {saved ? (
                  <span className="flex items-center gap-2">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Saved!
                  </span>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </form>
        </div>

        {/* GitHub Integration Section */}
        <GitHubSettingsCard />

        {/* Danger Zone */}
        <div
          className="ray-card p-6"
          style={{
            background: "#0a0a0a",
            border: "1px solid rgba(239,68,68,0.15)",
            borderRadius: "12px",
          }}
        >
          <h2
            className="font-jersey text-xl tracking-wide mb-1"
            style={{ color: "#fca5a5" }}
          >
            Danger Zone
          </h2>
          <p className="text-xs text-[#52525b] mb-4">
            Irreversible and destructive actions
          </p>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all duration-200"
            style={{
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "#fca5a5",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}

function GitHubSettingsCard() {
  const [status, setStatus] = useState<{ connected: boolean; integration?: any }>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [repos, setRepos] = useState<any[]>([]);
  const [tokenInput, setTokenInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [manifestLoading, setManifestLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/github/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.connected) {
          fetchRepos();
        }
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const fetchRepos = async () => {
    try {
      const res = await fetch("/api/github/repos");
      if (res.ok) {
        const data = await res.json();
        setRepos(data.repos || []);
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Coolify-style 1-click GitHub App creation
  const handleCoolifyAppSetup = async () => {
    setManifestLoading(true);
    try {
      const res = await fetch("/api/github/app/manifest");
      if (!res.ok) throw new Error("Failed to get manifest");
      const data = await res.json();

      // Create hidden form and submit to GitHub settings/apps/new (Coolify pattern)
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.actionUrl || "https://github.com/settings/apps/new";
      form.target = "_self";

      const manifestInput = document.createElement("input");
      manifestInput.type = "hidden";
      manifestInput.name = "manifest";
      manifestInput.value = data.manifest;
      form.appendChild(manifestInput);

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      console.error(err);
      setShowModal(true);
    } finally {
      setManifestLoading(false);
    }
  };

  const handleConnectManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput) return;
    setConnecting(true);
    try {
      const res = await fetch("/api/github/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenInput }),
      });
      if (res.ok) {
        setShowModal(false);
        setTokenInput("");
        fetchStatus();
      }
    } catch { /* silent */ }
    finally { setConnecting(false); }
  };

  const handleDisconnect = async () => {
    try {
      await fetch("/api/github/connect", { method: "DELETE" });
      setStatus({ connected: false });
      setRepos([]);
    } catch { /* silent */ }
  };

  return (
    <div
      className="ray-card p-6 mb-4"
      style={{
        background: "#0a0a0a",
        border: "1px solid #1a1a1a",
        borderRadius: "12px",
      }}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="font-jersey text-xl text-white tracking-wide mb-1">
            GitHub Integration
          </h2>
          <p className="text-xs text-[#52525b]">
            Link your GitHub account automatically as a GitHub App (like Coolify) for seamless repository imports and CI/CD.
          </p>
        </div>
        {status.connected ? (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5"
            style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
        ) : (
          <span className="text-[11px] px-2.5 py-1 rounded-lg"
            style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}>
            Not Connected
          </span>
        )}
      </div>

      {loading ? (
        <div className="py-4 text-xs text-white/40">Loading GitHub status…</div>
      ) : status.connected ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl"
            style={{ background: "#111", border: "1px solid #222" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs text-white overflow-hidden">
                {status.integration?.avatarUrl ? (
                  <img src={status.integration.avatarUrl} alt="Avatar" className="w-9 h-9 rounded-full" />
                ) : (
                  status.integration?.githubUsername?.[0]?.toUpperCase() || "G"
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{status.integration?.githubUsername || "GitHub User"}</p>
                <p className="text-[11px] text-white/40 font-mono">GitHub App Installed</p>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              Disconnect
            </button>
          </div>

          {repos.length > 0 && (
            <div>
              <p className="ray-eyebrow mb-2">Available Repositories ({repos.length})</p>
              <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5 pr-1">
                {repos.slice(0, 10).map((r) => (
                  <div key={r.id} className="p-2.5 rounded-lg flex items-center justify-between text-xs"
                    style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="min-w-0 pr-2">
                      <p className="font-mono font-medium text-white truncate">{r.fullName}</p>
                      <p className="text-[10px] text-white/30 truncate">{r.description || "No description"}</p>
                    </div>
                    <a
                      href={`/cicd`}
                      className="ray-btn-ghost text-[10px] px-2 py-1 flex-shrink-0 cursor-pointer"
                    >
                      Setup CI/CD
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {/* Coolify-style 1-Click App Registration */}
          <button
            onClick={handleCoolifyAppSetup}
            disabled={manifestLoading}
            className="ray-btn-primary text-xs px-4 py-2 flex items-center gap-2 cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            {manifestLoading ? "Opening GitHub…" : "Add GitHub Account (1-Click App)"}
          </button>
        </div>
      )}

      {/* Manual Modal Fallback */}
      {showModal && (
        <div
          className="fixed inset-0 z-[200] w-screen h-screen flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 20px 60px rgba(0,0,0,0.95)" }}>
            <h3 className="font-jersey text-2xl text-white mb-1">Connect GitHub</h3>
            <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
              Enter your GitHub Token with repo permissions.
            </p>

            <form onSubmit={handleConnectManual} className="flex flex-col gap-3.5">
              <div>
                <label className="ray-eyebrow mb-1 block">GitHub Token</label>
                <input
                  type="password"
                  required
                  placeholder="ghp_… or github_pat_…"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="ray-input w-full text-xs font-mono"
                />
              </div>

              <div className="flex gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="ray-btn-ghost flex-1 text-xs py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={connecting}
                  className="ray-btn-primary flex-1 text-xs py-2 cursor-pointer"
                >
                  {connecting ? "Connecting…" : "Connect"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

