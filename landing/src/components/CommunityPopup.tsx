"use client";
import React, { useState, useEffect } from 'react';
import { X, Users, MessageSquareQuote } from 'lucide-react';

export default function CommunityPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isClosed) {
        setIsVisible(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isClosed]);

  if (isClosed || !isVisible) return null;

  return (
    <div className={`fixed bottom-6 right-6 z-[100] max-w-[350px] w-full transition-all duration-700 ease-out transform ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-95'}`}>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/90 backdrop-blur-xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group">
        
        {/* Subtle border glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0aa31d]/10 via-transparent to-transparent opacity-50 pointer-events-none"></div>
        
        {/* Close Button */}
        <button 
          onClick={() => setIsClosed(true)}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-colors z-20"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0aa31d]/20 to-[#0aa31d]/5 border border-[#0aa31d]/30 flex items-center justify-center text-[#0aa31d]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="pixel-font text-lg font-bold text-white leading-none mb-1">Join the community</h4>
              <p className="text-[10px] text-[#0aa31d] uppercase tracking-widest font-semibold">Dev-Only Beta Access</p>
            </div>
          </div>

          {/* Testimonial snippet */}
          <div className="bg-black/40 rounded-xl p-3 border border-white/5 mb-5 relative group-hover:border-[#3b82f6]/20 transition-colors">
            <div className="absolute -top-2 -left-1 text-[#0aa31d]/40 rotate-12">
               <MessageSquareQuote className="w-4 h-4" />
            </div>
            <p className="text-zinc-300 text-xs italic leading-relaxed">
              "This agent saved me 20 hours a week on server maintenance. A total game changer for independent devs."
            </p>
            <p className="text-zinc-500 text-[10px] mt-2 font-medium">— @alex_dev</p>
          </div>

          <a 
            href="https://chat.whatsapp.com/FLT9A4rrp4iLMBCbxd2ArC"
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#0aa31d] text-white rounded-xl text-sm font-bold transition-all hover:bg-[#0aa31d] hover:scale-[1.02] active:scale-95 group/btn"
          >
            Join Community now
            <svg 
              className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" 
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M5 12h14m-7-7 7 7-7 7" />
            </svg>
          </a>
          
          <p className="text-center text-[9px] text-zinc-500 mt-3 font-light">
            No spam. Just hot patches and infra tips.
          </p>
        </div>

        {/* Outer glow aura */}
        <div className="absolute -inset-[50px] bg-[#0aa31d]/10 blur-[60px] rounded-full opacity-50 group-hover:opacity-70 transition-opacity pointer-events-none"></div>
      </div>
    </div>
  );
}
