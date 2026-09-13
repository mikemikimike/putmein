import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CursorGlow from "@/components/CursorGlow";
import RayHero from "@/components/RayHero";
import RayGuiPreview from "@/components/RayGuiPreview";
import RayShowcase from "@/components/RayShowcase";
import { Terminal, Shield, Cpu, RefreshCw, Layers } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ray | 24/7 Autonomous SRE GUI Platform | PutMe.in",
  description:
    "Ray is your 24/7 autonomous GUI and SRE platform for deployment, real-time telemetry monitoring, self-healing failovers, and bare-metal server operations.",
};

export default function RayPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden selection:bg-green-500/30">
      <CursorGlow />
      <Navbar />

      {/* Hero Section: Exact kinetic introduction featuring Ray */}
      <RayHero />

      {/* 24/7 GUI Monitoring & SRE Operations Cockpit */}
      <RayGuiPreview />

      {/* Feature Video Playlist Showcase */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/5 text-zinc-300 text-xs font-mono uppercase tracking-wider mb-3">
          Interactive Video Walkthroughs
        </div>
        <h3 className="pixel-font text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
          Watch Ray in Action
        </h3>
        <p className="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto mt-2 font-light">
          Deep-dive into zero-click Nix rollouts, sub-second self-healing, and bare-metal server fleet management.
        </p>
      </div>
      <RayShowcase hideHeader={true} id="ray-playlist" />

      {/* Core Architectural Pillars */}
      <section className="relative py-20 px-4 sm:px-6 md:px-12 lg:px-16 w-full max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 text-xs font-mono uppercase tracking-wider mb-4">
            Built for High-Stakes Production
          </div>
          <h2 className="pixel-font text-4xl sm:text-5xl font-bold text-white tracking-tight">
            Engineered to Replace Infrastructure Toil
          </h2>
          <p className="text-zinc-400 text-base sm:text-lg max-w-2xl mx-auto mt-3 font-light">
            Everything your team needs to run mission-critical systems with Vercel simplicity on low-cost bare-metal hardware.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: "Autonomous Deployment",
              subtitle: "Bit-for-Bit Parity",
              desc: "Bit-for-bit reproducible Nix derivations build and switch atomically with zero dropped socket connections.",
              icon: Layers,
              accent: "text-green-400",
              border: "hover:border-green-500/30",
            },
            {
              title: "Shadow Proxy Failover",
              subtitle: "Sub-Second Recovery",
              desc: "When microservices crash, Ray's ultra-fast Go Shadow Proxy catches inbound requests in under 1 second.",
              icon: RefreshCw,
              accent: "text-blue-400",
              border: "hover:border-blue-500/30",
            },
            {
              title: "Bare-Metal VPS Freedom",
              subtitle: "Break Free from PaaS",
              desc: "Full automated server orchestration, kernel patches, and SSL renewals on any $5/mo VPS.",
              icon: Cpu,
              accent: "text-purple-400",
              border: "hover:border-purple-500/30",
            },
            {
              title: "Aegis SOC 2 Vault",
              subtitle: "Zero-Trust Guardrails",
              desc: "Intercepts prompt injections and commits every automated agent action into an immutable audit trail.",
              icon: Shield,
              accent: "text-amber-400",
              border: "hover:border-amber-500/30",
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className={`p-6 rounded-2xl bg-zinc-950/60 border border-white/10 transition-all duration-300 hover:bg-zinc-900/50 hover:-translate-y-1 ${item.border}`}
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

      {/* Ray Quickstart CTA */}
      <section className="py-20 px-4 sm:px-6 md:px-12 max-w-5xl mx-auto text-center border-t border-white/10">
        <div className="relative p-8 sm:p-12 md:p-16 rounded-3xl bg-gradient-to-b from-zinc-900/80 to-zinc-950 border border-white/15 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-green-500/10 rounded-full blur-3xl pointer-events-none" />

          <h2 className="pixel-font text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 relative z-10">
            Deploy Ray in Under 60 Seconds
          </h2>
          <p className="text-zinc-300 text-base sm:text-lg max-w-xl mx-auto mb-8 relative z-10 font-light">
            Give your infrastructure a 24/7 digital SRE. Drop the toil, eliminate midnight pages, and scale fearlessly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
            <a
              href="https://github.com/putme-in/putmein"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-black font-semibold rounded-xl text-sm transition-all hover:bg-zinc-200 hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.3)]"
            >
              <Terminal className="w-4 h-4" />
              <span>Get Started with Ray</span>
            </a>
            <a
              href="/#faq"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-white/20 text-white font-medium rounded-xl text-sm transition-all hover:bg-white/10"
            >
              Read the FAQ
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
