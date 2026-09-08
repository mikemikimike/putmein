"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Terminal, ShieldCheck, Activity, Cpu, ArrowDown } from "lucide-react";

export default function RayHero() {
  const [copied, setCopied] = useState(false);
  const command = "curl -fsSL https://putme.in/install.sh | sh";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy command: ", err);
    }
  };

  return (
    <section className="relative pt-32 sm:pt-40 md:pt-48 pb-20 px-4 sm:px-6 md:px-12 lg:px-16 w-full max-w-7xl mx-auto flex flex-col items-center z-10 text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[85vw] md:w-[65vw] h-[55vw] max-h-[500px] bg-[radial-gradient(circle,rgba(13,211,37,0.12)_0%,rgba(0,0,0,0)_70%)] pointer-events-none z-0" />

      {/* Full Kinetic Intro Hero Header */}
      <div className="w-full flex flex-col items-center justify-center text-center relative z-10 mb-8 sm:mb-12">
        <div className="w-full flex flex-wrap items-center justify-center gap-3 sm:gap-6 md:gap-8 lg:gap-10 select-none">
          {/* Left Part: "Introducing" with kinetic drag-in motion */}
          <motion.h1
            initial={{ x: -140, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{
              duration: 0.6,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-extrabold tracking-tight text-white leading-none"
          >
            Introducing
          </motion.h1>

          {/* Middle Part: Ray Logo (/ray.svg) */}
          <motion.div
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: 0.65,
              delay: 0.1,
              type: "spring",
              stiffness: 260,
              damping: 18,
            }}
            className="flex items-center justify-center"
          >
            <img
              src="/ray.svg"
              alt="Ray Logo"
              className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 xl:w-36 xl:h-36 object-contain drop-shadow-[0_0_25px_rgba(255,255,255,0.2)]"
            />
          </motion.div>

          {/* Right Part: "ray" in Pixel Font */}
          <motion.span
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              duration: 0.6,
              delay: 0.2,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="pixel-font text-6xl sm:text-8xl md:text-9xl lg:text-[10rem] xl:text-[11rem] font-bold tracking-tight text-white leading-none"
          >
            ray
          </motion.span>
        </div>

        {/* Subtitle & Value Proposition */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-6 md:mt-8 text-zinc-300 text-lg sm:text-xl md:text-2xl max-w-3xl font-light leading-relaxed px-4"
        >
          Your 24/7 autonomous GUI and SRE platform for deployment, real-time telemetry monitoring, self-healing failovers, and bare-metal server operations.
        </motion.p>
      </div>

      {/* Hero CTA & Quickstart Terminal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="w-full max-w-2xl flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10 mb-12"
      >
        {/* Terminal copy block */}
        <div
          onClick={handleCopy}
          className="w-full sm:w-auto flex-1 group relative flex items-center justify-between gap-3 px-4 py-3 bg-zinc-900/60 backdrop-blur-md border border-white/15 rounded-xl cursor-pointer transition-all hover:border-green-500/40 hover:bg-zinc-900/80 shadow-2xl overflow-hidden"
          title="Click to copy install command"
        >
          <div className="flex items-center gap-2.5 text-zinc-400 select-none min-w-0">
            <Terminal className="w-4 h-4 text-green-400 flex-shrink-0" />
            <span className="text-xs font-mono text-zinc-500 select-none">$</span>
            <code className="text-xs sm:text-sm font-mono text-zinc-200 truncate">
              {command}
            </code>
          </div>

          <div className="flex items-center ml-2 flex-shrink-0">
            {copied ? (
              <span className="flex items-center gap-1 text-xs font-mono text-green-400">
                <Check className="w-3.5 h-3.5" /> Copied
              </span>
            ) : (
              <Copy className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
            )}
          </div>

          <div
            className={`absolute inset-0 bg-green-500/10 transition-opacity duration-500 pointer-events-none ${copied ? "opacity-100" : "opacity-0"
              }`}
          />
        </div>

        {/* Explore GUI button */}
        <a
          href="#gui-console"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-xl text-sm transition-all hover:bg-zinc-200 hover:scale-[1.02] shadow-[0_0_25px_rgba(255,255,255,0.2)]"
        >
          <span>Explore 24/7 GUI</span>
          <ArrowDown className="w-4 h-4" />
        </a>
      </motion.div>

      {/* Metrics & Highlights Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="w-full grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 relative z-10"
      >
        <div className="p-4 rounded-xl bg-zinc-950/70 border border-white/10 backdrop-blur-sm flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5 text-green-400 text-xs font-mono mb-1">
            <Activity className="w-3.5 h-3.5" />
            <span>UPTIME SLA</span>
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">99.99%</span>
          <span className="text-[11px] text-zinc-500 mt-0.5">Autonomous failovers</span>
        </div>

        <div className="p-4 rounded-xl bg-zinc-950/70 border border-white/10 backdrop-blur-sm flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5 text-blue-400 text-xs font-mono mb-1">
            <Cpu className="w-3.5 h-3.5" />
            <span>SHADOW PROXY</span>
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">&lt; 1s</span>
          <span className="text-[11px] text-zinc-500 mt-0.5">Sub-second recovery</span>
        </div>

        <div className="p-4 rounded-xl bg-zinc-950/70 border border-white/10 backdrop-blur-sm flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5 text-purple-400 text-xs font-mono mb-1">
            <Terminal className="w-3.5 h-3.5" />
            <span>PARITY</span>
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Bit-for-Bit</span>
          <span className="text-[11px] text-zinc-500 mt-0.5">Deterministic Nix builds</span>
        </div>

        <div className="p-4 rounded-xl bg-zinc-950/70 border border-white/10 backdrop-blur-sm flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-mono mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SECURITY</span>
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Aegis SOC2</span>
          <span className="text-[11px] text-zinc-500 mt-0.5">Immutable audit trails</span>
        </div>
      </motion.div>
    </section>
  );
}
