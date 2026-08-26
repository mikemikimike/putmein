"use client";
import React, { useEffect, useRef, useState } from 'react';

export default function Solution() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting) {
        setIsVisible(true);
        // Disconnect after it becomes visible to only animate once
        observer.disconnect();
      }
    }, { threshold: 0.1 });

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      title: "Autonomous Deployment",
      description: "Push code, and our agent builds the environment using Nix-based reproducibility.",
      icon: (
        <svg className="w-5 h-5 text-[#3b82f6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.29 7 12 12 20.71 7"></polyline>
          <line x1="12" y1="22" x2="12" y2="12"></line>
        </svg>
      )
    },
    {
      title: "Self-Healing Infrastructure",
      description: "If a service hangs or a proxy fails, the agent detects it and heals it in < 1 second.",
      icon: (
        <svg className="w-5 h-5 text-[#3b82f6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
      )
    },
    {
      title: "The Main Brain Intelligence",
      description: "Your agent connects to our centralized AI \"Brain\" that pushes real-time security \"vaccines\" to your server the moment a new threat is detected globally.",
      icon: (
        <svg className="w-5 h-5 text-[#3b82f6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 2.5 2.5 0 0 1-.3-4.66 2.5 2.5 0 0 1-.3-4.66 2.5 2.5 0 0 1 2.96-3.08A2.5 2.5 0 0 1 9.5 2Z"></path>
          <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 2.5 2.5 0 0 0 .3-4.66 2.5 2.5 0 0 0 .3-4.66 2.5 2.5 0 0 0-2.96-3.08A2.5 2.5 0 0 0 14.5 2Z"></path>
        </svg>
      )
    }
  ];

  const journeySteps = [
    {
      step: "01",
      title: "Download on your VPS",
      description: "Run a single script to deploy the lightweight agent instantly."
    },
    {
      step: "02",
      title: "Give Commands & Automate",
      description: "Define your tasks and constraints. The agent learns your stack."
    },
    {
      step: "03",
      title: "Monitor in Dashboard",
      description: "See everything happening in real-time with full transparency."
    }
  ];

  return (
    <section id="solution" ref={sectionRef} className="relative py-24 px-6 md:px-16 md:py-32 w-full max-w-7xl mx-auto flex flex-col items-start text-left z-10 border-t border-white/10 overflow-hidden">
      
      {/* Glow on the left */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(59,130,246,0.06)_0%,rgba(0,0,0,0)_70%)] pointer-events-none z-0"></div>

      <div className={`w-full relative z-10 mb-16 md:mb-24 flex flex-col items-start transition-all duration-1000 ease-out transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
        <div className="inline-flex items-center px-3 py-1 rounded-full border border-[#3b82f6]/30 bg-[#3b82f6]/10 text-[#3b82f6] text-xs font-semibold uppercase tracking-wider mb-6">
          Solution
        </div>
        
        <h2 className="pixel-font text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-[-0.03em] leading-tight max-w-3xl mb-6">
          Your Digital SRE Agent
        </h2>
        
        <p className="text-xl md:text-2xl text-zinc-400 max-w-3xl font-light">
          <span className="text-zinc-200 font-medium">The Concept:</span> We don't just give you a dashboard; we give you an Autonomous System Agent. It lives on your server, reads your logs, and acts as an ethical "Digital SRE" to keep you online 24/7.
        </p>
      </div>

      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 relative z-10 mb-20 md:mb-32">
        {features.map((feature, index) => (
          <div 
            key={index} 
            className={`flex flex-col items-start border-l border-white/10 pl-5 transition-all duration-1000 ease-out transform hover:-translate-y-1 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
            style={{ transitionDelay: `${index * 150 + 200}ms` }}
          >
            <div className="mb-4 bg-black/50 rounded-lg p-2.5 border border-white/5 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
              {feature.icon}
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {feature.title}
            </h3>
            <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      <div className="w-full flex flex-col items-start relative z-10">
        <h3 className={`text-2xl md:text-3xl font-bold text-white mb-10 md:mb-16 transition-all duration-1000 ease-out transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`} style={{ transitionDelay: '700ms' }}>
          How it works
        </h3>
        
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting line for desktop */}
          <div className="hidden md:block absolute top-[28px] left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-[#3b82f6]/10 via-[#3b82f6]/40 to-[#3b82f6]/10 z-0"></div>
          
          {journeySteps.map((step, index) => (
            <div 
              key={index} 
              className={`flex flex-col items-center text-center relative z-10 transition-all duration-1000 ease-out transform ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-16 opacity-0 scale-95'}`}
              style={{ transitionDelay: `${index * 200 + 800}ms` }}
            >
              <div className="w-14 h-14 rounded-full bg-zinc-900 border-2 border-[#3b82f6]/30 shadow-[0_0_20px_rgba(59,130,246,0.2)] flex items-center justify-center text-[#3b82f6] font-bold text-xl mb-6 relative">
                {step.step}
                <div className="absolute inset-0 rounded-full border border-[#3b82f6]/20 animate-ping"></div>
              </div>
              <h4 className="text-xl font-semibold text-white mb-3">{step.title}</h4>
              <p className="text-zinc-400 text-sm">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
