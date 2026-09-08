import React from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import RayShowcase from '@/components/RayShowcase';
import Problem from '@/components/Problem';
import Solution from '@/components/Solution';
import Features from '@/components/Features';
import Faq from '@/components/Faq';
import Cta from '@/components/Cta';
import Footer from '@/components/Footer';
import CursorGlow from '@/components/CursorGlow';

import CommunityPopup from '@/components/CommunityPopup';

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden selection:bg-blue-500/30">
      <CursorGlow />
      {/* <CommunityPopup /> */}
      <Navbar />
      <Hero />
      <RayShowcase />
      <Problem />
      <Solution />
      <Features />
      <Faq />
      <Cta />
      <Footer />
    </div>
  );
}
