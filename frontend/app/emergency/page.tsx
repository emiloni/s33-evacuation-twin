"use client";

import { useRouter } from "next/navigation";

export default function EmergencyPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#F5F8F7] text-slate-950">

      {/* Background grid */}

      <div className="pointer-events-none fixed inset-0 -z-0 opacity-60">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(#DDE7E3 1px, transparent 1px),
              linear-gradient(90deg, #DDE7E3 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(239,68,68,0.10),transparent_30%),radial-gradient(circle_at_80%_40%,rgba(16,185,129,0.10),transparent_30%)]" />
      </div>

      <section className="relative z-10 mx-auto max-w-[1100px] px-6 py-10">

        {/* Header */}

        <div className="flex items-center justify-between">

          <div>

            <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-red-700">

              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />

              Live Evacuation

            </div>

            <h1 className="mt-6 text-4xl font-black tracking-tight md:text-5xl">
              Emergency Console
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">
              Select the registered building requiring assistance.
              S33 will load its existing digital twin and current
              emergency information.
            </p>

          </div>

        </div>

        {/* Emergency notice */}

        <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-5">

          <div className="flex gap-4">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-xl">
              ⚠️
            </div>

            <div>

              <div className="text-sm font-black text-red-900">
                Emergency mode
              </div>

              <p className="mt-1 text-xs leading-6 text-red-800/80">
                Building information is pre-registered. During an
                emergency, update only the conditions that have
                changed, such as hazards, blocked exits and
                occupancy.
              </p>

            </div>

          </div>

        </div>

        {/* Buildings */}

        <div className="mt-10">

          <div className="mb-4 text-xs font-black uppercase tracking-[0.15em] text-slate-400">
            Registered Buildings
          </div>

          <div className="grid gap-5 md:grid-cols-2">

            {/* Demo building */}

            <button
              onClick={() =>
                router.push("/dashboard")
              }
              className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-red-300 hover:shadow-xl"
            >

              <div className="flex items-start justify-between">

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl">
                  🏢
                </div>

                <div className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                  Digital Twin Ready
                </div>

              </div>

              <div className="mt-5">

                <h2 className="text-xl font-black text-slate-900">
                  Demo Building
                </h2>

                <p className="mt-1 text-xs font-semibold text-slate-400">
                  Office Building
                </p>

              </div>

              {/* Building stats */}

              <div className="mt-6 grid grid-cols-3 gap-3">

                <div className="rounded-xl bg-slate-50 p-3">

                  <div className="text-lg font-black">
                    3
                  </div>

                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Floors
                  </div>

                </div>

                <div className="rounded-xl bg-slate-50 p-3">

                  <div className="text-lg font-black">
                    450
                  </div>

                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Registered
                  </div>

                </div>

                <div className="rounded-xl bg-slate-50 p-3">

                  <div className="text-lg font-black text-emerald-600">
                    ✓
                  </div>

                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Twin
                  </div>

                </div>

              </div>

              {/* Emergency entry */}

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">

                <span className="text-xs font-bold text-slate-400">
                  Ready for emergency response
                </span>

                <span className="text-sm font-black text-red-600 transition group-hover:translate-x-1">
                  Enter →
                </span>

              </div>

            </button>

            {/* Future buildings */}

            <div className="flex min-h-[290px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 p-6 text-center">

              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
                +
              </div>

              <div className="mt-4 text-sm font-black text-slate-700">
                More registered buildings
              </div>

              <p className="mt-2 max-w-xs text-xs leading-5 text-slate-400">
                Buildings registered by administrators will
                automatically become available here.
              </p>

            </div>

          </div>

        </div>

        {/* How it works */}

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">

          <div className="text-sm font-black text-slate-900">
            Emergency workflow
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">

            <div className="rounded-xl bg-slate-50 p-4">

              <div className="text-lg">
                🏢
              </div>

              <div className="mt-3 text-xs font-black">
                Select building
              </div>

              <div className="mt-1 text-[11px] leading-5 text-slate-400">
                Load the pre-registered digital twin.
              </div>

            </div>

            <div className="rounded-xl bg-slate-50 p-4">

              <div className="text-lg">
                📡
              </div>

              <div className="mt-3 text-xs font-black">
                Receive updates
              </div>

              <div className="mt-1 text-[11px] leading-5 text-slate-400">
                Sensors and responders provide current conditions.
              </div>

            </div>

            <div className="rounded-xl bg-slate-50 p-4">

              <div className="text-lg">
                ⚠️
              </div>

              <div className="mt-3 text-xs font-black">
                Update hazards
              </div>

              <div className="mt-1 text-[11px] leading-5 text-slate-400">
                Mark blocked areas, hazards and exits.
              </div>

            </div>

            <div className="rounded-xl bg-slate-50 p-4">

              <div className="text-lg">
                🧭
              </div>

              <div className="mt-3 text-xs font-black">
                Generate routes
              </div>

              <div className="mt-1 text-[11px] leading-5 text-slate-400">
                Calculate updated evacuation recommendations.
              </div>

            </div>

          </div>

        </div>

      </section>

    </main>
  );
}