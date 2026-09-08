import React from "react";

export type SpinnerColor =
  | "purple"
  | "emerald"
  | "blue"
  | "amber"
  | "white"
  | "red"
  | "cyan";

export type SpinnerSize = "xs" | "sm" | "md" | "lg";

export interface StateSpinnerProps {
  color?: SpinnerColor;
  size?: SpinnerSize;
  className?: string;
}

const sizeMap: Record<SpinnerSize, string> = {
  xs: "w-2.5 h-2.5",
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

const colorMap: Record<SpinnerColor, string> = {
  purple: "text-purple-400",
  emerald: "text-emerald-400",
  blue: "text-blue-400",
  amber: "text-amber-400",
  cyan: "text-cyan-400",
  white: "text-white/80",
  red: "text-red-400",
};

export function StateSpinner({
  color = "emerald",
  size = "sm",
  className = "",
}: StateSpinnerProps) {
  const sz = sizeMap[size] || sizeMap.sm;
  const col = colorMap[color] || colorMap.emerald;

  return (
    <svg
      className={`animate-spin shrink-0 ${sz} ${col} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        className="opacity-20"
      />
      <path
        d="M21 12a9 9 0 1 1-6.219-8.56"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default StateSpinner;
