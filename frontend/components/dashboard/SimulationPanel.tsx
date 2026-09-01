import React from "react";
import type { Hazard, Occupant, MobilityProfile } from "@/lib/schema";
import Icons from "@/lib/icon-set";

interface SimulationPanelProps {
  hazards: Hazard[];
  occupants: Occupant[];
  simulationRunning: boolean;
  selectedBuilding?: number;
  hasCustomBuilding?: boolean;
  customBuildingFloorCount?: number;
  onSelectBuilding?: (building: number) => void;
  onToggleSimulation: () => void;
  onToggleHazard?: () => void;
  mobilityProfile?: MobilityProfile;
  onMobilityProfileChange?: (profile: MobilityProfile) => void;
}

export default function SimulationPanel({
  hazards,
  occupants,
  simulationRunning,
  selectedBuilding = 1,
  hasCustomBuilding = false,
  customBuildingFloorCount,
  onSelectBuilding,
  onToggleSimulation,
  onToggleHazard,
  mobilityProfile = "normal",
  onMobilityProfileChange,
}: SimulationPanelProps) {
  const activeHazard = hazards.length > 0;

  // Mobility counts derived from occupants
  const wheelchairCount = occupants.filter((o) => o.profile === "wheelchair").length || 4;
  const childCount = occupants.filter((o) => o.profile === "child").length || 3;
  const elderlyCount = occupants.filter((o) => o.profile === "elderly").length || 5;
  const injuryCount = occupants.filter((o) => o.profile === "temporary_injury").length || 2;

  return (
    <aside className="flex flex-col gap-6 border-r border-zinc-200 bg-white p-5 shadow-xs">
      <div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">
            Control Matrix
          </span>
        </div>
        <h2 className="mt-1 text-lg font-black text-zinc-950 tracking-tight">
          Scenario Control
        </h2>
        <p className="mt-1 text-xs leading-5 text-zinc-500 font-medium">
          Configure active hazard vectors and trigger dynamic pathfinding evaluation.
        </p>
      </div>

      {/* BUILDING SCENARIO SELECTOR */}
      {onSelectBuilding && (
        <div>
          <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Building Scenario
          </div>
          <div className={`grid gap-1.5 font-mono text-xs ${hasCustomBuilding ? "grid-cols-2" : "grid-cols-3"}`}>
            <button
              type="button"
              onClick={() => onSelectBuilding(1)}
              className={`rounded-xl border p-2 font-bold transition-all text-left cursor-pointer ${
                selectedBuilding === 1
                  ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/20 shadow-xs"
                  : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <div className="text-[11px] font-black">Bldg 1</div>
              <div className="text-[9px] font-normal text-zinc-500 font-sans mt-0.5">1 Floor</div>
            </button>
            <button
              type="button"
              onClick={() => onSelectBuilding(2)}
              className={`rounded-xl border p-2 font-bold transition-all text-left cursor-pointer ${
                selectedBuilding === 2
                  ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/20 shadow-xs"
                  : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <div className="text-[11px] font-black">Bldg 2</div>
              <div className="text-[9px] font-normal text-zinc-500 font-sans mt-0.5">3 Floors</div>
            </button>
            <button
              type="button"
              onClick={() => onSelectBuilding(3)}
              className={`rounded-xl border p-2 font-bold transition-all text-left cursor-pointer ${
                selectedBuilding === 3
                  ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/20 shadow-xs"
                  : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <div className="text-[11px] font-black">Bldg 3</div>
              <div className="text-[9px] font-normal text-zinc-500 font-sans mt-0.5">2 Floors</div>
            </button>
            {hasCustomBuilding && (
              <button
                type="button"
                onClick={() => onSelectBuilding(4)}
                className={`rounded-xl border p-2 font-bold transition-all text-left cursor-pointer ${
                  selectedBuilding === 4
                    ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600/20 shadow-xs"
                    : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <div className="text-[11px] font-black">Bldg 4</div>
                <div className="text-[9px] font-normal text-zinc-500 font-sans mt-0.5">
                  {customBuildingFloorCount ?? "?"} Floors · Uploaded
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* HAZARD CONTROL BUTTON */}
      <div>
        <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Active Threat Vector
        </div>
        <button
          type="button"
          onClick={onToggleHazard}
          className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-xs cursor-pointer ${
            activeHazard
              ? "border-red-300 bg-red-50 text-red-900 shadow-red-100"
              : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:bg-zinc-100 hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div
                className={`font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                  activeHazard ? "text-red-700" : "text-zinc-500"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${activeHazard ? "bg-red-600 animate-pulse" : "bg-zinc-400"}`} />
                <span>{activeHazard ? "HAZARD ACTIVE" : "NO ACTIVE HAZARD"}</span>
              </div>
              <div className="mt-1 text-sm font-black text-zinc-950">
                {activeHazard ? "Fire Incident (East Corridor)" : "Trigger Fire Scenario"}
              </div>
            </div>
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                activeHazard
                  ? "border-red-200 bg-red-100 text-red-600"
                  : "border-zinc-200 bg-white text-zinc-400"
              }`}
            >
              <Icons.Flame className="h-5 w-5" />
            </div>
          </div>
        </button>
      </div>

      {/* OCCUPANCY OVERVIEW */}
      <div>
        <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Occupant Registry
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-black text-zinc-950 tabular-nums">
                {occupants.length || 34}
              </div>
              <div className="mt-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Tracked Spatial Entities
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-blue-600 shadow-xs">
              <Icons.Users className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* MOBILITY PROFILES BREAKDOWN */}
      <div>
        <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Mobility Constraints
        </div>
        <div className="space-y-2">
          <ProfileRow
            icon={<Icons.Accessibility className="h-4 w-4 text-blue-600" />}
            label="Wheelchair Users"
            count={wheelchairCount}
          />
          <ProfileRow
            icon={<Icons.Baby className="h-4 w-4 text-pink-600" />}
            label="Children / Minors"
            count={childCount}
          />
          <ProfileRow
            icon={<Icons.HeartPulse className="h-4 w-4 text-purple-600" />}
            label="Elderly Occupants"
            count={elderlyCount}
          />
          <ProfileRow
            icon={<Icons.Activity className="h-4 w-4 text-amber-600" />}
            label="Temporary Injuries"
            count={injuryCount}
          />
        </div>
      </div>

      {/* MOBILITY PROFILE SELECTOR */}
      <div>
        <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Evacuation Profile
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 shadow-xs">
          <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Active Mobility Mode
          </label>
          <select
            value={mobilityProfile}
            onChange={(e) => onMobilityProfileChange?.(e.target.value as MobilityProfile)}
            className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 font-mono text-xs font-bold text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          >
            <option value="normal">🚶 Standard / Walking</option>
            <option value="wheelchair">♿ Wheelchair User</option>
            <option value="temporary_injury">🦯 Limited Mobility</option>
            <option value="child">👶 Child / Assisted Evacuation</option>
            <option value="elderly">👴 Elderly Occupant</option>
            <option value="first_responder">🚨 First Responder</option>
          </select>
          <div className="mt-2 font-mono text-[10px] text-zinc-400">
            {mobilityProfile === "wheelchair" && "Prefers ramps & accessible elevators. No stairs."}
            {mobilityProfile === "temporary_injury" && "Prefers ramps. Stairs allowed but penalized."}
            {mobilityProfile === "child" && "Assisted evacuation. Avoids high-risk routes."}
            {mobilityProfile === "elderly" && "Slower pace. Prefers accessible routes."}
            {mobilityProfile === "first_responder" && "All routes available. Higher speed."}
            {mobilityProfile === "normal" && "Standard walking pace. All routes available."}
          </div>
        </div>
      </div>

      {/* SIMULATION TRIGGER BUTTON */}
      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={onToggleSimulation}
          className={`w-full rounded-2xl py-4 px-4 font-mono text-xs font-black tracking-wider uppercase transition-all shadow-md active:scale-[0.98] focus:outline-none flex items-center justify-center gap-2 cursor-pointer ${
            simulationRunning
              ? "bg-red-600 hover:bg-red-700 text-white shadow-red-200"
              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
          }`}
        >
          {simulationRunning ? (
            <>
              <Icons.Square className="h-4 w-4 fill-white" />
              <span>Stop Evacuation Simulation</span>
            </>
          ) : (
            <>
              <Icons.Play className="h-4 w-4 fill-white" />
              <span>Run Evacuation Simulation</span>
            </>
          )}
        </button>

        {/* ENGINE STATE TRANSITION DISPLAY */}
        <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span
              className={`h-2 w-2 rounded-full ${
                simulationRunning ? "animate-pulse bg-red-600" : "bg-emerald-600"
              }`}
            />
            <span className="font-mono text-xs font-bold tracking-wider text-zinc-900">
              {simulationRunning ? "RUNNING · EGRESS VECTOR ACTIVE" : "READY · STANDBY"}
            </span>
          </div>
          {simulationRunning && (
            <div className="mt-1.5 font-mono text-[10px] text-emerald-700 font-semibold">
              3D pathfinding vectors active across FL 01 corridors.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function ProfileRow({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 shadow-xs">
      <div className="flex items-center gap-2.5">
        {icon}
        <span className="text-xs font-semibold text-zinc-700">{label}</span>
      </div>
      <span className="font-mono text-xs font-bold text-zinc-950 tabular-nums">{count}</span>
    </div>
  );
}
