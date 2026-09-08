"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Zap, RefreshCw, ShieldCheck } from "lucide-react";

type TabType = "monitor" | "deploy" | "sre" | "security";

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  image: string;
  alt: string;
}

const TABS: TabConfig[] = [
  {
    id: "monitor",
    label: "Telemetry & Monitor",
    icon: Activity,
    image: "/ray/monitor.svg",
    alt: "Ray 24/7 Telemetry & Infrastructure Monitoring Dashboard",
  },
  {
    id: "deploy",
    label: "Autonomous Deploy",
    icon: Zap,
    image: "/ray/deploy.svg",
    alt: "Ray Autonomous Nix Atomic Deployment Pipeline",
  },
  {
    id: "sre",
    label: "Self-Healing SRE",
    icon: RefreshCw,
    image: "/ray/self-healing.svg",
    alt: "Ray Self-Healing Shadow Proxy & Crash Diagnosis",
  },
  {
    id: "security",
    label: "Aegis Guardrails",
    icon: ShieldCheck,
    image: "/ray/security.svg",
    alt: "Ray AegisAgent AI Security Guardrails & SOC 2 Vault",
  },
];

export default function RayGuiPreview() {
  const [activeTab, setActiveTab] = useState<TabType>("monitor");

  const currentTab = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <section
      id="gui-console"
      className="relative py-20 px-4 sm:px-6 md:px-12 lg:px-16 w-full max-w-7xl mx-auto flex flex-col items-center z-10 text-white"
    >
      {/* Section Subheading */}
      <div className="w-full flex flex-col items-center text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 text-xs font-mono uppercase tracking-wider mb-4">
          <Activity className="w-3.5 h-3.5" /> 24/7 Operations Cockpit
        </div>
        <h2 className="pixel-font text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white mb-4">
          The 24/7 SRE GUI Platform
        </h2>
        <p className="text-zinc-400 text-base sm:text-lg max-w-2xl font-light">
          Monitor infrastructure vitals, trigger atomic zero-downtime rollouts, and let autonomous self-healing guard your systems around the clock.
        </p>
      </div>

      {/* Tabs & Image Showcase Window */}
      <div className="w-full rounded-2xl bg-zinc-950 border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
        {/* Tab Navigation Controls */}
        <div className="flex items-center gap-2 p-2 sm:p-3 bg-zinc-900/40 border-b border-white/10 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-white text-black font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Image Display Area */}
        <div className="p-3 sm:p-5 md:p-6 bg-black/50 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="w-full rounded-xl overflow-hidden border border-white/10 shadow-2xl relative group bg-zinc-950"
            >
              <img
                src={currentTab.image}
                alt={currentTab.alt}
                className="w-full h-auto object-cover rounded-xl select-none"
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
