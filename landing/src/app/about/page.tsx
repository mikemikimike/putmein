import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CursorGlow from '@/components/CursorGlow';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us | Putme.in',
  description: 'Learn about PutMe.in, the team behind your Digital SRE Agent that scales your engineering without the infrastructure toil.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden selection:bg-blue-500/30">
      <CursorGlow />
      <Navbar />

      {/* Hero Banner */}
      <section className="relative pt-32 pb-20 px-6 md:px-16 max-w-7xl mx-auto text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent pointer-events-none" />
        <h1 className="pixel-font text-5xl md:text-7xl font-bold tracking-tight mb-6 relative z-10">
          About <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">PutMe.in</span>
        </h1>
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto relative z-10 font-light">
          We&apos;re on a mission to eliminate infrastructure toil so engineers can focus on what truly matters — building great products.
        </p>
      </section>

      {/* Our Story */}
      <section className="py-16 px-6 md:px-16 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-sm font-semibold text-blue-400 uppercase tracking-widest mb-4 block">Our Story</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
              Born from the DevOps Trenches
            </h2>
            <p className="text-zinc-400 text-lg leading-relaxed mb-4">
              PutMe.in was founded by a team of seasoned SREs and platform engineers who spent years battling the same repetitive infrastructure challenges across multiple organizations.
            </p>
            <p className="text-zinc-400 text-lg leading-relaxed">
              We realized that the majority of operational work — monitoring, scaling, incident response, and deployment pipelines — follows predictable patterns that can be intelligently automated. That insight became the foundation of our Digital SRE Agent.
            </p>
          </div>
          <div className="relative rounded-2xl border border-white/10 bg-zinc-900/50 p-8 backdrop-blur-sm">
            <div className="absolute -top-3 -right-3 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-3 -left-3 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl" />
            <div className="space-y-6 relative z-10">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg mb-1">Founded in 2024</h3>
                  <p className="text-zinc-500 text-sm">Started with a bold vision to transform how teams handle infrastructure.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg mb-1">Team of 15+ Engineers</h3>
                  <p className="text-zinc-500 text-sm">Ex-Google, AWS, and Netflix SREs building the future of DevOps.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg mb-1">500+ Companies Trust Us</h3>
                  <p className="text-zinc-500 text-sm">From startups to Fortune 500, teams rely on PutMe.in daily.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-16 px-6 md:px-16 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center mb-16">
          <span className="text-sm font-semibold text-purple-400 uppercase tracking-widest mb-4 block">Our Values</span>
          <h2 className="text-3xl md:text-4xl font-bold text-white">What Drives Us Every Day</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              title: 'Engineering First',
              desc: 'We believe engineers should spend their time building — not firefighting. Every decision we make puts developer experience front and center.',
              icon: (
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
              ),
              accent: 'blue',
            },
            {
              title: 'Radical Transparency',
              desc: 'Open communication, honest metrics, and clear documentation. We share our learnings with the community and operate with full transparency.',
              icon: (
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              ),
              accent: 'purple',
            },
            {
              title: 'Relentless Reliability',
              desc: 'Our platform is built to the highest standards of availability and performance, because we know your infrastructure never sleeps.',
              icon: (
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              ),
              accent: 'emerald',
            },
          ].map((value) => (
            <div
              key={value.title}
              className="group rounded-2xl border border-white/10 bg-zinc-900/50 p-8 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-zinc-800/50 hover:-translate-y-1"
            >
              <div className={`w-12 h-12 rounded-xl bg-${value.accent}-500/10 border border-${value.accent}-500/20 flex items-center justify-center mb-5`}>
                {value.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{value.title}</h3>
              <p className="text-zinc-400 leading-relaxed">{value.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 md:px-16 max-w-7xl mx-auto border-t border-white/10 text-center">
        <h2 className="pixel-font text-3xl md:text-5xl font-bold text-white mb-6">Want to Join Our Mission?</h2>
        <p className="text-lg text-zinc-400 max-w-xl mx-auto mb-10">
          We&apos;re always looking for talented engineers who share our passion for simplifying DevOps.
        </p>
        <a
          href="#careers"
          className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-black bg-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:bg-zinc-200 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
        >
          View Open Positions
        </a>
      </section>

      <Footer />
    </div>
  );
}
