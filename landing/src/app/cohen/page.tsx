import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CursorGlow from "@/components/CursorGlow";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cohen | PutMe.in",
  description: "Cohen is coming soon.",
};

export default function CohenPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden flex flex-col justify-between selection:bg-white/20">
      <CursorGlow />
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-32">
        <h1 className="pixel-font text-5xl sm:text-7xl md:text-8xl font-bold text-white tracking-tight">
          Cohen is coming soon.
        </h1>
      </main>

      <Footer />
    </div>
  );
}
