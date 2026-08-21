import React from "react";

interface ProgressBarProps {
  value: number; // 0 to 100
  label?: string;
  variant?: "emerald" | "amber" | "red" | "blue";
  showValue?: boolean;
}

export default function ProgressBar({
  value,
  label,
  variant = "emerald",
  showValue = true,
}: ProgressBarProps) {
  const normalized = Math.max(0, Math.min(100, value));

  const barColors = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
  };

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
          {label && <span className="text-slate-600">{label}</span>}
          {showValue && <span className="tabular-nums font-bold text-slate-900">{normalized}%</span>}
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColors[variant]}`}
          style={{ width: `${normalized}%` }}
          role="progressbar"
          aria-valuenow={normalized}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
