import React from 'react';

export default function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 h-20 flex items-center justify-between px-6 md:px-16 bg-black/50 backdrop-blur-md z-50">
      <a href="/" className="flex items-center gap-3 no-underline text-white">
        <img src="/logo.svg" alt="PutMe.in Logo" className="w-40 h-40 object-contain" />
      </a>

      <ul className="hidden md:flex gap-8 list-none">
        <li><a href="#problem" className="text-sm font-medium text-zinc-500 hover:text-white transition-colors">Problem</a></li>
        <li><a href="#solution" className="text-sm font-medium text-zinc-500 hover:text-white transition-colors">Solution</a></li>
        <li><a href="#features" className="text-sm font-medium text-zinc-500 hover:text-white transition-colors">Features</a></li>
        <li><a href="#faq" className="text-sm font-medium text-zinc-500 hover:text-white transition-colors">FAQ</a></li>
      </ul>

      <div className="flex items-center gap-4 hidden sm:flex">
        <a href="/blog" className="inline-flex flex-shrink-0 items-center justify-center gap-2 px-4 py-2 border border-white/20 rounded-lg text-white text-sm font-medium transition-all hover:bg-white/10 hover:border-white/40">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
          </svg>
          <span className="hidden lg:inline">Blog</span>
        </a>
        <a href="/waitlist" className="inline-flex flex-shrink-0 items-center justify-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-sm font-semibold transition-all hover:bg-zinc-200">
          <span className="hidden lg:inline">Book now</span>
        </a>
      </div>
    </header>
  );
}
