"use client"
import React, { useState } from 'react';
import LightPillar from './HeroBg';
import { Copy, Check, Terminal } from 'lucide-react';


export default function Hero() {
  return (
    <section className="relative pt-[160px] pb-[120px] md:pt-[240px] flex flex-col items-center text-center">
      {/* Background glow effect */}

      <div className='HeroLight'>
        <LightPillar
          variant="square"
          pixelSize={2}
          color="#0dd325"
          patternScale={1}
          patternDensity={1}
          pixelSizeJitter={0}
          enableRipples
          rippleSpeed={0.4}
          rippleThickness={0.12}
          rippleIntensityScale={1.5}
          liquid={false}
          liquidStrength={0.12}
          liquidRadius={1.2}
          liquidWobbleSpeed={5}
          speed={0.5}
          edgeFade={0.25}
          transparent
        />
      </div>

      <div className="absolute top-[50px] left-1/2 -translate-x-1/2 w-[90vw] md:w-[70vw] h-[70vw] bg-[radial-gradient(circle,rgba(60,60,60,0.15)_0%,rgba(0,0,0,0)_60%)] pointer-events-none z-0"></div>

      <div className="relative z-10 max-w-[1000px] w-full px-6 flex flex-col items-center">
        <h1 className="pixel-font text-4xl md:text-6xl lg:text-[4.5rem] font-bold leading-tight md:leading-[1.1] tracking-[-0.04em] mb-6 md:mb-8 text-white">
          Scale Your Engineering Without <br className="hidden md:block" /> the{' '}
          <span className="relative inline-block whitespace-nowrap">
            Infrastructure Toil.
            <svg className="absolute -bottom-[0.2em] -left-[2%] w-[104%] h-auto pointer-events-none text-white/90" viewBox="0 0 300 24" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.618 19.349c28.761-4.836 122.385-15.012 294.673-8.868" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" style={{ strokeDasharray: 300, strokeDashoffset: 0, opacity: 0.9 }} />
            </svg>
          </span>
        </h1>
        <p className="text-lg md:text-xl leading-relaxed text-zinc-200 max-w-[760px] mx-auto mb-10 md:mb-12 font-normal">
          We give you a 24/7 Digital SRE Agent that deploys, manages, and secures your servers autonomously. While you focus on building features, our AI handles the maintenance, security patches, and AI guardrails. Get Vercel-level ease on your own bare-metal VPS.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 md:gap-5 w-full px-4 sm:px-0 mt-8">
          {/* <a href="#demo" className="group backdrop-blur-lg relative inline-flex w-full sm:w-auto items-center justify-center gap-3 px-8 py-3.5 md:py-4 text-base md:text-lg font-semibold text-white rounded-xl bg-gradient-to-b from-zinc-600/50 to-zinc-800/50 border border-white/15 shadow-[0_4px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all hover:-translate-y-0.5 hover:bg-gradient-to-b hover:from-zinc-500/60 hover:to-zinc-800/60 hover:border-white/30 hover:shadow-[0_6px_25px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] overflow-hidden">
            <span className="relative z-10">Join the Waitlist</span>
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-[20deg] transition-transform duration-700 group-hover:translate-x-[150%]"></span>
          </a> */}

          <CommandBlock />
        </div>
      </div>
    </section>
  );
}

function CommandBlock() {
  const [os, setOs] = useState<'unix' | 'win'>('unix');
  const [copied, setCopied] = useState(false);

  const command =
    os === 'unix'
      ? 'curl -fsSL https://putme.in/install.sh | bash'
      : 'powershell -c "irm https://putme.in/install.ps1 | iex"';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-2">
      {/* OS Tab Switcher */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-900/60 border border-white/10 rounded-lg text-xs font-mono select-none">
        <button
          type="button"
          onClick={() => setOs('unix')}
          className={`px-3 py-1 rounded-md transition-all ${
            os === 'unix'
              ? 'bg-white/15 text-white font-medium shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          macOS / Linux
        </button>
        <button
          type="button"
          onClick={() => setOs('win')}
          className={`px-3 py-1 rounded-md transition-all ${
            os === 'win'
              ? 'bg-white/15 text-white font-medium shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Windows
        </button>
      </div>

      {/* Full-width Terminal Command Bar */}
      <div
        onClick={handleCopy}
        className="group relative w-full flex items-center justify-between gap-3 px-5 py-3.5 bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-xl cursor-pointer transition-all hover:border-white/20 hover:bg-zinc-900/70 shadow-2xl"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex items-center gap-2 text-zinc-500 select-none flex-shrink-0">
            <Terminal className="w-4 h-4 text-green-400/80" />
            <span className="text-xs md:text-sm font-mono opacity-60">
              {os === 'unix' ? '$' : 'PS>'}
            </span>
          </div>

          <code className="text-xs sm:text-sm md:text-base font-mono text-zinc-200 tracking-tight select-all">
            {command}
          </code>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 pl-3 border-l border-white/10">
          {copied ? (
            <span className="inline-flex items-center gap-1 text-xs font-mono text-green-400">
              <Check className="w-4 h-4" />
              <span className="hidden sm:inline">Copied</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-mono text-zinc-400 group-hover:text-zinc-200 transition-colors">
              <Copy className="w-4 h-4" />
              <span className="hidden sm:inline">Copy</span>
            </span>
          )}
        </div>

        {/* Subtle background glow on copy */}
        <div
          className={`absolute inset-0 bg-green-500/5 transition-opacity duration-500 pointer-events-none rounded-xl ${
            copied ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>
    </div>
  );
}
