import React from "react";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  variant?: "default" | "outline" | "ghost" | "primary" | "danger";
  active?: boolean;
}

export default function IconButton({
  icon,
  label,
  variant = "default",
  active = false,
  className = "",
  disabled = false,
  ...props
}: IconButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold transition-all duration-150 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed select-none";

  let variantStyles = "";
  switch (variant) {
    case "outline":
      variantStyles = active
        ? "border border-emerald-500 bg-emerald-950/60 text-emerald-300 shadow-md"
        : "border border-[#1E293B] bg-[#0D141C] text-slate-300 hover:border-slate-700 hover:bg-slate-900";
      break;
    case "ghost":
      variantStyles = active
        ? "bg-[#1E293B] text-slate-100"
        : "bg-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-100";
      break;
    case "primary":
      variantStyles = "bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md font-black";
      break;
    case "danger":
      variantStyles = "bg-red-600 text-white hover:bg-red-500 shadow-md font-bold";
      break;
    default:
      variantStyles = active
        ? "bg-slate-800 text-slate-100 border border-slate-700"
        : "bg-[#0D141C] text-slate-300 hover:bg-slate-900 border border-[#1E293B]";
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles} ${className}`}
      {...props}
    >
      <span className="flex items-center gap-1.5">
        {icon}
        <span className="sr-only sm:not-sr-only sm:inline-block">{label}</span>
      </span>
    </button>
  );
}
