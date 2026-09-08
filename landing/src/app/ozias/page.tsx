import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CursorGlow from "@/components/CursorGlow";
import OziasHero from "@/components/OziasHero";
import OziasPlayground from "@/components/OziasPlayground";
import Link from "next/link";
import { Terminal, Shield, Cpu, ArrowRight, CheckCircle2, Lock } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ozias | Frontier DevOps & Cybersecurity Model | PutMe.in",
  description:
    "Ozias is the frontier DevOps and cybersecurity curated AI model powering PutMe.in products like Ray and Cohen.",
};

export default function OziasPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden selection:bg-white/20">
      <CursorGlow />
      <Navbar />

      {/* Hero Section */}
      <OziasHero />

      {/* Interactive Model Reasoning Sandbox */}
      <OziasPlayground />

      {/* Bottom Section: Curated Model for PutMe.in Products */}
      <section className="relative py-24 px-4 sm:px-6 md:px-12 lg:px-16 w-full max-w-7xl mx-auto border-t border-white/10 text-white z-10">
        <div className="text-center mb-16">
          <h2 className="pixel-font text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight">
            The Intelligence Engine Behind PutMe.in
          </h2>
          <p className="text-zinc-400 text-base sm:text-lg max-w-2xl mx-auto mt-3 font-light">
            Ozias is a frontier DevOps and cybersecurity curated model custom-built to power next-generation autonomous engineering products.
          </p>
        </div>

        {/* Product Cards: Ray and Cohen */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
          {/* 1. Ray Product Card */}
          <div className="relative rounded-3xl bg-zinc-950 border border-white/10 p-6 sm:p-10 flex flex-col justify-between hover:border-white/25 transition-all duration-200">
            <div>
              <div className="flex items-start justify-between gap-3 mb-6">
                <div className="flex items-center gap-3.5">
                  <img src="/ray.svg" alt="Ray Logo" className="w-10 h-10 object-contain flex-shrink-0" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-2xl font-bold text-white tracking-tight">Ray</h3>
                      <span className="text-xs font-mono text-zinc-400">· GUI Powered by Ozias</span>
                    </div>
                    <span className="text-xs font-mono text-zinc-500 block mt-0.5">
                      24/7 Autonomous SRE Platform
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-zinc-400 text-sm sm:text-base leading-relaxed mb-6 font-light">
                Ozias serves as the real-time SRE brain of Ray. It continuously monitors live infrastructure telemetry, analyzes crash loops, coordinates sub-second Go Shadow Proxy failovers, and executes atomic Nix rollouts.
              </p>

              <div className="space-y-2.5 mb-8 font-mono text-xs text-zinc-300">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>Autonomous root-cause analysis for 502/504 gateway failures</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>Bit-for-bit Nix flake compilation and atomic symlink switch</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>Zero-downtime microservice recovery in &lt;1 second</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <Link
                href="/ray"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-zinc-300 transition-colors"
              >
                <span>Explore Ray Platform</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <span className="text-xs font-mono text-zinc-600">ray.putme.in</span>
            </div>
          </div>

          {/* 2. Cohen Product Card */}
          <div className="relative rounded-3xl bg-zinc-950 border border-white/10 p-6 sm:p-10 flex flex-col justify-between hover:border-white/25 transition-all duration-200">
            <div>
              <div className="flex items-start justify-between gap-3 mb-6">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-white flex-shrink-0">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-2xl font-bold text-white tracking-tight">Cohen</h3>
                      <span className="text-xs font-mono text-zinc-400">· CLI Powered by Ozias</span>
                    </div>
                    <span className="text-xs font-mono text-zinc-500 block mt-0.5">
                      Go/Charm Terminal TUI Companion
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-zinc-400 text-sm sm:text-base leading-relaxed mb-6 font-light">
                &quot;DevOps is not a joke.&quot; Cohen brings Ozias directly into your developer terminal. Run instant natural language SRE queries, diagnose broken systemd units, generate hardened Nix configs, and triage production without context-switching.
              </p>

              <div className="space-y-2.5 mb-8 font-mono text-xs text-zinc-300">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>Sub-second terminal shell diagnostics via high-speed Charm TUI</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>Aegis sandbox intercepts destructive commands before shell execution</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>Natural language to verified, idempotent bash runbooks</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <Link
                href="/cohen"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-zinc-300 transition-colors"
              >
                <span>Explore Cohen</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <span className="text-xs font-mono text-zinc-600">cohen CLI</span>
            </div>
          </div>
        </div>

        {/* 3 Core Architecture Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="p-6 sm:p-8 rounded-2xl bg-zinc-950 border border-white/10 hover:border-white/20 transition-all">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center mb-5 text-white">
              <Cpu className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Frontier DevOps Pre-Training</h4>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed font-light">
              Curated specifically on Linux kernel internals, systemd dependency graphs, Nix flake derivations, eBPF network routing, and real-world post-mortem incidents.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-2xl bg-zinc-950 border border-white/10 hover:border-white/20 transition-all">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center mb-5 text-white">
              <Shield className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Aegis Cybersecurity Guardrails</h4>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed font-light">
              Multi-tiered security filters intercept prompt injection, block dangerous shell patterns like privilege escalation, and sandbox arbitrary commands inside isolated micro-VMs.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-2xl bg-zinc-950 border border-white/10 hover:border-white/20 transition-all">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center mb-5 text-white">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">SOC 2 Cryptographic Audits</h4>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed font-light">
              Every decision, diagnosis, and command generated by Ozias is hashed with SHA-256 and committed into a tamper-proof cryptographic log for instant compliance.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section (Clean dark container, no neon glow) */}
      <section className="py-20 px-4 sm:px-6 md:px-12 max-w-5xl mx-auto text-center border-t border-white/10">
        <div className="p-8 sm:p-12 md:p-16 rounded-3xl bg-zinc-950 border border-white/15">
          <h2 className="pixel-font text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4">
            Power Your Infrastructure with Ozias
          </h2>
          <p className="text-zinc-400 text-base sm:text-lg max-w-xl mx-auto mb-8 font-light">
            Deploy Ray or run Cohen on your terminal to put the world&apos;s most capable DevOps reasoning model to work for your team.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/ray"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-black font-semibold rounded-xl text-sm transition-all hover:bg-zinc-200 hover:scale-105"
            >
              <span>Explore Ray Platform</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/cohen"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-white/20 text-white font-medium rounded-xl text-sm transition-all hover:bg-white/10"
            >
              <Terminal className="w-4 h-4" />
              <span>Explore Cohen</span>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
