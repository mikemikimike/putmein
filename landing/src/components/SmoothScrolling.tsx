"use client";
import { ReactLenis } from "@studio-freight/react-lenis";
import { ReactNode } from "react";

export default function SmoothScrolling({ children }: { children: ReactNode }) {
  return (
    <ReactLenis 
      root 
    >
      {/* We cast to any here to bridge the two different ReactNode versions */}
      {children as any}
    </ReactLenis>
  );
}