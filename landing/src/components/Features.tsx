import React from 'react';

export default function Features() {
  const features = [
    {
      title: "Shadow Proxy Failover",
      advantage: "Unshakeable 99.99% Uptime",
      description: "If your primary Nginx crashes, our lightning-fast Go-based Shadow Proxy instantly redirects traffic without dropping a single connection.",
      icon: (
        <svg className="w-8 h-8 text-[#a855f7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
        </svg>
      )
    },
    {
      title: "AegisAgent Security",
      advantage: "Impenetrable AI Guardrails",
      description: "Deploy AI confidently. We intercept and neutralize prompt injections and excessive agency risks before they ever touch your production database.",
      icon: (
        <svg className="w-8 h-8 text-[#a855f7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          <path d="m9 12 2 2 4-4"></path>
        </svg>
      )
    },
    {
      title: "Automated SOC 2 Vault",
      advantage: "Audit-Ready from Day One",
      description: "Every action your AI takes is continuously logged into an immutable cryptographic vault, transforming compliance into a zero-click experience.",
      icon: (
        <svg className="w-8 h-8 text-[#a855f7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      )
    },
    {
      title: "Zero-Drift Parity",
      advantage: "Absolute Environment Consistency",
      description: "Local vs production discrepancies are history. We guarantee bit-for-bit identical environments so \"it works on my machine\" bugs vanish forever.",
      icon: (
        <svg className="w-8 h-8 text-[#a855f7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
      )
    }
  ];

  return (
    <section id="features" className="relative py-24 px-6 md:px-16 md:py-32 w-full max-w-7xl mx-auto flex flex-col items-center text-center z-10 border-t border-white/10">
      
      {/* Glow effect behind features */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[radial-gradient(circle,rgba(168,85,247,0.06)_0%,rgba(0,0,0,0)_60%)] pointer-events-none z-0"></div>

      <div className="w-full relative z-10 mb-16 md:mb-24 flex flex-col items-center">
        <div className="inline-flex items-center px-3 py-1 rounded-full border border-[#a855f7]/30 bg-[#a855f7]/10 text-[#a855f7] text-xs font-semibold uppercase tracking-wider mb-6">
          The Arsenal
        </div>
        
        <h2 className="pixel-font text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-[-0.03em] leading-tight max-w-4xl mb-6">
          Your Unfair Advantage
        </h2>
        
        <p className="text-xl md:text-2xl text-zinc-400 max-w-3xl font-light">
           Enterprise-grade reliability out of the box. Drop the operational overhead and accelerate your product delivery.
        </p>
      </div>

      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 relative z-10">
        {features.map((feature, index) => (
          <div key={index} className="group relative flex flex-col items-start text-left p-8 rounded-2xl bg-zinc-900/40 border border-white/5 overflow-hidden transition-all duration-500 hover:bg-zinc-800/50 hover:border-white/15 hover:shadow-[0_0_40px_-10px_rgba(168,85,247,0.2)]">
            {/* Animated card gradient hover effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#a855f7]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            
            <div className="mb-6 inline-flex p-3 rounded-xl bg-black border border-white/10 group-hover:border-[#a855f7]/30 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all duration-500">
              {feature.icon}
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">
              {feature.title}
            </h3>
            
            <p className="text-[#a855f7] font-medium mb-4 text-sm md:text-base tracking-wide">
              {feature.advantage}
            </p>
            
            <p className="text-zinc-400 text-base leading-relaxed tracking-wide group-hover:text-zinc-300 transition-colors duration-300">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
