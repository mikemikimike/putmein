import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CursorGlow from "@/components/CursorGlow";
import CohenHero from "@/components/CohenHero";
import InlineWaitlist from "@/components/InlineWaitlist";
import { Terminal, Shield, Cpu, Zap, ArrowRight, CheckCircle2, RefreshCw } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cohen | Go & Charm TUI Companion for SREs | PutMe.in",
  description:
    "Cohen is the high-performance Go & Charm terminal TUI companion for DevOps and SREs, powered by Ozias.",
};

export default function CohenPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden selection:bg-green-500/30">
      <CursorGlow />
      <Navbar />

      {/* Hero Section */}
      <CohenHero />

      {/* Main Terminal TUI Visual Showcase */}
      <section className="relative py-12 px-4 sm:px-6 md:px-12 lg:px-16 w-full max-w-6xl mx-auto flex flex-col items-center z-10">
        <div className="w-full rounded-3xl bg-zinc-950 border border-white/15 p-2 sm:p-4 md:p-6 shadow-[0_20px_80px_rgba(0,0,0,0.9)] relative overflow-hidden group">
          {/* Subtle grid background pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

          {/* Terminal Window Frame */}
          <div className="relative w-full rounded-2xl bg-[#1e2029] border border-white/10 overflow-hidden shadow-2xl">
            {/* Terminal Top Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#181a20] border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <Terminal className="w-3.5 h-3.5 text-green-400" />
                <span>cohen — ozias tui companion</span>
              </div>
              <div className="w-12" />
            </div>

            {/* Terminal Body Image */}
            <div className="p-2 sm:p-4 md:p-6 bg-[#202531] flex items-center justify-center">
              <img
                src="/cohen.png"
                alt="Cohen Terminal TUI Interface"
                className="w-full h-auto max-h-[620px] object-contain rounded-xl select-none"
              />
            </div>
          </div>

          {/* Floating Liquid Glass Badge */}
          <div className="mt-4 sm:mt-6 p-4 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400 flex-shrink-0">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Charm Bubbletea TUI Architecture
                </h3>
                <p className="text-xs text-zinc-400 font-light">
                  Instant shell queries, active systemd triage, and natural language runbooks.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10">Go 1.23</span>
              <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10">Charm TUI</span>
              <span className="px-2.5 py-1 rounded-md bg-green-500/10 text-green-400 border border-green-500/30">Ozias Core</span>
            </div>
          </div>
        </div>
      </section>

      {/* Core Architectural Pillars */}
      <section className="relative py-20 px-4 sm:px-6 md:px-12 lg:px-16 w-full max-w-7xl mx-auto border-t border-white/10 z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 text-xs font-mono uppercase tracking-wider mb-4">
            Designed for Terminal Power Users
          </div>
          <h2 className="pixel-font text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight">
            DevOps is Not a Joke.
          </h2>
          <p className="text-zinc-400 text-base sm:text-lg max-w-2xl mx-auto mt-3 font-light">
            Cohen brings the entire intelligence of Ozias and PutMe.in directly into your command line workflow without context-switching.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: "Zero-Latency TUI",
              subtitle: "Pure Go & Bubbletea",
              desc: "Engineered from the ground up in Go with sub-millisecond keyboard responsiveness and zero browser memory overhead.",
              icon: Terminal,
              accent: "text-green-400",
              border: "hover:border-green-500/30",
            },
            {
              title: "Ozias Reasoning Core",
              subtitle: "In-Terminal Diagnosis",
              desc: "Diagnose kernel panics, broken systemd services, and socket connection drops in plain English directly from your shell.",
              icon: Cpu,
              accent: "text-blue-400",
              border: "hover:border-blue-500/30",
            },
            {
              title: "Aegis Command Sandbox",
              subtitle: "Zero-Trust Safety",
              desc: "Intercepts catastrophic patterns like accidental root deletions, open debug ports, and unverified privilege escalations.",
              icon: Shield,
              accent: "text-amber-400",
              border: "hover:border-amber-500/30",
            },
            {
              title: "Idempotent Nix Runbooks",
              subtitle: "Bit-for-Bit Reproducible",
              desc: "Generates tamper-proof Nix flake derivations and verified remediation runbooks that execute cleanly on any Linux VPS.",
              icon: Zap,
              accent: "text-purple-400",
              border: "hover:border-purple-500/30",
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className={`p-6 sm:p-8 rounded-2xl bg-zinc-950/70 border border-white/10 transition-all duration-300 hover:bg-zinc-900/50 hover:-translate-y-1 ${item.border}`}
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <Icon className={`w-5 h-5 ${item.accent}`} />
                </div>
                <h4 className="text-lg font-bold text-white tracking-tight">{item.title}</h4>
                <div className={`text-xs font-mono mt-0.5 mb-3 font-semibold ${item.accent}`}>
                  {item.subtitle}
                </div>
                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed font-light">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Feature Capabilities Breakdown */}
      <section className="relative py-16 px-4 sm:px-6 md:px-12 lg:px-16 w-full max-w-5xl mx-auto border-t border-white/10 z-10">
        <div className="rounded-3xl bg-zinc-950 border border-white/15 p-6 sm:p-10 md:p-12">
          <h3 className="pixel-font text-3xl sm:text-4xl font-bold text-white mb-6">
            What You Can Do with Cohen
          </h3>

          <div className="space-y-4 font-mono text-sm text-zinc-300">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-black/40 border border-white/5">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-white font-semibold">Instant Natural Language SRE Queries:</span>
                <p className="text-zinc-400 text-xs mt-0.5 font-light">
                  Ask &quot;Why did port 443 stop responding after the last build?&quot; and receive root-cause analysis in seconds.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-black/40 border border-white/5">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-white font-semibold">Live Systemd Unit Debugging:</span>
                <p className="text-zinc-400 text-xs mt-0.5 font-light">
                  Inspect journalctl streams, spot missing environment variables, and auto-generate corrected service definitions.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-black/40 border border-white/5">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-white font-semibold">Interactive Micro-VM Shell Sandboxing:</span>
                <p className="text-zinc-400 text-xs mt-0.5 font-light">
                  Test and verify remediation commands inside temporary eBPF-monitored sandboxes before applying them to production.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <section className="py-20 px-4 sm:px-6 md:px-12 max-w-5xl mx-auto text-center border-t border-white/10">
        <div className="relative p-8 sm:p-12 md:p-16 rounded-3xl bg-gradient-to-b from-zinc-900/80 to-zinc-950 border border-white/15 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-green-500/10 rounded-full blur-3xl pointer-events-none" />

          <h2 className="pixel-font text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 relative z-10">
            Be the First to Experience Cohen
          </h2>
          <p className="text-zinc-300 text-base sm:text-lg max-w-xl mx-auto mb-8 relative z-10 font-light">
            Early access invites are rolling out to engineering teams and DevOps practitioners. Reserve your spot today.
          </p>

          <div className="relative z-10 flex justify-center">
            <InlineWaitlist product="cohen" buttonText="Reserve Your Cohen Early Access" />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
