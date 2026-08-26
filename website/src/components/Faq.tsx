"use client";

import React, { useState } from 'react';

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "\"Is this just another Coolify?\"",
      answer: "No. Coolify is a tool you use; our product is an Agent that works for you. We handle the 24/7 maintenance, security updates, and incident response autonomously."
    },
    {
      question: "\"How do you handle security?\"",
      answer: "Our agent uses a secure, encrypted WebSocket to talk to the \"Main Brain.\" You maintain full root control, and every high-risk action requires a \"Human-in-the-Loop\" approval via push notification."
    },
    {
      question: "\"Does this help with SOC 2?\"",
      answer: "Yes. Our SOC 2 Vault automatically maps every deployment and security patch to specific compliance controls, saving you months of manual documentation."
    }
  ];

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="relative py-24 px-6 md:px-16 md:py-32 w-full max-w-7xl mx-auto flex flex-col items-start text-left z-10 border-t border-white/10">
      
      {/* Background glow effect on the left for the Faq */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[600px] h-[500px] bg-[radial-gradient(circle,rgba(59,130,246,0.08)_0%,rgba(0,0,0,0)_60%)] pointer-events-none z-0"></div>

      <div className="w-full relative z-10 flex flex-col items-start gap-12">
        <h2 className="pixel-font text-4xl md:text-5xl lg:text-5xl font-normal text-white tracking-tight">
          FAQ
        </h2>

        <div className="w-full border-t border-[#1e293b]">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            
            return (
              <div 
                key={index}
                className="group border-b border-[#1e293b]"
              >
                <button
                  onClick={() => handleToggle(index)}
                  className="w-full py-6 md:py-8 text-left flex items-center justify-between gap-6 transition-colors duration-300 hover:text-white/80 focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <h3 className={`text-lg md:text-xl font-normal text-white max-w-[85%] leading-snug transition-all duration-300 ${isOpen ? 'text-white' : 'text-zinc-200'}`}>
                    {faq.question}
                  </h3>
                  
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-[#1e293b] text-white' : 'bg-[#0f172a] border border-[#1e293b] text-white group-hover:bg-[#1e293b]'}`}>
                    {isOpen ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    )}
                  </div>
                </button>
                
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100 pb-8' : 'max-h-0 opacity-0 pb-0'}`}
                >
                  <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-4xl pr-12">
                    {faq.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* <div className="mt-2">
          <button className="px-5 py-2.5 bg-[#1e293b] hover:bg-[#334155] transition-all rounded-md text-white font-medium text-xs tracking-wide">
            View All
          </button>
        </div> */}
      </div>
    </section>
  );
}
