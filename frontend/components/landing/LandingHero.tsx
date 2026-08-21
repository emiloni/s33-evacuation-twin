"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Icons from "@/lib/icon-set";
import ScrollReveal from "@/components/ui/ScrollReveal";

interface LandingHeroProps {
  onOpenUpload: () => void;
}

export default function LandingHero({ onOpenUpload }: LandingHeroProps) {
  const [heroStep, setHeroStep] = useState<number>(1);

  // Auto-advance digital twin resolution sequence
  useEffect(() => {
    const timer = setInterval(() => {
      setHeroStep((prev) => (prev % 4) + 1);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative overflow-hidden pt-12 pb-20 lg:pt-16 lg:pb-28 bg-white text-zinc-950">
      {/* BACKGROUND ARCHITECTURAL GRID LINES */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-30">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(#E4E4E7 1px, transparent 1px),
              linear-gradient(90deg, #E4E4E7 1px, transparent 1px)
            `,
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-6">
        {/* EDITORIAL TOP BADGE */}
        <ScrollReveal delay={50} distance={20}>
          <div className="inline-flex items-center gap-2.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-emerald-800 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Real-Time Egress Intelligence Engine</span>
          </div>
        </ScrollReveal>

        {/* DRAMATIC HEADLINE */}
        <div className="mt-8 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <ScrollReveal delay={150} distance={30}>
            <div>
              <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-zinc-950 sm:text-5xl md:text-6xl">
                Buildings aren&apos;t static. <br />
                <span className="text-emerald-600">
                  Neither are emergencies.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-600 font-medium">
                S33 ingests architectural floor plans and converts them into active spatial digital twins capable of analyzing fire hazards, mobility constraints, and routing human traffic to safety in real time.
              </p>

              {/* ACTION BUTTONS */}
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={onOpenUpload}
                  className="rounded-xl bg-zinc-950 px-8 py-4 text-xs font-black uppercase tracking-wider text-white shadow-xl shadow-zinc-950/15 transition-all hover:-translate-y-0.5 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950 cursor-pointer"
                >
                  Upload Floor Plan
                </button>

                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2.5 rounded-xl border border-zinc-300 bg-white px-7 py-4 font-mono text-xs font-bold uppercase tracking-wider text-zinc-800 shadow-xs transition hover:border-zinc-400 hover:bg-zinc-50"
                >
                  <span>Launch Operational Console</span>
                  <Icons.ChevronRight className="h-4 w-4 text-emerald-600" />
                </Link>
              </div>
            </div>
          </ScrollReveal>

          {/* LARGE IMMERSIVE DIGITAL TWIN RESOLUTION CANVAS */}
          <ScrollReveal delay={300} distance={35}>
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl">
            {/* STEP CONTROLS INDICATOR */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-700">STAGE 0{heroStep}/04</span>
                <span className="h-1 w-1 rounded-full bg-zinc-300" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                  {heroStep === 1 && "1. Structural Geometry Extraction"}
                  {heroStep === 2 && "2. Active Hazard Detection"}
                  {heroStep === 3 && "3. Occupant Positioning"}
                  {heroStep === 4 && "4. Dynamic Path Optimization"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4].map((step) => (
                  <button
                    key={step}
                    onClick={() => setHeroStep(step)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      heroStep === step ? "w-6 bg-emerald-600" : "w-2 bg-zinc-200"
                    }`}
                    aria-label={`Step ${step}`}
                  />
                ))}
              </div>
            </div>

            {/* INTERACTIVE PREVIEW GRAPHICS */}
            <div
              className="relative mt-5 h-[380px] overflow-hidden rounded-2xl border border-zinc-200 bg-[#FAFAFA]"
              style={{
                backgroundImage: `
                  linear-gradient(#E4E4E7 1px, transparent 1px),
                  linear-gradient(90deg, #E4E4E7 1px, transparent 1px)
                `,
                backgroundSize: "28px 28px",
              }}
            >
              {/* Room Polygons */}
              <div className="absolute left-[10%] top-[12%] h-[34%] w-[34%] rounded-xl border border-zinc-300 bg-white shadow-xs p-3 flex flex-col justify-between">
                <span className="font-mono text-[9px] font-bold text-zinc-400">ZONE A</span>
                <span className="text-xs font-black text-zinc-800">OFFICE SUITE</span>
              </div>

              <div
                className={`absolute left-[48%] top-[12%] h-[34%] w-[42%] rounded-xl border transition-all duration-500 shadow-xs p-3 flex flex-col justify-between ${
                  heroStep >= 2
                    ? "border-red-300 bg-red-50 text-red-900"
                    : "border-emerald-300 bg-emerald-50 text-emerald-900"
                }`}
              >
                <span className="font-mono text-[9px] font-bold text-zinc-500">CORRIDOR 01</span>
                <span className="text-xs font-black">
                  {heroStep >= 2 ? "⚠️ FIRE HAZARD ZONE" : "MAIN CORRIDOR"}
                </span>
              </div>

              <div className="absolute left-[10%] top-[50%] h-[38%] w-[34%] rounded-xl border border-zinc-300 bg-white shadow-xs p-3 flex flex-col justify-between">
                <span className="font-mono text-[9px] font-bold text-zinc-400">ZONE B</span>
                <span className="text-xs font-black text-zinc-800">MEETING ROOM</span>
              </div>

              <div className="absolute left-[48%] top-[50%] h-[38%] w-[22%] rounded-xl border border-zinc-300 bg-white shadow-xs p-3 flex flex-col justify-between">
                <span className="font-mono text-[9px] font-bold text-zinc-400">ZONE C</span>
                <span className="text-xs font-black text-zinc-800">LOBBY</span>
              </div>

              <div className="absolute left-[74%] top-[50%] h-[38%] w-[16%] rounded-xl border border-emerald-300 bg-emerald-100 shadow-xs p-3 flex flex-col justify-between">
                <span className="font-mono text-[9px] font-bold text-emerald-700">EGRESS</span>
                <span className="text-xs font-black text-emerald-900">EXIT</span>
              </div>

              {/* Step 2: Hazard Pulse Marker */}
              {heroStep >= 2 && (
                <div className="absolute left-[62%] top-[25%] flex items-center justify-center">
                  <span className="absolute h-16 w-16 rounded-full bg-red-500/20 animate-ping" />
                  <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white font-black text-xs shadow-md">
                    🔥
                  </span>
                </div>
              )}

              {/* Step 3: Occupants */}
              {heroStep >= 3 && (
                <>
                  <div className="absolute left-[20%] top-[24%] flex items-center gap-1.5 bg-white border border-blue-200 rounded-full px-2.5 py-1 shadow-xs text-[10px] font-bold text-blue-700">
                    <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                    <span>Wheelchair</span>
                  </div>
                  <div className="absolute left-[22%] top-[65%] flex items-center gap-1.5 bg-white border border-purple-200 rounded-full px-2.5 py-1 shadow-xs text-[10px] font-bold text-purple-700">
                    <span className="h-2 w-2 rounded-full bg-purple-600 animate-pulse" />
                    <span>Elderly</span>
                  </div>
                </>
              )}

              {/* Step 4: Evacuation Path */}
              {heroStep >= 4 && (
                <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 500 380">
                  <polyline
                    points="130,260 130,200 240,200 240,310 380,310 430,260"
                    fill="none"
                    stroke="#059669"
                    strokeWidth="4"
                    strokeDasharray="8 6"
                    className="route-flow"
                  />
                  <circle cx="130" cy="260" r="5" fill="white" stroke="#059669" strokeWidth="2.5" />
                  <circle cx="430" cy="260" r="7" fill="#059669" stroke="white" strokeWidth="2" />
                </svg>
              )}

              {/* Bottom Resolution Status Pill */}
              <div className="absolute left-4 bottom-4 rounded-xl border border-zinc-200 bg-white/95 px-3.5 py-2 shadow-xs backdrop-blur">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 font-mono">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    {heroStep === 1 && "Geometry Bounds Extracted"}
                    {heroStep === 2 && "Hazard Radius Evaluated (High Severity)"}
                    {heroStep === 3 && "6 Occupants Tracked across 3 Zones"}
                    {heroStep === 4 && "Optimal Evacuation Route Generated (34s ETA)"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
