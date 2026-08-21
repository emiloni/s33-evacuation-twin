import React from "react";
import Link from "next/link";
import Icons from "@/lib/icon-set";

export default function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur-xl shadow-xs">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-black text-sm tracking-widest shadow-xs">
            S33
          </div>
          <div>
            <div className="text-sm font-black tracking-wider text-zinc-950 uppercase">
              S33 DIGITAL TWIN
            </div>
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">
              Evacuation Intelligence Console
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-zinc-800"
          >
            <Icons.Activity className="h-3.5 w-3.5 text-emerald-400" />
            <span>Launch Operational Console</span>
            <Icons.ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
          </Link>
        </div>
      </div>
    </header>
  );
}
