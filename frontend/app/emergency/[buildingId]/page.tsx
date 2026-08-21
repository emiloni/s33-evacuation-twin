"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import FloorPlanSVG from "@/components/floorplan/FloorPlanSVG";
import { DEMO_FLOOR } from "@/lib/demo-floor";

import type {
  FloorGeometry,
  Occupant,
  RouteSegment,
} from "@/lib/schema";

export default function EmergencyConsole() {
  const router = useRouter();

  const [floor] = useState<FloorGeometry>(DEMO_FLOOR);

  const [occupants, setOccupants] = useState<Occupant[]>([]);

  const [routes, setRoutes] = useState<RouteSegment[]>([]);

  const [simulationRunning, setSimulationRunning] =
    useState(false);

  const [selectedFloor, setSelectedFloor] =
    useState(1);

  const [hazardActive, setHazardActive] =
    useState(true);

  const [exitBlocked, setExitBlocked] =
    useState(false);

  const [sensorStatus, setSensorStatus] =
    useState<"online" | "warning" | "offline">(
      "online"
    );

  /*
   * TEMPORARY simulation handler.
   *
   * This is deliberately kept simple for now.
   * Your backend/routing teammate can replace this
   * with the actual evacuation API later.
   */
  const handleSimulation = () => {
    setSimulationRunning(true);

    /*
     * For now we don't fabricate evacuation routes.
     *
     * Once the routing backend is connected,
     * it will return RouteSegment[] here:
     *
     * const response = await fetch(...)
     * const data = await response.json()
     * setRoutes(data.routes)
     */

    setTimeout(() => {
      setSimulationRunning(false);
    }, 1200);
  };

  /*
   * Temporary emergency occupant count.
   *
   * Later this will come from sensors/backend.
   */
  const updateOccupancy = () => {
    if (occupants.length === 0) {
      /*
       * Do not create fake coordinates here.
       * Backend/sensor data will provide actual
       * occupant positions later.
       */
      alert(
        "Occupancy data will be received from sensors/backend."
      );

      return;
    }

    setOccupants([]);
  };

  return (
    <main className="min-h-screen bg-[#F1F5F6] text-slate-950">

      {/* =====================================================
          TOP HEADER
      ====================================================== */}

      <header className="flex min-h-16 flex-col justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3 md:flex-row md:items-center">

        <div>

          <button
            onClick={() =>
              router.push("/emergency")
            }
            className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 transition hover:text-slate-600"
          >
            ← Emergency Buildings
          </button>

          <div className="mt-1 text-sm font-black tracking-tight text-slate-900">
            S33 EVACUATION DIGITAL TWIN
          </div>

          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-red-500">
            Live Emergency Console
          </div>

        </div>

        <div className="flex flex-wrap items-center gap-3">

          {/* Emergency status */}

          <div className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">

            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />

            EMERGENCY MODE

          </div>

          {/* Sensor status */}

          <div
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
              sensorStatus === "online"
                ? "bg-emerald-50 text-emerald-700"
                : sensorStatus === "warning"
                ? "bg-amber-50 text-amber-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >

            <span className="h-2 w-2 rounded-full bg-current" />

            Sensors{" "}
            {sensorStatus === "online"
              ? "Online"
              : sensorStatus === "warning"
              ? "Warning"
              : "Offline"}

          </div>

          {/* Floor */}

          <select
            value={selectedFloor}
            onChange={(e) =>
              setSelectedFloor(
                Number(e.target.value)
              )
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:border-red-400"
          >

            <option value={1}>
              Floor 1
            </option>

            <option value={2}>
              Floor 2
            </option>

            <option value={3}>
              Floor 3
            </option>

          </select>

        </div>

      </header>


      {/* =====================================================
          MAIN COMMAND CENTER
      ====================================================== */}

      <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[270px_minmax(0,1fr)_300px]">


        {/* =================================================
            LEFT PANEL
        ================================================== */}

        <aside className="border-b border-slate-200 bg-white p-5 lg:border-b-0 lg:border-r">

          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            Emergency Control
          </div>

          <h2 className="mt-2 text-lg font-bold text-slate-900">
            Current conditions
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Update only information that has changed
            during the emergency.
          </p>


          {/* Hazard */}

          <div className="mt-6">

            <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Hazard
            </div>

            <button
              onClick={() =>
                setHazardActive(
                  (current) => !current
                )
              }
              className={`w-full rounded-xl border p-4 text-left transition ${
                hazardActive
                  ? "border-red-200 bg-red-50"
                  : "border-slate-200 bg-white"
              }`}
            >

              <div className="flex items-center justify-between">

                <div>

                  <div
                    className={`text-xs font-black ${
                      hazardActive
                        ? "text-red-600"
                        : "text-slate-400"
                    }`}
                  >
                    FIRE
                  </div>

                  <div
                    className={`mt-1 text-sm font-bold ${
                      hazardActive
                        ? "text-red-900"
                        : "text-slate-700"
                    }`}
                  >
                    {hazardActive
                      ? "Active hazard"
                      : "No active hazard"}
                  </div>

                </div>

                <div className="text-xl">
                  🔥
                </div>

              </div>

            </button>

          </div>


          {/* Occupancy */}

          <div className="mt-6">

            <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Occupancy
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

              <div className="flex items-center justify-between">

                <div>

                  <div className="text-2xl font-black text-slate-900">
                    {occupants.length || "—"}
                  </div>

                  <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Detected occupants
                  </div>

                </div>

                <div className="text-2xl">
                  👥
                </div>

              </div>

              <button
                onClick={updateOccupancy}
                className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-50"
              >
                Refresh occupancy
              </button>

            </div>

          </div>


          {/* Exit */}

          <div className="mt-6">

            <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Exit status
            </div>

            <button
              onClick={() =>
                setExitBlocked(
                  (current) => !current
                )
              }
              className={`w-full rounded-xl border p-4 text-left transition ${
                exitBlocked
                  ? "border-red-200 bg-red-50"
                  : "border-emerald-200 bg-emerald-50"
              }`}
            >

              <div className="flex items-center justify-between">

                <div>

                  <div className="text-xs font-black text-slate-500">
                    EXIT A
                  </div>

                  <div
                    className={`mt-1 text-sm font-bold ${
                      exitBlocked
                        ? "text-red-800"
                        : "text-emerald-800"
                    }`}
                  >
                    {exitBlocked
                      ? "Blocked"
                      : "Available"}
                  </div>

                </div>

                <div className="text-xl">
                  🚪
                </div>

              </div>

            </button>

          </div>


          {/* Simulation */}

          <div className="mt-8 border-t border-slate-100 pt-6">

            <button
              onClick={handleSimulation}
              disabled={simulationRunning}
              className={`w-full rounded-xl px-5 py-4 text-sm font-black text-white shadow-lg transition ${
                simulationRunning
                  ? "cursor-wait bg-slate-400"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {simulationRunning
                ? "Calculating..."
                : "Run Evacuation Simulation →"}
            </button>

            <p className="mt-3 text-center text-[10px] leading-5 text-slate-400">
              Recommendations are advisory and should
              be verified by emergency personnel.
            </p>

          </div>

        </aside>


        {/* =================================================
            FLOOR PLAN
        ================================================== */}

        <section className="min-h-[650px] p-4 lg:p-5">

          <div className="flex h-full min-h-[650px] flex-col">

            {/* Building header */}

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">

              <div>

                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Demo Building
                </div>

                <div className="mt-1 text-lg font-black text-slate-900">
                  Floor {selectedFloor}
                </div>

              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">

                <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Route status
                </div>

                <div
                  className={`mt-1 text-xs font-black ${
                    routes.length > 0
                      ? "text-emerald-600"
                      : "text-slate-500"
                  }`}
                >
                  {routes.length > 0
                    ? `${routes.length} route(s) calculated`
                    : "Awaiting simulation"}
                </div>

              </div>

            </div>


            {/* Existing renderer */}

            <div className="min-h-0 flex-1">

              <FloorPlanSVG
                geometry={{
                  ...floor,
                  floorLevel: selectedFloor,
                }}
                editable={false}
                occupants={occupants}
                routes={routes}
              />

            </div>

          </div>

        </section>


        {/* =================================================
            RIGHT INFORMATION PANEL
        ================================================== */}

        <aside className="border-t border-slate-200 bg-white p-5 lg:border-l lg:border-t-0">

          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            Situation Overview
          </div>

          <h2 className="mt-2 text-lg font-bold text-slate-900">
            Emergency status
          </h2>


          {/* Overall status */}

          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">

            <div className="flex items-center gap-2">

              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />

              <span className="text-xs font-black uppercase tracking-wider text-red-700">
                Active Emergency
              </span>

            </div>

            <div className="mt-3 text-sm font-bold text-red-900">
              {hazardActive
                ? "Fire hazard detected"
                : "No active hazard"}
            </div>

            <div className="mt-1 text-xs leading-5 text-red-800/70">
              Conditions may change. Recalculate routes
              when new information becomes available.
            </div>

          </div>


          {/* Sensor information */}

          <div className="mt-6">

            <div className="mb-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Sensor Network
            </div>

            <div className="space-y-2">

              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">

                <span className="text-xs font-semibold text-slate-600">
                  Smoke
                </span>

                <span className="text-[10px] font-black text-red-600">
                  ALERT
                </span>

              </div>

              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">

                <span className="text-xs font-semibold text-slate-600">
                  Temperature
                </span>

                <span className="text-[10px] font-black text-amber-600">
                  WARNING
                </span>

              </div>

              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">

                <span className="text-xs font-semibold text-slate-600">
                  Occupancy
                </span>

                <span className="text-[10px] font-black text-emerald-600">
                  ONLINE
                </span>

              </div>

            </div>

          </div>


          {/* Route result */}

          <div className="mt-6">

            <div className="mb-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Evacuation Recommendation
            </div>

            {routes.length === 0 ? (

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                <div className="text-sm font-bold text-slate-700">
                  No route calculated
                </div>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Run the evacuation simulation after
                  reviewing current emergency conditions.
                </p>

              </div>

            ) : (

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">

                <div className="text-sm font-black text-emerald-800">
                  Routes available
                </div>

                <p className="mt-1 text-xs leading-5 text-emerald-700/70">
                  Evacuation paths have been calculated
                  for the current scenario.
                </p>

              </div>

            )}

          </div>


          {/* Fail safe */}

          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">

            <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">
              Advisory system
            </div>

            <p className="mt-2 text-xs leading-5 text-amber-800/80">
              S33 recommendations must not override
              instructions from emergency personnel or
              on-site safety procedures.
            </p>

          </div>

        </aside>

      </div>

    </main>
  );
}