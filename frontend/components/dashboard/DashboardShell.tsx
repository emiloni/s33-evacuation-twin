"use client";

import React, { useState, useEffect } from "react";
import StatusBadge from "@/components/ui/StatusBadge";
import FloorSwitcher from "@/components/building/FloorSwitcher";
import TelemetryBar from "./TelemetryBar";
import Icons from "@/lib/icon-set";
import Link from "next/link";

interface DashboardShellProps {
  selectedFloor: number;
  onSelectFloor: (floor: number) => void;
  simulationRunning: boolean;
  hazardsCount?: number;
  buildingName?: string;
  floors?: number[];
  children: React.ReactNode;
}

export default function DashboardShell({
  selectedFloor,
  onSelectFloor,
  simulationRunning,
  hazardsCount = 0,
  buildingName = "BUILDING A",
  floors = [1, 2],
  children,
}: DashboardShellProps) {
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString("en-US", { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-zinc-900 flex flex-col font-sans select-none">
      {/* 3D EMERGENCY OPERATIONS COMMAND HEADER (White / Light Theme) */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/95 px-6 backdrop-blur-2xl shadow-xs">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono font-black text-xs tracking-widest shadow-xs hover:bg-emerald-100 transition-colors"
            title="Return to Landing Page"
          >
            S33
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-wider text-zinc-950 uppercase">
                EMERGENCY OPERATIONS CENTER
              </h1>
              <span className="rounded-md border border-zinc-200 bg-zinc-100 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-700 uppercase tracking-widest">
                {buildingName}
              </span>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>SYSTEM ONLINE • 3D SPATIAL DIGITAL TWIN CONSOLE</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5">
          {timeStr && (
            <div className="hidden font-mono text-xs font-bold tracking-widest text-zinc-500 sm:flex items-center gap-1.5">
              <Icons.Clock className="h-3.5 w-3.5 text-zinc-400" />
              <span>SYS TIME: <strong className="text-zinc-900">{timeStr} UTC</strong></span>
            </div>
          )}

          <StatusBadge
            variant={simulationRunning ? "red" : "emerald"}
            label={simulationRunning ? "SIMULATION ACTIVE" : "OPERATIONAL READY"}
            pulse={simulationRunning}
          />

          <FloorSwitcher
            selectedFloor={selectedFloor}
            onSelectFloor={onSelectFloor}
            floors={floors}
          />

          {/* OFFICER / CMD PROFILE BADGE */}
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 font-mono text-xs font-bold text-zinc-700 shadow-xs">
            <Icons.Shield className="h-3.5 w-3.5 text-blue-600" />
            <span>CMD / OFFICER</span>
          </div>
        </div>
      </header>

      {/* MAIN COMMAND WORKSPACE */}
      <div className="flex-1">
        {children}
      </div>

      {/* BOTTOM TELEMETRY STATUS STRIP */}
      <TelemetryBar
        simulationRunning={simulationRunning}
        hazardsCount={hazardsCount}
      />
    </div>
  );
}
