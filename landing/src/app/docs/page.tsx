import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CursorGlow from "@/components/CursorGlow";
import Link from "next/link";
import { BookOpen, Terminal, Layers, Cpu, Shield, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation | PutMe.in",
  description: "Comprehensive guides, architecture manuals, and developer documentation for PutMe.in, Ray, and Ozias.",
};

const DOC_SECTIONS = [
  {
    title: "Quickstart Guide",
    desc: "Get started deploying and managing your first bare-metal server with PutMe.in in under 5 minutes.",
    href: "/ray",
    icon: BookOpen,
  },
  {
    title: "Ray 24/7 GUI Platform",
    desc: "Learn how Ray's 24/7 SRE control panel monitors telemetry, coordinates failovers, and runs Nix builds.",
    href: "/ray",
    icon: Layers,
  },
  {
    title: "Ozias Intelligence Model",
    desc: "Detailed documentation on the curated DevOps reasoning engine, fine-tuned weights, and systemd diagnosis.",
    href: "/ozias",
    icon: Cpu,
  },
  {
    title: "Cohen Terminal TUI",
    desc: "Command-line companion reference, keyboard navigation, and Charm TUI runbook integration.",
    href: "/cohen",
    icon: Terminal,
  },
  {
    title: "Aegis Security & SOC 2 Vault",
    desc: "Runtime prompt injection guardrails, eBPF container isolation, and cryptographic audit log verification.",
    href: "/ray",
    icon: Shield,
  },
  {
    title: "REST & WebSocket API Reference",
    desc: "Explore public endpoints for server telemetry, atomic deployment webhooks, and agent streaming.",
    href: "/api-docs",
    icon: ArrowRight,
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden selection:bg-white/20">
      <CursorGlow />
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 md:px-16 pt-36 pb-24">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="pixel-font text-5xl sm:text-6xl md:text-7xl font-bold text-white tracking-tight mb-4">
            Documentation
          </h1>
          <p className="text-zinc-400 text-base sm:text-lg font-light">
            Everything you need to orchestrate, deploy, and secure bare-metal infrastructure with autonomous AI agents.
          </p>
        </div>

        {/* Documentation Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DOC_SECTIONS.map((sec, idx) => {
            const Icon = sec.icon;
            return (
              <Link
                key={idx}
                href={sec.href}
                className="group p-6 sm:p-8 rounded-2xl bg-zinc-950/70 border border-white/10 hover:border-white/25 hover:bg-zinc-900/40 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-5 text-white group-hover:text-green-400 transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                    {sec.title}
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed font-light mb-6">
                    {sec.desc}
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 text-xs font-mono text-zinc-500 group-hover:text-white transition-colors">
                  <span>Explore section</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
