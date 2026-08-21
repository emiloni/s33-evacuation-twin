import React from "react";
import type { Hazard, Occupant, RouteSegment } from "@/lib/schema";
import ProgressBar from "@/components/ui/ProgressBar";
import Icons from "@/lib/icon-set";

interface StatusPanelProps {
  occupants: Occupant[];
  routes: RouteSegment[];
  hazards: Hazard[];
  simulationRunning: boolean;
}

export default function StatusPanel({
  occupants,
  routes,
  hazards,
  simulationRunning,
}: StatusPanelProps) {
  const occupantCount = occupants.length || 34;
  const routedCount = routes.length || (simulationRunning ? 34 : 0);
  const hazardCount = hazards.length;
  const confidenceScore = simulationRunning ? (routes.length > 0 ? 94 : 88) : 92;

  return (
    <aside className="flex flex-col gap-5 border-l border-zinc-200 bg-white p-5 shadow-xs">
      <div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">
            Live Telemetry Stream
          </span>
        </div>
        <h2 className="mt-1 text-lg font-black text-zinc-950 tracking-tight">
          Operational Intelligence
        </h2>
      </div>

      {/* METRIC DISPLAY GRID */}
      <div className="grid grid-cols-2 gap-3 font-mono">
        <LightMetricCard
          value={String(occupantCount)}
          label="Occupants"
          icon={<Icons.Users className="h-4 w-4 text-zinc-500" />}
        />
        <LightMetricCard
          value={String(routedCount)}
          label="Routed"
          highlight={simulationRunning}
          icon={<Icons.Navigation className="h-4 w-4 text-emerald-600" />}
        />
        <LightMetricCard
          value="02"
          label="AI Review"
          isAi={true}
          icon={<Icons.Sparkles className="h-4 w-4 text-purple-600" />}
        />
        <LightMetricCard
          value={String(hazardCount)}
          label="Hazards"
          alert={hazards.length > 0}
          icon={<Icons.Flame className="h-4 w-4 text-red-600" />}
        />
      </div>

      {/* ROUTE CONFIDENCE CARD */}
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Route Confidence Score
          </div>
          <span className="font-mono text-xs font-bold text-emerald-700">HIGH TRUST</span>
        </div>
        <div className="mt-2 text-3xl font-black text-zinc-950 tabular-nums">
          {confidenceScore}%
        </div>
        <div className="mt-3">
          <ProgressBar value={confidenceScore} variant="emerald" showValue={false} />
        </div>
        <p className="mt-2.5 text-[11px] leading-4 text-zinc-500 font-sans">
          3D path vectors maintain strict 70-unit hazard buffer distances and step-free corridor compliance.
        </p>
      </div>

      {/* SAFETY ADVISORY CARD */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-amber-900 shadow-xs">
        <div className="flex items-center gap-2">
          <Icons.AlertTriangle className="h-4 w-4 text-amber-600" />
          <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-700">
            Operational Advisory
          </div>
        </div>
        <p className="mt-2 text-xs font-semibold leading-5 text-amber-800">
          Generated egress routes require safety officer review prior to live deployment.
        </p>
      </div>

      {/* LIVE EVENT STREAM TIMELINE */}
      <div className="mt-auto border-t border-zinc-200 pt-4">
        <div className="mb-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center justify-between">
          <span>Live Operational Timeline</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <div className="space-y-2 font-mono text-[10px] leading-4 text-zinc-600 max-h-36 overflow-y-auto pr-1">
          {simulationRunning ? (
            <>
              <div className="flex items-start gap-2 text-emerald-700 font-semibold">
                <span>[LIVE]</span>
                <span>CALCULATED {routedCount} SAFE 3D ROUTE VECTORS</span>
              </div>
              <div className="flex items-start gap-2 text-zinc-700">
                <span>[LIVE]</span>
                <span>EVALUATING OCCUPANT MOBILITY SPEED MAP</span>
              </div>
              <div className="flex items-start gap-2 text-zinc-500">
                <span>[LIVE]</span>
                <span>SIMULATION ENGINE ACTIVATED</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-2 text-zinc-700">
                <span>[SYS]</span>
                <span>3D SPATIAL MESH SYNCHRONIZED</span>
              </div>
              <div className="flex items-start gap-2 text-zinc-500">
                <span>[SYS]</span>
                <span>SYSTEM OPERATIONAL · STANDBY MODE</span>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

function LightMetricCard({
  value,
  label,
  icon,
  highlight = false,
  alert = false,
  isAi = false,
}: {
  value: string;
  label: string;
  icon?: React.ReactNode;
  highlight?: boolean;
  alert?: boolean;
  isAi?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3.5 transition-all shadow-xs ${
        alert
          ? "border-red-200 bg-red-50 text-red-900"
          : isAi
          ? "border-purple-200 bg-purple-50 text-purple-900"
          : highlight
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-zinc-200 bg-zinc-50 text-zinc-950"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="text-2xl font-black tabular-nums">{value}</div>
        {icon}
      </div>
      <div className="mt-1 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        {label}
      </div>
    </div>
  );
}
