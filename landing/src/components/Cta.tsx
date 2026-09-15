import React from 'react';
import PixelCard from './PixelCard';

export default function Cta() {
  return (
    <section className="relative py-24 px-6 md:px-16 w-full max-w-7xl mx-auto flex flex-col items-center z-10 border-t border-white/10">

      {/* Container for the big CTA card using PixelCard as the background wrapper */}
      <PixelCard variant="pink" className="w-full relative overflow-hidden rounded-3xl bg-zinc-900 border border-white/10 flex flex-col items-center text-center shadow-2xl min-h-[400px]" gap={undefined} speed={undefined} colors={undefined} noFocus={undefined}>
        <div className="relative z-10 max-w-3xl flex flex-col items-center justify-center w-full h-full p-10 md:p-16 lg:p-24 mx-auto">
          <h2 className="pixel-font text-4xl md:text-5xl lg:text-7xl font-bold text-white tracking-tight mb-6 leading-tight">
            Stop Managing Servers. <br className="hidden md:block" /> Start Building.
          </h2>

          {/* <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mt-auto">
            <a href="/waitlist" className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-black bg-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:bg-zinc-200 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]">
              Get Early Access Now
            </a>

            <a href="/contact" className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-8 py-4 text-lg font-medium text-white rounded-xl border border-white/20 bg-black/40 backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/40">
              Book a 15-Min Demo
            </a>
          </div> */}
        </div>
      </PixelCard>
    </section>
  );
}
