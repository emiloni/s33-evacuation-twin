import React from "react";

interface MetricCardProps {
  value: string | number;
  label: string;
  sublabel?: string;
  variant?: "default" | "active" | "alert" | "ai";
  icon?: React.ReactNode;
}

export default function MetricCard({
  value,
  label,
  sublabel,
  variant = "default",
  icon,
}: MetricCardProps) {
  const borderStyles =
    variant === "alert"
      ? "border-red-800/80 bg-red-950/40 text-red-200"
      : variant === "active"
      ? "border-emerald-800/80 bg-emerald-950/40 text-emerald-200"
      : variant === "ai"
      ? "border-purple-800/80 bg-purple-950/40 text-purple-200"
      : "border-[#1E293B] bg-[#0D141C] text-slate-100 hover:border-slate-700";

  return (
    <div className={`rounded-xl border p-4 backdrop-blur-md transition-all duration-200 ${borderStyles}`}>
      <div className="flex items-center justify-between">
        <div className="text-2xl font-black tracking-tight text-slate-100 tabular-nums">
          {value}
        </div>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <div className="mt-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </div>
      {sublabel && (
        <div className="mt-0.5 font-mono text-[11px] font-medium text-slate-400">
          {sublabel}
        </div>
      )}
    </div>
  );
}
