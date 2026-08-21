import React from "react";
import ScrollReveal from "@/components/ui/ScrollReveal";

export default function LandingStory() {
  return (
    <section className="border-t border-zinc-200 bg-[#FAFAFA] py-20 text-zinc-950">
      <div className="mx-auto max-w-7xl px-6">
        {/* NARRATIVE SECTION HEADER */}
        <ScrollReveal delay={50} distance={24}>
          <div className="max-w-2xl">
            <div className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
              Platform Capabilities
            </div>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
              Designed for high-stakes emergency response.
            </h2>
            <p className="mt-4 text-base leading-7 text-zinc-600">
              S33 bridges architectural BIM data and live emergency operations into a single continuous spatial digital twin.
            </p>
          </div>
        </ScrollReveal>

        {/* 3-COLUMN CAPABILITY GRID */}
        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* CAPABILITY 1 */}
          <ScrollReveal delay={100} distance={30}>
            <div className="group h-full rounded-2xl border border-zinc-200 bg-white p-8 shadow-xs transition-all hover:border-zinc-300 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 border border-zinc-200 font-black text-emerald-700 text-lg">
                01
              </div>
              <h3 className="mt-6 text-xl font-bold text-zinc-950">
                Spatial Geometry Extraction
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                Converts raw PDF or PNG floor plans into room polygons, corridor boundaries, stairwell blocks, and egress exit points.
              </p>
              <div className="mt-6 flex items-center gap-2 font-mono text-xs font-semibold text-emerald-700">
                <span>Automated Vector Parsing</span>
                <span>→</span>
              </div>
            </div>
          </ScrollReveal>

          {/* CAPABILITY 2 */}
          <ScrollReveal delay={200} distance={30}>
            <div className="group h-full rounded-2xl border border-zinc-200 bg-white p-8 shadow-xs transition-all hover:border-zinc-300 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 font-black text-emerald-700 text-lg">
                02
              </div>
              <h3 className="mt-6 text-xl font-bold text-zinc-950">
                Hazard-Aware Pathfinding
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                Dynamically recalculates path vectors around fire zones, smoke plumes, flooded corridors, and compromised exit doors.
              </p>
              <div className="mt-6 flex items-center gap-2 font-mono text-xs font-semibold text-emerald-700">
                <span>Real-Time Re-Routing</span>
                <span>→</span>
              </div>
            </div>
          </ScrollReveal>

          {/* CAPABILITY 3 */}
          <ScrollReveal delay={300} distance={30}>
            <div className="group h-full rounded-2xl border border-zinc-200 bg-white p-8 shadow-xs transition-all hover:border-zinc-300 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 border border-zinc-200 font-black text-emerald-700 text-lg">
                03
              </div>
              <h3 className="mt-6 text-xl font-bold text-zinc-950">
                Mobility Profile Routing
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                Accounts for wheelchair accessibility, stair restrictions, elderly movement speeds, and injured occupant bottlenecks.
              </p>
              <div className="mt-6 flex items-center gap-2 font-mono text-xs font-semibold text-emerald-700">
                <span>Accessibility Compliant</span>
                <span>→</span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
