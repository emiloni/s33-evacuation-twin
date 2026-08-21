"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Floor {
  id: string;
  level: number;
  label?: string;
  floorPlan?: string;
  status?: "uploaded" | "processing" | "ready" | "needs_review";
}

interface Building {
  id: string;
  name: string;
  address: string;
  buildingType?: string;
  floors: number;
  normalOccupancy: number;
  status?: "ready" | "processing" | "needs_review";
  updatedAt?: string;
  accessibility?: {
    wheelchairAccessible?: boolean;
    accessibleExits?: boolean;
    elevatorAvailable?: boolean;
  };
  assemblyArea?: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000/api";

export default function BuildingPage() {
  const params = useParams();

  const buildingId = params.buildingId as string;

  const [building, setBuilding] =
    useState<Building | null>(null);

  const [floorList, setFloorList] =
    useState<Floor[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [backendAvailable, setBackendAvailable] =
    useState(true);

  useEffect(() => {
    if (buildingId) {
      loadBuilding();
    }
  }, [buildingId]);

  async function loadBuilding() {
    setLoading(true);

    try {
      const token =
        localStorage.getItem(
          "s33_access_token"
        );

      const response = await fetch(
        `${API_BASE_URL}/buildings/${buildingId}`,
        {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
        }
      );

      if (!response.ok) {
        throw new Error(
          `Building request failed: ${response.status}`
        );
      }

      const data = await response.json();

      const buildingData =
        data.building || data;

      setBuilding(buildingData);

      /*
       * Support either:
       *
       * {
       *   floors: [...]
       * }
       *
       * or:
       *
       * {
       *   building: {...},
       *   floors: [...]
       * }
       */

      setFloorList(
        data.floors ||
          buildingData.floorPlans ||
          []
      );

      setBackendAvailable(true);
    } catch (error) {
      console.warn(
        "Building API is not available yet:",
        error
      );

      setBuilding(null);
      setFloorList([]);
      setBackendAvailable(false);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingState />;
  }

  return (
    <main className="min-h-screen bg-[#F1F5F6]">

      {/* HEADER */}

      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">

        <Link
          href="/admin"
          className="block"
        >
          <div className="text-sm font-black text-slate-900">
            S33 EVACUATION DIGITAL TWIN
          </div>

          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Building Details
          </div>
        </Link>

        <Link
          href="/admin"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
        >
          ← My Buildings
        </Link>

      </header>

      {/* MAIN */}

      <div className="mx-auto max-w-7xl p-6 lg:p-8">

        {/* BACKEND NOT AVAILABLE */}

        {!backendAvailable && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">

            <div className="text-xs font-black uppercase tracking-wider text-amber-700">
              Backend not connected
            </div>

            <p className="mt-1 text-sm leading-6 text-amber-900">
              This building has not been loaded from the
              backend yet. Once the building API is
              connected, its saved information and floor
              plans will appear here.
            </p>

          </div>
        )}

        {/* BUILDING HEADER */}

        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">

          <div>

            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              Registered building
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
              {building?.name ||
                "Building"}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {building?.address ||
                "Building information will appear here."}
            </p>

          </div>

          <div className="flex gap-3">

            <Link
              href="/admin"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Manage Buildings
            </Link>

            <Link
              href={`/emergency?building=${buildingId}`}
              className="rounded-xl bg-red-600 px-4 py-3 text-xs font-black text-white transition hover:bg-red-700"
            >
              Emergency Response
            </Link>

          </div>

        </div>

        {/* SUMMARY */}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <SummaryCard
            value={
              building
                ? String(building.floors)
                : "—"
            }
            label="Floors"
            icon="🏢"
          />

          <SummaryCard
            value={
              building
                ? String(
                    building.normalOccupancy
                  )
                : "—"
            }
            label="Normal occupancy"
            icon="👥"
          />

          <SummaryCard
            value={String(floorList.length)}
            label="Plans uploaded"
            icon="📐"
          />

          <SummaryCard
            value={
              building?.status ===
              "ready"
                ? "READY"
                : building?.status ===
                  "needs_review"
                ? "REVIEW"
                : building?.status ===
                  "processing"
                ? "PROCESSING"
                : "—"
            }
            label="Digital twin"
            icon="◈"
          />

        </div>

        {/* MAIN GRID */}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">

          {/* FLOOR PLANS */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-start justify-between">

              <div>

                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Building structure
                </div>

                <h2 className="mt-2 text-xl font-black text-slate-900">
                  Floor Plans
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Each floor is processed independently
                  and converted into digital-twin geometry.
                </p>

              </div>

              <Link
                href="/buildings/new"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50"
              >
                Add floor
              </Link>

            </div>

            <div className="mt-6 space-y-3">

              {floorList.length > 0 ? (
                floorList.map((floor) => (
                  <FloorCard
                    key={floor.id}
                    floor={floor}
                  />
                ))
              ) : (
                <EmptyFloorState />
              )}

            </div>

          </section>

          {/* RIGHT COLUMN */}

          <div className="space-y-6">

            {/* BUILDING INFORMATION */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Building information
              </div>

              <div className="mt-5 space-y-4">

                <InfoRow
                  label="Type"
                  value={
                    building?.buildingType ||
                    "Not specified"
                  }
                />

                <InfoRow
                  label="Floors"
                  value={
                    building
                      ? String(
                          building.floors
                        )
                      : "—"
                  }
                />

                <InfoRow
                  label="Occupancy"
                  value={
                    building
                      ? String(
                          building.normalOccupancy
                        )
                      : "—"
                  }
                />

                <InfoRow
                  label="Assembly area"
                  value={
                    building?.assemblyArea ||
                    "Not specified"
                  }
                />

              </div>

            </section>

            {/* ACCESSIBILITY */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Accessibility
              </div>

              <div className="mt-5 space-y-3">

                <AccessItem
                  label="Wheelchair accessible"
                  enabled={
                    building?.accessibility
                      ?.wheelchairAccessible
                  }
                />

                <AccessItem
                  label="Accessible exits"
                  enabled={
                    building?.accessibility
                      ?.accessibleExits
                  }
                />

                <AccessItem
                  label="Elevator available"
                  enabled={
                    building?.accessibility
                      ?.elevatorAvailable
                  }
                />

              </div>

            </section>

          </div>

        </div>

        {/* DIGITAL TWIN */}

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 p-6">

            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Digital twin
            </div>

            <h2 className="mt-2 text-xl font-black text-slate-900">
              Building evacuation model
            </h2>

            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
              Once the AI parser has converted the floor
              plans into geometry, the generated SVG model
              will appear here.
            </p>

          </div>

          <div className="flex min-h-[300px] items-center justify-center bg-slate-50 p-8">

            <div className="max-w-md text-center">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                ◈
              </div>

              <h3 className="mt-5 text-lg font-black text-slate-900">
                Digital twin preview
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                The floor-plan geometry generated by the
                AI parser will be rendered here. This will
                include rooms, corridors, doors, exits,
                stairwells and other structural elements.
              </p>

              <div className="mt-5 inline-flex rounded-full bg-slate-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                Awaiting geometry
              </div>

            </div>

          </div>

        </section>

        {/* EMERGENCY INFORMATION */}

        <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6">

          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">

            <div>

              <div className="text-[10px] font-black uppercase tracking-wider text-red-500">
                Emergency response
              </div>

              <h2 className="mt-2 text-lg font-black text-red-950">
                Use this building during an incident
              </h2>

              <p className="mt-1 max-w-2xl text-xs leading-5 text-red-800">
                Rescue teams will use the saved building
                structure as the baseline and can update
                hazards, blocked routes and occupant
                information when an emergency occurs.
              </p>

            </div>

            <Link
              href={`/emergency?building=${buildingId}`}
              className="shrink-0 rounded-xl bg-red-600 px-5 py-3 text-center text-xs font-black text-white transition hover:bg-red-700"
            >
              Open Emergency Mode
            </Link>

          </div>

        </section>

      </div>

    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* SUMMARY CARD                                                               */
/* -------------------------------------------------------------------------- */

function SummaryCard({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <div className="text-2xl font-black text-slate-900">
          {value}
        </div>

        <div className="text-xl">
          {icon}
        </div>

      </div>

      <div className="mt-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </div>

    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* FLOOR CARD                                                                 */
/* -------------------------------------------------------------------------- */

function FloorCard({
  floor,
}: {
  floor: Floor;
}) {
  const status =
    floor.status || "uploaded";

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">

      <div className="flex items-center gap-4">

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-black text-slate-900 shadow-sm">
          F{floor.level}
        </div>

        <div>

          <div className="text-sm font-black text-slate-900">
            {floor.label ||
              `Floor ${floor.level}`}
          </div>

          <div className="mt-1 text-[10px] text-slate-400">
            {floor.floorPlan
              ? floor.floorPlan
              : "Floor plan uploaded"}
          </div>

        </div>

      </div>

      <div className="flex items-center gap-3">

        <FloorStatus status={status} />

        {status === "ready" && (
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-100"
          >
            View
          </button>
        )}

      </div>

    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* FLOOR STATUS                                                               */
/* -------------------------------------------------------------------------- */

function FloorStatus({
  status,
}: {
  status: Floor["status"];
}) {
  if (status === "processing") {
    return (
      <div className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700">
        Processing
      </div>
    );
  }

  if (status === "needs_review") {
    return (
      <div className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-red-700">
        Review
      </div>
    );
  }

  if (status === "ready") {
    return (
      <div className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
        Ready
      </div>
    );
  }

  return (
    <div className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600">
      Uploaded
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* INFO ROW                                                                   */
/* -------------------------------------------------------------------------- */

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">

      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </div>

      <div className="max-w-[180px] text-right text-xs font-bold text-slate-900">
        {value}
      </div>

    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ACCESSIBILITY ITEM                                                         */
/* -------------------------------------------------------------------------- */

function AccessItem({
  label,
  enabled,
}: {
  label: string;
  enabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">

      <div className="text-xs font-semibold text-slate-600">
        {label}
      </div>

      <div
        className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
          enabled
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-100 text-slate-400"
        }`}
      >
        {enabled ? "Yes" : "No"}
      </div>

    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* EMPTY FLOOR STATE                                                          */
/* -------------------------------------------------------------------------- */

function EmptyFloorState() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">

      <div className="text-2xl">
        📐
      </div>

      <div className="mt-3 text-sm font-black text-slate-900">
        No floor plans available
      </div>

      <div className="mt-1 text-xs text-slate-400">
        Floor plans will appear here after they are
        uploaded and processed.
      </div>

    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* LOADING                                                                    */
/* -------------------------------------------------------------------------- */

function LoadingState() {
  return (
    <main className="min-h-screen bg-[#F1F5F6]">

      <header className="h-16 border-b border-slate-200 bg-white" />

      <div className="mx-auto max-w-7xl p-8">

        <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-200" />

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {[1, 2, 3, 4].map(
            (item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-2xl bg-white"
              />
            )
          )}

        </div>

        <div className="mt-6 h-96 animate-pulse rounded-2xl bg-white" />

      </div>

    </main>
  );
}