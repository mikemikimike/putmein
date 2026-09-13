"use client";

import React from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import InlineWaitlist from "@/components/InlineWaitlist";

export default function OziasHero() {
  return (
    <section className="relative pt-32 sm:pt-40 md:pt-48 pb-16 px-4 sm:px-6 md:px-12 lg:px-16 w-full max-w-7xl mx-auto flex flex-col items-center z-10 text-white">
      {/* Brand Title: Ozias Trident Logo (/ozias.png) + Pixel Typography */}
      <div className="w-full flex flex-col items-center justify-center text-center relative z-10 mb-8">
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

          {/* Ozias PNG Trident Icon (Clean without neon glow) */}
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
            <img
              src="/ozias.png"
              alt="Ozias Model Logo"
              className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 xl:w-36 xl:h-36 object-contain"
            />
          </motion.div>

          {/* Pixel Font Title */}
          <motion.span
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.55, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="pixel-font text-6xl sm:text-8xl md:text-9xl lg:text-[10rem] xl:text-[11rem] font-bold tracking-tight text-white leading-none"
          >
            ozias
          </motion.span>
        </div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mt-6 md:mt-8 text-zinc-400 text-lg sm:text-xl md:text-2xl max-w-3xl font-light leading-relaxed px-4"
        >
          The frontier AI reasoning engine engineered specifically for DevOps orchestration, real-time infrastructure self-healing, and Aegis cybersecurity guardrails.
        </motion.p>

        {/* Waitlist Button & Inline Input */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 relative z-20"
        >
          <InlineWaitlist product="ozias" buttonText="Join Ozias Waitlist" />
        </motion.div>
      </div>

      {/* Dedicated Video Gap / Placeholder Hero Frame (Spacious 16:9 container, clean and refined) */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35 }}
        className="w-full max-w-5xl mt-6 relative z-10"
      >
        <div className="relative w-full aspect-video rounded-3xl bg-zinc-950 border border-white/10 shadow-2xl overflow-hidden flex flex-col items-center justify-center text-center p-6 sm:p-12 group">
          {/* Subtle grid background pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

          {/* Central Video Teaser Gap */}
          <div className="relative z-10 flex flex-col items-center justify-center max-w-lg">
            {/* Play Button Icon */}
            <div className="mb-5 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-zinc-900 border border-white/20 flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-105">
              <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white translate-x-0.5" />
            </div>

            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2">
              Video Showcase Reserved
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Ozias Model Walkthrough &amp; SRE Demonstration
            </h3>
            <p className="text-zinc-500 text-xs sm:text-sm mt-2 font-light leading-relaxed">
              This space is allocated for the official Ozias hero demonstration video, showcasing live kernel diagnostics, eBPF security sandboxing, and autonomous failover triage.
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
