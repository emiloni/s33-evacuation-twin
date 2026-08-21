import React from "react";

export type BadgeVariant =
  | "emerald"
  | "amber"
  | "red"
  | "blue"
  | "violet"
  | "cyan"
  | "neutral";

export type StatusType =
  | "ONLINE"
  | "ACTIVE"
  | "PROCESSING"
  | "WARNING"
  | "CRITICAL"
  | "ERROR"
  | "COMPLETE";

interface StatusBadgeProps {
  variant?: BadgeVariant;
  label: string;
  pulse?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const variantStyles: Record<
  BadgeVariant,
  { bg: string; text: string; border: string; dot: string }
> = {
  emerald: {
    bg: "bg-emerald-950/40",
    text: "text-emerald-400",
    border: "border-emerald-800/80",
    dot: "bg-emerald-400",
  },
  amber: {
    bg: "bg-amber-950/40",
    text: "text-amber-400",
    border: "border-amber-800/80",
    dot: "bg-amber-400",
  },
  red: {
    bg: "bg-red-950/40",
    text: "text-red-400",
    border: "border-red-800/80",
    dot: "bg-red-400",
  },
  blue: {
    bg: "bg-blue-950/40",
    text: "text-blue-400",
    border: "border-blue-800/80",
    dot: "bg-blue-400",
  },
  cyan: {
    bg: "bg-cyan-950/40",
    text: "text-cyan-400",
    border: "border-cyan-800/80",
    dot: "bg-cyan-400",
  },
  violet: {
    bg: "bg-purple-950/40",
    text: "text-purple-300",
    border: "border-purple-800/80",
    dot: "bg-purple-400",
  },
  neutral: {
    bg: "bg-slate-900/60",
    text: "text-slate-300",
    border: "border-slate-800",
    dot: "bg-slate-400",
  },
};

export default function StatusBadge({
  variant = "neutral",
  label,
  pulse = false,
  size = "md",
  className = "",
}: StatusBadgeProps) {
  const style = variantStyles[variant];
  const padding = size === "sm" ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-lg border font-mono font-bold uppercase tracking-wider backdrop-blur-md transition-all ${style.bg} ${style.text} ${style.border} ${padding} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot} ${pulse ? "animate-pulse" : ""}`} />
      <span>{label}</span>
    </span>
  );
}
