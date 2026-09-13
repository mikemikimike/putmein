"use client";

import React from "react";
import { motion } from "framer-motion";
import { Terminal, Sparkles } from "lucide-react";
import InlineWaitlist from "@/components/InlineWaitlist";

export default function CohenHero() {
  return (
    <section className="relative pt-32 sm:pt-40 md:pt-48 pb-16 px-4 sm:px-6 md:px-12 lg:px-16 w-full max-w-7xl mx-auto flex flex-col items-center z-10 text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[85vw] md:w-[65vw] h-[55vw] max-h-[500px] bg-[radial-gradient(circle,rgba(34,197,94,0.1)_0%,rgba(0,0,0,0)_70%)] pointer-events-none z-0" />

      {/* Coming Soon Pill Badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 text-xs font-mono uppercase tracking-wider mb-6 relative z-10"
      >
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span>Coming Soon · Early Access Beta</span>
      </motion.div>

      {/* Brand Title: Meet + Terminal Icon + Pixel Typography */}
      <div className="w-full flex flex-col items-center justify-center text-center relative z-10 mb-6">
        <div className="w-full flex flex-wrap items-center justify-center gap-3 sm:gap-6 md:gap-8 lg:gap-10 select-none">
          {/* Left Text */}
          <motion.h1
            initial={{ x: -80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-extrabold tracking-tight text-white leading-none"
          >
            Meet
          </motion.h1>

          {/* Terminal Icon Container */}
          <motion.div
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: 0.6,
              delay: 0.1,
              type: "spring",
              stiffness: 260,
              damping: 18,
            }}
            className="flex items-center justify-center"
          >
            <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 xl:w-36 xl:h-36 rounded-2xl md:rounded-3xl bg-zinc-900/90 border border-green-500/30 flex items-center justify-center text-green-400 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
              <Terminal className="w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 stroke-[1.75]" />
            </div>
          </motion.div>

          {/* Pixel Font Title */}
          <motion.span
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.55, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="pixel-font text-6xl sm:text-8xl md:text-9xl lg:text-[10rem] xl:text-[11rem] font-bold tracking-tight text-white leading-none"
          >
            cohen
          </motion.span>
        </div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mt-6 md:mt-8 text-zinc-300 text-lg sm:text-xl md:text-2xl max-w-3xl font-light leading-relaxed px-4"
        >
          The high-speed Go &amp; Charm TUI terminal companion for DevOps and SREs. Diagnose kernel bottlenecks, triage broken systemd units, and run autonomous incident remediation directly from your shell.
        </motion.p>

        {/* Waitlist Button & Inline Form */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mt-8 relative z-20"
        >
          <InlineWaitlist product="cohen" buttonText="Join Cohen Waitlist" />
        </motion.div>
      </div>
    </section>
  );
}
