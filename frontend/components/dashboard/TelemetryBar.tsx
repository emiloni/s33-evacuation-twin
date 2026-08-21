import React from "react";

interface TelemetryBarProps {
  simulationRunning: boolean;
  hazardsCount: number;
}

export default function TelemetryBar({
  simulationRunning,
  hazardsCount,
}: TelemetryBarProps) {
  return (
    <footer className="sticky bottom-0 z-30 flex h-10 items-center justify-between border-t border-zinc-200 bg-white px-6 text-[10px] font-mono tracking-wider text-zinc-600 shadow-xs">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
          <span>ENGINE: <strong className="text-zinc-900">ONLINE (Three.js WebGL)</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${simulationRunning ? "bg-red-600 animate-pulse" : "bg-emerald-600"}`} />
          <span>ROUTING LOGIC: <strong className="text-zinc-900">{simulationRunning ? "SIMULATING EGRESS" : "STANDBY"}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
          <span>GEOMETRY: <strong className="text-zinc-900">VERIFIED (100%)</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${hazardsCount > 0 ? "bg-amber-500 animate-pulse" : "bg-emerald-600"}`} />
          <span>HAZARD EVALUATOR: <strong className="text-zinc-900">{hazardsCount > 0 ? "ACTIVE WARNING" : "CLEAR"}</strong></span>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-5">
        <span>EXITS: <strong className="text-emerald-700 font-bold">3 / 3 AVAILABLE</strong></span>
        <span>AVG ETA: <strong className="text-zinc-900 font-bold">42s</strong></span>
        <span>LATENCY: <strong className="text-zinc-900 font-bold">12ms</strong></span>
      </div>
    </footer>
  );
}
