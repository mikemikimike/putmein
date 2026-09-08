"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

function StarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}

function formatStarCount(count: number): string {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return count.toString();
}

const NAV_LINKS = [
  { label: "Ray", href: "/ray" },
  { label: "Ozias", href: "/ozias" },
  { label: "Cohen", href: "/cohen" },
  { label: "Docs", href: "/docs" },
  { label: "API", href: "/api-docs" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    const repo = process.env.NEXT_PUBLIC_GITHUB_REPO || "ab-muhammad-hamza/putmein";
    fetch(`https://api.github.com/repos/${repo}`)
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data && typeof data.stargazers_count === "number") {
          setStars(data.stargazers_count);
        }
      })
      .catch(() => {});
  }, []);

  const displayCount = stars !== null ? formatStarCount(stars) : "0";

  return (
    <header className="fixed top-0 left-0 right-0 h-20 flex items-center justify-between px-6 md:px-16 bg-black/50 backdrop-blur-md z-50">
      <Link href="/" className="flex items-center gap-3 no-underline text-white">
        <img src="/logo.svg" alt="PutMe.in Logo" className="w-40 h-40 object-contain" />
      </Link>

      <ul className="hidden md:flex gap-8 list-none items-center">
        {NAV_LINKS.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`text-sm transition-all duration-200 ${
                  isActive
                    ? "text-white font-semibold drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]"
                    : "text-zinc-500 font-medium hover:text-zinc-200"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-3 hidden sm:flex">
        {/* GitHub on the left */}
        <a
          href="https://github.com/ab-muhammad-hamza/putmein"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-shrink-0 items-center justify-center gap-2 px-3.5 py-2 border border-white/20 rounded-lg text-white text-sm font-medium transition-all hover:bg-white/10 hover:border-white/40 group"
          title="Star PutMe.in on GitHub"
        >
          <GithubIcon className="w-4 h-4 text-white" />
          <span className="hidden lg:inline">GitHub</span>
          <span className="w-px h-3.5 bg-white/20 hidden lg:inline-block" />
          <span className="inline-flex items-center gap-1 text-xs text-zinc-300 group-hover:text-white transition-colors">
            <StarIcon className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="font-mono font-medium">{displayCount}</span>
          </span>
        </a>

        {/* Download on the right: Big prominent white button */}
        <Link
          href="/download"
          className="inline-flex flex-shrink-0 items-center justify-center gap-2 px-5 py-2 rounded-lg bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-all shadow-[0_0_25px_rgba(255,255,255,0.25)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:scale-[1.02] active:scale-[0.98]"
          title="Download PutMe.in"
        >
          <svg
            className="w-4 h-4 text-black"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Download</span>
        </Link>
      </div>
    </header>
  );
}
