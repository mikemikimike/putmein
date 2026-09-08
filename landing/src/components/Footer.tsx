import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-black py-10 px-6 md:px-16 mt-8 relative overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">

        {/* Brand */}
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="PutMe.in Logo" className="w-30 h-30 object-contain" />
        </div>

        {/* Links */}
        <ul className="flex flex-wrap justify-center gap-6 list-none">
          <li><Link href="/ray" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Ray</Link></li>
          <li><Link href="/ozias" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Ozias</Link></li>
          <li><Link href="/cohen" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Cohen</Link></li>
          <li><Link href="/docs" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Docs</Link></li>
          <li><Link href="/api-docs" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">API</Link></li>
          <li><Link href="/about" className="text-sm font-medium text-zinc-500 hover:text-white transition-colors">About Us</Link></li>
          <li><Link href="/terms" className="text-sm font-medium text-zinc-500 hover:text-white transition-colors">Terms</Link></li>
          <li><Link href="/privacy" className="text-sm font-medium text-zinc-500 hover:text-white transition-colors">Privacy</Link></li>
          <li><Link href="/contact" className="text-sm font-medium text-zinc-500 hover:text-white transition-colors">Contact</Link></li>
        </ul>

        {/* Copyright */}
        <div className="text-sm text-zinc-600">
          &copy; {new Date().getFullYear()} PutMe.in Inc. All rights reserved.
        </div>
      </div>

      {/* <div className="mt-16 w-full flex flex-col items-center justify-center opacity-40 hover:opacity-100 transition-opacity duration-500 cursor-default">
        <pre className="font-mono text-[8px] sm:text-[10px] md:text-sm text-[#00ff41] animate-pulse drop-shadow-[0_0_8px_rgba(0,255,65,0.6)] text-center leading-tight sm:leading-snug">
{`
██████╗ ██╗   ██╗████████╗███╗   ███╗███████╗           ██╗███╗   ██╗
██╔══██╗██║   ██║╚══██╔══╝████╗ ████║██╔════╝           ██║████╗  ██║
██████╔╝██║   ██║   ██║   ██╔████╔██║█████╗             ██║██╔██╗ ██║
██╔═══╝ ██║   ██║   ██║   ██║╚██╔╝██║██╔══╝             ██║██║╚██╗██║
██║     ╚██████╔╝   ██║   ██║ ╚═╝ ██║███████╗    ██╗    ██║██║ ╚████║
╚═╝      ╚═════╝    ╚═╝   ╚═╝     ╚═╝╚══════╝    ╚═╝    ╚═╝╚═╝  ╚═══╝

DevOps is not a joke!
PUTDEV v0.1`}
        </pre>
      </div> */}

      <div className='mt-50'>
        <pre className='footer-text'>
          {`
██████╗ ██╗   ██╗████████╗███╗   ███╗███████╗           ██╗███╗   ██╗
██╔══██╗██║   ██║╚══██╔══╝████╗ ████║██╔════╝           ██║████╗  ██║
██████╔╝██║   ██║   ██║   ██╔████╔██║█████╗             ██║██╔██╗ ██║
██╔═══╝ ██║   ██║   ██║   ██║╚██╔╝██║██╔══╝             ██║██║╚██╗██║
██║     ╚██████╔╝   ██║   ██║ ╚═╝ ██║███████╗    ██╗    ██║██║ ╚████║
╚═╝      ╚═════╝    ╚═╝   ╚═╝     ╚═╝╚══════╝    ╚═╝    ╚═╝╚═╝  ╚═══╝
          `}
        </pre>
      </div>
    </footer>
  );
}
