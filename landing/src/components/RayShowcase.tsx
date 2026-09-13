"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Play,
  Zap,
  RefreshCw,
  Shield,
  Cpu,
  Lock,
} from "lucide-react";

interface PlaylistItem {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  description: string;
  duration: string;
  badge: string;
  image: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PLAYLIST_DATA: PlaylistItem[] = [
  {
    id: "ai-chat",
    number: "00",
    title: "Chat interface which helps you with anything",
    subtitle: "Real-time process health, Docker telemetry, and server vitals",
    description:
      "You can chat with Ray and ask anything about your infrastructure. It will always be there to help you.",
    duration: "Live",
    badge: "GUI",
    image: "/ray/ai.png",
    icon: Cpu,
  },
  {
    id: "monitor",
    number: "01",
    title: "24/7 Telemetry & Infrastructure Monitoring",
    subtitle: "Real-time process health, Docker telemetry, and server vitals",
    description:
      "Monitor your entire infrastructure fleet with sub-second polling, deep container diagnosis, and real-time alert triage.",
    duration: "Live",
    badge: "Telemetry Cockpit",
    image: "/ray/monitor.png",
    icon: Cpu,
  },
  {
    id: "nix-deploy",
    number: "02",
    title: "Autonomous Nix Deployment",
    subtitle: "Bit-for-bit reproducible environments with 0-click atomic rollouts",
    description:
      "Watch Ray autonomously build, test, and deploy isolated Nix-based environments directly on your VPS with guaranteed staging-to-production parity.",
    duration: "Atomic",
    badge: "Autonomous Deploy",
    image: "/ray/deploy.png",
    icon: Zap,
  },
  {
    id: "self-healing",
    number: "03",
    title: "Shadow Proxy & Self-Healing",
    subtitle: "Sub-second traffic rerouting when microservices fail",
    description:
      "When your primary Nginx or backend encounters a crash, Ray's ultra-fast Go Shadow Proxy catches and redirects incoming traffic in under 1 second.",
    duration: "99.99%",
    badge: "Zero-Downtime",
    image: "/ray/self-healing.png",
    icon: RefreshCw,
  },
  {
    id: "aegis-security",
    number: "04",
    title: "AegisAgent AI Security Guardrail",
    subtitle: "Real-time prompt injection & excessive agency interception",
    description:
      "Deploy AI applications with confidence. Ray intercepts prompt injection payloads and sandboxes LLM agency before rogue actions touch your database.",
    duration: "SOC 2",
    badge: "AI Guardrails",
    image: "/ray/security.png",
    icon: Shield,
  },
];

interface RayShowcaseProps {
  hideHeader?: boolean;
  id?: string;
}

export default function RayShowcase({ hideHeader = false, id = "demo" }: RayShowcaseProps = {}) {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.15 });

  const activeItem = PLAYLIST_DATA[activeIndex];

  return (
    <section
      id={id}
      ref={sectionRef}
      className={`relative ${hideHeader ? "py-12 md:py-20" : "py-24 md:py-36"} px-4 sm:px-6 md:px-12 lg:px-16 w-full max-w-7xl mx-auto flex flex-col items-center z-10 border-t border-white/10 bg-black text-white`}
    >
      {/* Massive Full-Width Centered Kinetic Intro Header */}
      {!hideHeader && (
        <div className="w-full flex flex-col items-center justify-center text-center mb-16 md:mb-24">
          <div className="w-full flex flex-wrap items-center justify-center gap-3 sm:gap-6 md:gap-8 lg:gap-10 select-none">
            {/* Left Part: "Introducing" with kinetic drag-in motion */}
            <motion.h2
              initial={{ x: -160, opacity: 0 }}
              animate={isInView ? { x: 0, opacity: 1 } : {}}
              transition={{
                duration: 0.55,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-extrabold tracking-tight text-white leading-none"
            >
              Introducing
            </motion.h2>

            {/* Middle Part: Ray Logo (/ray.svg) with NO background, pure crisp SVG */}
            <motion.div
              initial={{ scale: 0.2, opacity: 0 }}
              animate={isInView ? { scale: 1, opacity: 1 } : {}}
              transition={{
                duration: 0.6,
                delay: 0.12,
                type: "spring",
                stiffness: 260,
                damping: 18,
              }}
              className="flex items-center justify-center"
            >
              <img
                src="/ray.svg"
                alt="Ray Logo"
                className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 xl:w-36 xl:h-36 object-contain"
              />
            </motion.div>

            {/* Right Part: "ray" in Pixel Font with kinetic rise-up motion */}
            <motion.span
              initial={{ y: 90, opacity: 0 }}
              animate={isInView ? { y: 0, opacity: 1 } : {}}
              transition={{
                duration: 0.55,
                delay: 0.2,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="pixel-font text-6xl sm:text-8xl md:text-9xl lg:text-[10rem] xl:text-[11rem] font-bold tracking-tight text-white leading-none"
            >
              ray
            </motion.span>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-6 md:mt-8 text-zinc-400 text-lg sm:text-xl md:text-2xl max-w-3xl font-light"
          >
            Your 24/7 autonomous SRE agent for deployment, self-healing, and infrastructure security.
          </motion.p>
        </div>
      )}

      {/* Main Feature Playlist Grid (Expanded Left Video with Floating Liquid Glass Island + Equalized Heights) */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
        {/* Left Column: Expanded Image Preview with Floating Liquid Glass Island */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col w-full h-[380px] sm:h-[440px] md:h-[500px] lg:h-full lg:min-h-[520px] rounded-2xl bg-zinc-950 border border-white/15 overflow-hidden relative group">
          {/* SVG Preview Frame */}
          <div className="absolute inset-0 w-full h-full bg-black/60 flex items-center justify-center p-3 sm:p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeItem.image}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="w-full h-full relative flex items-center justify-center"
              >
                <img
                  src={activeItem.image}
                  alt={activeItem.title}
                  className="w-full h-full object-contain rounded-xl select-none"
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Floating Liquid Glass Island Overlay over the preview */}
          <motion.div
            key={`island-${activeItem.id}`}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md p-3.5 sm:p-4 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.8)] z-20 pointer-events-auto"
          >
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">
                Feature {activeItem.number} / 04
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                {activeItem.duration}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {activeItem.title}
            </h3>
            <p className="text-xs text-zinc-300 font-light mt-1 leading-relaxed line-clamp-2">
              {activeItem.subtitle}
            </p>
          </motion.div>
        </div>

        {/* Right Column: Equalized Height Playlist Selector */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col justify-between w-full h-full rounded-2xl bg-zinc-950 border border-white/10 p-4 sm:p-5">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
            <h4 className="text-base font-bold text-white tracking-tight">
              Feature Playlist
            </h4>
            <span className="text-xs font-mono text-zinc-400">
              {activeIndex + 1} of {PLAYLIST_DATA.length}
            </span>
          </div>

          {/* Playlist Items */}
          <div className="flex flex-col gap-2.5 w-full flex-grow justify-between">
            {PLAYLIST_DATA.map((item, index) => {
              const isActive = index === activeIndex;
              const IconComponent = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveIndex(index)}
                  className={`text-left w-full p-3 sm:p-3.5 rounded-xl transition-all duration-200 flex items-start gap-3.5 cursor-pointer border ${isActive
                    ? "bg-white/10 border-white text-white shadow-sm"
                    : "bg-black/40 border-white/5 text-zinc-400 hover:text-white hover:border-white/20 hover:bg-zinc-900/60"
                    }`}
                >
                  {/* Left Icon */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isActive
                      ? "bg-white text-black"
                      : "bg-zinc-900 text-zinc-400 border border-white/10"
                      }`}
                  >
                    <IconComponent className="w-4 h-4" />
                  </div>

                  {/* Text Content */}
                  <div className="flex flex-col flex-grow min-w-0 pr-1">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-[11px] font-mono font-medium opacity-70">
                        {item.number}
                      </span>
                      <span className="text-[11px] font-mono opacity-70">
                        {item.duration}
                      </span>
                    </div>

                    <h5 className="text-sm font-bold tracking-tight text-white mb-0.5 line-clamp-1">
                      {item.title}
                    </h5>

                    <p className="text-[11px] text-zinc-400 line-clamp-1 leading-relaxed font-light">
                      {item.subtitle}
                    </p>
                  </div>

                  {/* Play Indicator */}
                  <div className="flex-shrink-0 self-center">
                    <Play
                      className={`w-3 h-3 ${isActive ? "fill-white text-white" : "text-zinc-600"
                        }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
