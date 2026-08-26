"use client";
import React, { useEffect, useRef, useState } from 'react';

export default function Problem() {
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

  const problems = [
    {
      title: "Bill Shock",
      description: "Surprise $2,000 invoices from black-box PaaS providers.",
      icon: (
        <svg className="w-6 h-6 text-[#00d68f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <path d="M8 13h2"></path>
          <path d="M10 13v4"></path>
          <path d="M8 17h2"></path>
          <path d="M14 13l3 3"></path>
          <path d="M14 16h3v-3"></path>
        </svg>
      )
    },
    {
      title: "Maintenance Toil",
      description: "Spending weekends patching CVEs and fixing broken proxies.",
      icon: (
        <svg className="w-6 h-6 text-[#00d68f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
          <path d="M3 3v5h5"></path>
          <path d="M12 7v5l3 3"></path>
        </svg>
      )
    },
    {
      title: "AI Vulnerability",
      description: "Deploying agents that are wide open to prompt injection and \"excessive agency\" risks.",
      icon: (
        <svg className="w-6 h-6 text-[#00d68f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a2 2 0 0 0-2 2c0 1.1.9 2 2 2s2-.9 2-2a2 2 0 0 0-2-2Z"></path>
          <path d="M16.5 10c0-2.5-2-4.5-4.5-4.5S7.5 7.5 7.5 10"></path>
          <path d="M4.5 10c0 4.1 3.4 7.5 7.5 7.5s7.5-3.4 7.5-7.5"></path>
          <path d="M12 17.5V22"></path>
          <path d="M9 22h6"></path>
        </svg>
      )
    },
    {
      title: "Compliance Pain",
      description: "Spending $30k+ and 300 hours manually prepping for SOC 2 audits.",
      icon: (
        <svg className="w-6 h-6 text-[#00d68f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <line x1="19" y1="8" x2="24" y2="13"></line>
          <line x1="24" y1="8" x2="19" y2="13"></line>
        </svg>
      )
    }
  ];

  return (
    <section id="problem" ref={sectionRef} className="relative py-24 px-6 md:px-16 md:py-32 w-full max-w-7xl mx-auto flex flex-col items-start text-left z-10 border-t border-white/10 overflow-hidden">
      
      {/* Glow on the right */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(0,100,255,0.05)_0%,rgba(0,0,0,0)_70%)] pointer-events-none z-0"></div>

      <div className={`w-full relative z-10 mb-16 md:mb-24 flex flex-col items-start transition-all duration-1000 ease-out transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
        <div className="inline-flex items-center px-3 py-1 rounded-full border border-[#00d68f]/30 bg-[#00d68f]/10 text-[#00d68f] text-xs font-semibold uppercase tracking-wider mb-6">
          Problem
        </div>
        
        <h2 className="pixel-font text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-[-0.03em] leading-tight max-w-3xl mb-6">
          The DevOps Death Spiral
        </h2>
        
        <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl font-light">
          <span className="text-zinc-200 font-medium">The Reality:</span> Engineering teams lose 20% of their velocity to "Server Housekeeping."
        </p>
      </div>

      <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 relative z-10">
        {problems.map((problem, index) => (
          <div 
            key={index} 
            className={`flex flex-col items-start border-l border-white/10 pl-6 lg:pl-8 transition-all duration-1000 ease-out transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
            style={{ transitionDelay: `${index * 150 + 200}ms` }}
          >
            <div className="mb-6 bg-black/50 rounded-lg p-2 border border-white/5">
              {problem.icon}
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              {problem.title}
            </h3>
            <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
              {problem.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
