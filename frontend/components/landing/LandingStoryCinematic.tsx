"use client";

import React from "react";
import Link from "next/link";
import Icons from "@/lib/icon-set";

interface LandingStoryCinematicProps {
  onOpenUpload: () => void;
}

export default function LandingStoryCinematic({ onOpenUpload }: LandingStoryCinematicProps) {
  return (
    <div className="relative bg-[#05070A] text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* ATMOSPHERIC BACKGROUND AMBIENCE */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/4 top-1/6 h-[700px] w-[700px] rounded-full bg-emerald-500/5 blur-[200px]" />
        <div className="absolute right-1/4 top-1/2 h-[700px] w-[700px] rounded-full bg-cyan-500/5 blur-[200px]" />
        <div className="absolute left-1/3 bottom-1/4 h-[700px] w-[700px] rounded-full bg-red-500/5 blur-[200px]" />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-16 space-y-36">
        {/* SECTION 1 — BLUEPRINT TO 3D DIGITAL TWIN */}
        <section className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-950/40 px-3.5 py-1 font-mono text-xs font-bold uppercase tracking-widest text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Section 01 — Structural Materialization</span>
            </div>

            <h2 className="mt-6 text-4xl font-black leading-tight tracking-tight text-slate-100 sm:text-5xl">
              From flat blueprint to <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                spatial digital twin.
              </span>
            </h2>

            <p className="mt-6 text-base leading-8 text-slate-400 sm:text-lg">
              Static architectural drawings lack real-time context. S33 automatically ingests 2D CAD and PDF floor plans, vectorizes walls, doors, and stairwells, and generates an interactive 3D spatial digital twin with beveled architectural geometry.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4 font-mono text-xs font-bold">
              <div className="rounded-2xl border border-slate-800 bg-[#081018]/80 p-5 backdrop-blur-xl">
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <Icons.Grid className="h-4 w-4" />
                  <span>2D CAD → 3D Mesh</span>
                </div>
                <div className="mt-2 text-slate-400 font-normal leading-5">
                  Automated boundary parsing into polygonal room zones and corridor networks.
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#081018]/80 p-5 backdrop-blur-xl">
                <div className="flex items-center gap-2 text-cyan-400 text-sm">
                  <Icons.Layers className="h-4 w-4" />
                  <span>Glass & Concrete Walls</span>
                </div>
                <div className="mt-2 text-slate-400 font-normal leading-5">
                  Physically-based architectural shaders with depth translucency and cast shadows.
                </div>
              </div>
            </div>
          </div>

          <div className="relative h-[440px] w-full rounded-3xl border border-slate-800/80 bg-[#081018]/90 p-6 shadow-2xl backdrop-blur-xl flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between font-mono text-xs text-slate-400">
              <span className="text-emerald-400 font-bold">PARSER ENGINE: ACTIVE</span>
              <span>VECTOR RESOLUTION: 0.05m</span>
            </div>

            <div className="relative flex-1 flex items-center justify-center my-4">
              <div className="relative h-64 w-full rounded-2xl border border-slate-800 bg-[#0D141C] p-4 flex items-center justify-around">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-28 w-28 rounded-xl border border-dashed border-slate-700 bg-slate-900 flex flex-col items-center justify-center font-mono text-xs text-slate-400">
                    <Icons.FileText className="h-8 w-8 text-slate-500 mb-1" />
                    <span>2D Floor Plan</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500">RAW CAD / PDF</span>
                </div>

                <div className="flex flex-col items-center gap-2 font-mono text-xs text-emerald-400">
                  <Icons.Zap className="h-6 w-6 animate-pulse" />
                  <span>3D EXTRUSION</span>
                  <span className="text-[10px] text-slate-500">Mesh Generation</span>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <div className="h-28 w-28 rounded-xl border border-emerald-500/50 bg-emerald-950/30 flex flex-col items-center justify-center font-mono text-xs text-emerald-300 shadow-xl shadow-emerald-950/40">
                    <Icons.Box className="h-8 w-8 text-emerald-400 mb-1" />
                    <span>3D Twin Mesh</span>
                  </div>
                  <span className="font-mono text-[11px] text-emerald-400 font-bold">SPATIAL TWIN</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between font-mono text-xs text-slate-400 border-t border-slate-800 pt-3">
              <span>BOUNDING BOX: 1000 x 800 UNITS</span>
              <span className="text-emerald-400">100% VERIFIED</span>
            </div>
          </div>
        </section>

        {/* SECTION 2 — VOLUMETRIC HAZARD PROPAGATION */}
        <section className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div className="order-2 lg:order-1 relative h-[440px] w-full rounded-3xl border border-red-900/40 bg-[#081018]/90 p-6 shadow-2xl backdrop-blur-xl flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-red-400 font-bold flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span>DYNAMIC THREAT RADIUS: 4.8 METERS</span>
              </span>
              <span className="text-slate-400">THERMAL SEVERITY: HIGH</span>
            </div>

            <div className="my-auto flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-red-900/50 bg-red-950/20">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-950 border border-red-800 text-red-400 shadow-2xl shadow-red-950/60">
                <Icons.Flame className="h-8 w-8 animate-pulse" />
              </div>
              <div className="mt-4 font-mono text-lg font-black text-slate-100">
                ZONE CORRIDOR 01 • THERMAL VECTOR
              </div>
              <p className="mt-2 font-mono text-xs text-red-300 max-w-md">
                Pathfinding engine dynamically invalidates obstructed egress corridors and recomputes secondary exit trajectories in sub-15ms.
              </p>
            </div>

            <div className="flex items-center justify-between font-mono text-xs text-slate-400 border-t border-red-900/30 pt-3">
              <span>BUFFER DISTANCE: 70 UNITS</span>
              <span className="text-red-400 font-bold">SAFETY RE-ROUTING ACTIVE</span>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-950/40 px-3.5 py-1 font-mono text-xs font-bold uppercase tracking-widest text-red-400">
              <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
              <span>Section 02 — Threat Detection</span>
            </div>

            <h2 className="mt-6 text-4xl font-black leading-tight tracking-tight text-slate-100 sm:text-5xl">
              Volumetric hazard <br />
              <span className="text-red-400">
                propagation mapping.
              </span>
            </h2>

            <p className="mt-6 text-base leading-8 text-slate-400 sm:text-lg">
              When an emergency occurs, S33 maps threat coordinates directly onto the 3D digital twin. Localized thermal point lighting, volumetric shockwave rings, and smoke buffer boundaries instantly update the routing graph.
            </p>

            <div className="mt-8 rounded-2xl border border-red-900/60 bg-red-950/30 p-5 font-mono text-xs text-red-200 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-red-400">
                <Icons.AlertTriangle className="h-4 w-4" />
                <span>Active Threat Assessment</span>
              </div>
              <div className="mt-2 text-slate-300 leading-5">
                Thermal fire hazard in East Corridor. Direct exit vector blocked. Egress vectors automatically diverted to West Stairwell with 100% obstacle clearance.
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3 — OCCUPANTS & MOBILITY PROFILES */}
        <section className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-950/40 px-3.5 py-1 font-mono text-xs font-bold uppercase tracking-widest text-cyan-400">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Section 03 — Occupant Awareness</span>
            </div>

            <h2 className="mt-6 text-4xl font-black leading-tight tracking-tight text-slate-100 sm:text-5xl">
              Personalized mobility <br />
              <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                profile routing.
              </span>
            </h2>

            <p className="mt-6 text-base leading-8 text-slate-400 sm:text-lg">
              Not all occupants move at the same speed or can navigate stairs. S33 evaluates wheelchair ramp compliance, elderly movement velocities, minor supervision, and temporary mobility limitations.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4 font-mono text-xs font-bold">
              <div className="rounded-2xl border border-blue-900/60 bg-blue-950/30 p-4 text-blue-300">
                <div className="flex items-center gap-2">
                  <Icons.Accessibility className="h-4 w-4 text-blue-400" />
                  <span>Wheelchair Users</span>
                </div>
                <div className="mt-1 font-normal text-slate-400 text-[11px]">
                  Step-free ramps & wide doors only
                </div>
              </div>

              <div className="rounded-2xl border border-purple-900/60 bg-purple-950/30 p-4 text-purple-300">
                <div className="flex items-center gap-2">
                  <Icons.HeartPulse className="h-4 w-4 text-purple-400" />
                  <span>Elderly Occupants</span>
                </div>
                <div className="mt-1 font-normal text-slate-400 text-[11px]">
                  Reduced velocity thresholds (0.65x)
                </div>
              </div>

              <div className="rounded-2xl border border-pink-900/60 bg-pink-950/30 p-4 text-pink-300">
                <div className="flex items-center gap-2">
                  <Icons.Baby className="h-4 w-4 text-pink-400" />
                  <span>Children / Minors</span>
                </div>
                <div className="mt-1 font-normal text-slate-400 text-[11px]">
                  Supervised group egress vectors
                </div>
              </div>

              <div className="rounded-2xl border border-amber-900/60 bg-amber-950/30 p-4 text-amber-300">
                <div className="flex items-center gap-2">
                  <Icons.Activity className="h-4 w-4 text-amber-400" />
                  <span>Injured / Impaired</span>
                </div>
                <div className="mt-1 font-normal text-slate-400 text-[11px]">
                  Priority clearance egress channels
                </div>
              </div>
            </div>
          </div>

          <div className="relative h-[440px] w-full rounded-3xl border border-slate-800/80 bg-[#081018]/90 p-6 shadow-2xl backdrop-blur-xl flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between font-mono text-xs text-slate-400">
              <span className="text-cyan-400 font-bold">MOBILITY CONSTRAINTS MATRIX</span>
              <span>4 PROFILES EVALUATED</span>
            </div>

            <div className="grid grid-cols-2 gap-4 my-auto">
              <div className="rounded-2xl border border-slate-800 bg-[#0D141C] p-4 font-mono">
                <div className="text-2xl font-black text-blue-400 tabular-nums">4</div>
                <div className="mt-1 text-xs font-bold text-slate-200">Wheelchair Occupants</div>
                <div className="mt-1 text-[10px] text-emerald-400">100% Accessible Paths</div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0D141C] p-4 font-mono">
                <div className="text-2xl font-black text-purple-400 tabular-nums">5</div>
                <div className="mt-1 text-xs font-bold text-slate-200">Elderly Occupants</div>
                <div className="mt-1 text-[10px] text-emerald-400">ETA Adjusted: +18s</div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0D141C] p-4 font-mono">
                <div className="text-2xl font-black text-pink-400 tabular-nums">3</div>
                <div className="mt-1 text-xs font-bold text-slate-200">Minors / Children</div>
                <div className="mt-1 text-[10px] text-emerald-400">Group Paired</div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0D141C] p-4 font-mono">
                <div className="text-2xl font-black text-amber-400 tabular-nums">2</div>
                <div className="mt-1 text-xs font-bold text-slate-200">Temporary Injuries</div>
                <div className="mt-1 text-[10px] text-emerald-400">Step-Free Routes</div>
              </div>
            </div>

            <div className="flex items-center justify-between font-mono text-xs text-slate-400 border-t border-slate-800 pt-3">
              <span>TOTAL OCCUPANTS: 34</span>
              <span className="text-emerald-400">ALL ROUTED SAFELY</span>
            </div>
          </div>
        </section>

        {/* SECTION 4 — LIVE TELEMETRY MATRIX */}
        <section className="rounded-3xl border border-slate-800/80 bg-[#081018]/90 p-10 shadow-2xl backdrop-blur-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-950/40 px-3.5 py-1 font-mono text-xs font-bold uppercase tracking-widest text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Section 04 — Real-Time Telemetry Matrix</span>
          </div>

          <h2 className="mt-4 text-3xl font-black text-slate-100 sm:text-4xl">
            Live Emergency Operations Intelligence
          </h2>

          <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4 font-mono">
            <div className="glass-panel-dark rounded-2xl p-6 border border-slate-800">
              <div className="text-xs text-slate-400 uppercase font-bold">ROUTE TRUST INDEX</div>
              <div className="mt-3 text-3xl font-black text-emerald-400 tabular-nums">94.8%</div>
              <div className="mt-1 text-[11px] text-slate-400">High trust verification score</div>
            </div>

            <div className="glass-panel-dark rounded-2xl p-6 border border-slate-800">
              <div className="text-xs text-slate-400 uppercase font-bold">HAZARD STATUS</div>
              <div className="mt-3 text-3xl font-black text-slate-100">BUFFERED</div>
              <div className="mt-1 text-[11px] text-slate-400">Zero corridor containment breach</div>
            </div>

            <div className="glass-panel-dark rounded-2xl p-6 border border-slate-800">
              <div className="text-xs text-slate-400 uppercase font-bold">TRACKED OCCUPANTS</div>
              <div className="mt-3 text-3xl font-black text-slate-100 tabular-nums">34</div>
              <div className="mt-1 text-[11px] text-slate-400">100% spatial coordinate lock</div>
            </div>

            <div className="glass-panel-dark rounded-2xl p-6 border border-slate-800">
              <div className="text-xs text-slate-400 uppercase font-bold">EXIT BEACONS</div>
              <div className="mt-3 text-3xl font-black text-emerald-400 tabular-nums">3 / 3</div>
              <div className="mt-1 text-[11px] text-slate-400">All egress portals operational</div>
            </div>
          </div>
        </section>

        {/* SECTION 5 — FINAL CALL TO ACTION */}
        <section className="rounded-3xl border border-slate-800 bg-gradient-to-r from-[#081018] via-[#05070A] to-[#081018] p-12 text-center shadow-2xl">
          <div className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-400">
            Section 05 — Ready to Deploy
          </div>

          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-100 sm:text-4xl md:text-5xl">
            Deploy building digital twin intelligence today.
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-300">
            Upload your architectural floor plan file or launch the mission control command center directly.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
            <button
              type="button"
              onClick={onOpenUpload}
              className="inline-flex items-center gap-2.5 rounded-xl bg-emerald-500 px-8 py-4 text-xs font-black tracking-wider uppercase text-slate-950 shadow-2xl shadow-emerald-950/50 transition-all hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Icons.Upload className="h-4 w-4" />
              <span>Upload Floor Plan</span>
            </button>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2.5 rounded-xl border border-slate-800 bg-[#0D141C] px-8 py-4 font-mono text-xs font-bold uppercase tracking-wider text-slate-200 shadow-xl backdrop-blur-xl transition-all hover:bg-slate-800 hover:text-white"
            >
              <Icons.Activity className="h-4 w-4 text-emerald-400" />
              <span>Launch Command Center →</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
