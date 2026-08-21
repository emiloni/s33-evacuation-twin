"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Building {
  id: string;
  name: string;
  address: string;
  floors: number;
  normalOccupancy: number;
  status?: "ready" | "processing" | "needs_review";
  updatedAt?: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000/api";

export default function AdminPage() {
  const router = useRouter();

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendAvailable, setBackendAvailable] =
    useState(true);
  const [userName, setUserName] = useState("Building Administrator");

  useEffect(() => {
    const storedUser = localStorage.getItem("s33_user");

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);

        if (user.name) {
          setUserName(user.name);
        }
      } catch {
        // Ignore invalid local user data.
      }
    }

    loadBuildings();
  }, []);

  async function loadBuildings() {
    setLoading(true);

    try {
      const token =
        localStorage.getItem("s33_access_token");

      const response = await fetch(
        `${API_BASE_URL}/buildings`,
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
          `Buildings request failed: ${response.status}`
        );
      }

      const data = await response.json();

      /*
       * Support both:
       *
       * [ ... ]
       *
       * and:
       *
       * { buildings: [ ... ] }
       */
      const buildingList = Array.isArray(data)
        ? data
        : data.buildings ?? [];

      setBuildings(buildingList);
      setBackendAvailable(true);
    } catch (error) {
      console.warn(
        "Building API is not available yet:",
        error
      );

      /*
       * The backend may not be running yet.
       * We keep the page usable instead of showing
       * a fatal error.
       */
      setBuildings([]);
      setBackendAvailable(false);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("s33_user");
    localStorage.removeItem("s33_access_token");

    router.push("/");
  }

  return (
    <main className="min-h-screen bg-[#F1F5F6]">

      {/* HEADER */}

      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">

        <Link href="/" className="block">
          <div className="text-sm font-black text-slate-900">
            S33 EVACUATION DIGITAL TWIN
          </div>

          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Building Administration
          </div>
        </Link>

        <div className="flex items-center gap-4">

          <div className="hidden text-right sm:block">
            <div className="text-xs font-bold text-slate-900">
              {userName}
            </div>

            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Building Administrator
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
          >
            Sign out
          </button>

        </div>

      </header>

      {/* MAIN */}

      <div className="mx-auto max-w-7xl p-6 lg:p-8">

        {/* TITLE */}

        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">

          <div>

            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              Building management
            </div>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
              My Buildings
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Manage registered buildings, floor plans,
              accessibility information and digital-twin
              data.
            </p>

          </div>

          <Link
            href="/buildings/new"
            className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-xs font-bold text-white transition hover:bg-slate-800"
          >
            + Register Building
          </Link>

        </div>

        {/* BACKEND STATUS */}

        {!backendAvailable && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">

            <div className="mt-0.5 text-sm">
              ⚠️
            </div>

            <div>
              <div className="text-xs font-black uppercase tracking-wider text-amber-700">
                Backend not connected
              </div>

              <p className="mt-1 text-sm leading-6 text-amber-900">
                The building service is not available yet.
                Your backend team can connect
                <span className="font-bold">
                  {" "}
                  GET /api/buildings
                </span>{" "}
                and this page will automatically load
                registered buildings.
              </p>
            </div>

          </div>
        )}

        {/* CONTENT */}

        <div className="mt-8">

          {loading ? (
            <LoadingState />
          ) : buildings.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

              {buildings.map((building) => (
                <BuildingCard
                  key={building.id}
                  building={building}
                />
              ))}

              {/* ADD BUILDING CARD */}

              <Link
                href="/buildings/new"
                className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center transition hover:border-slate-400 hover:bg-slate-50"
              >

                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500">
                  +
                </div>

                <div className="mt-4 text-sm font-black text-slate-900">
                  Register another building
                </div>

                <div className="mt-1 max-w-[220px] text-xs leading-5 text-slate-400">
                  Add a new building and upload its floor
                  plans.
                </div>

              </Link>

            </div>
          )}

        </div>

      </div>

    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* BUILDING CARD                                                              */
/* -------------------------------------------------------------------------- */

function BuildingCard({
  building,
}: {
  building: Building;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/* CARD HEADER */}

      <div className="border-b border-slate-100 p-5">

        <div className="flex items-start justify-between gap-4">

          <div className="min-w-0">

            <div className="truncate text-lg font-black text-slate-900">
              {building.name}
            </div>

            <div className="mt-1 truncate text-xs text-slate-400">
              {building.address}
            </div>

          </div>

          <StatusBadge status={building.status} />

        </div>

      </div>

      {/* DETAILS */}

      <div className="grid grid-cols-2 gap-px border-b border-slate-100 bg-slate-100">

        <BuildingMetric
          value={String(building.floors)}
          label="Floors"
        />

        <BuildingMetric
          value={String(building.normalOccupancy)}
          label="Occupancy"
        />

      </div>

      {/* FOOTER */}

      <div className="flex items-center justify-between p-4">

        <div className="text-[10px] font-semibold text-slate-400">
          {building.updatedAt
            ? `Updated ${formatDate(building.updatedAt)}`
            : "No recent update"}
        </div>

        <Link
          href={`/buildings/${building.id}`}
          className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
        >
          Open
        </Link>

      </div>

    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* EMPTY STATE                                                                */
/* -------------------------------------------------------------------------- */

function EmptyState() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">

      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
        🏢
      </div>

      <h2 className="mt-5 text-xl font-black text-slate-900">
        No buildings registered yet
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Register your building once. Its floor plans,
        exits, rooms and accessibility information can
        then be used during an emergency.
      </p>

      <Link
        href="/buildings/new"
        className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-xs font-bold text-white transition hover:bg-slate-800"
      >
        Register your first building
      </Link>

    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* LOADING                                                                    */
/* -------------------------------------------------------------------------- */

function LoadingState() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-[260px] animate-pulse rounded-2xl border border-slate-200 bg-white"
        />
      ))}

    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* METRIC                                                                     */
/* -------------------------------------------------------------------------- */

function BuildingMetric({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="bg-white p-4">

      <div className="text-xl font-black text-slate-900">
        {value}
      </div>

      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </div>

    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* STATUS                                                                     */
/* -------------------------------------------------------------------------- */

function StatusBadge({
  status,
}: {
  status?: Building["status"];
}) {
  if (status === "processing") {
    return (
      <div className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700">
        Processing
      </div>
    );
  }

  if (status === "needs_review") {
    return (
      <div className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-red-700">
        Review needed
      </div>
    );
  }

  return (
    <div className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
      Ready
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* DATE                                                                       */
/* -------------------------------------------------------------------------- */

function formatDate(date: string) {
  try {
    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  } catch {
    return date;
  }
}