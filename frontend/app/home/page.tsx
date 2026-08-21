"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const uploadRef = useRef<HTMLDivElement>(null);

  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    userType: "",
    buildingName: "",
    buildingType: "",
    floors: "1",
    occupants: "",
    accessibilityNeeds: [] as string[],
    knownHazards: [] as string[],
  });

  const updateForm = (
    field: string,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const toggleArrayValue = (
    field: "accessibilityNeeds" | "knownHazards",
    value: string
  ) => {
    setForm((current) => {
      const existing = current[field];

      return {
        ...current,
        [field]: existing.includes(value)
          ? existing.filter((item) => item !== value)
          : [...existing, value],
      };
    });
  };

  const openUpload = () => {
    setShowUpload(true);

    setTimeout(() => {
      uploadRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }, 50);
  };

  const handleSubmit = () => {
    if (!file) {
      alert("Please upload a floor plan.");
      return;
    }

    if (!form.userType) {
      alert("Please select what kind of user you are.");
      return;
    }

    if (!form.buildingType) {
      alert("Please select the building type.");
      return;
    }

    if (!form.occupants) {
      alert("Please enter the approximate occupancy.");
      return;
    }

    // Temporary frontend storage.
    // Later this will be sent to our backend.
    const projectData = {
      ...form,
      fileName: file.name,
      fileType: file.type,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(
      "s33-project",
      JSON.stringify(projectData)
    );

    router.push("/");
  };

  return (
    <main className="min-h-screen bg-[#F5F8F7] text-slate-950">

      {/* =====================================================
          BACKGROUND GRID
      ====================================================== */}

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

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(16,185,129,0.15),transparent_30%),radial-gradient(circle_at_80%_40%,rgba(16,185,129,0.10),transparent_30%)]" />
      </div>

      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="relative z-10 mx-auto max-w-[1280px] px-6 pb-20 pt-10">

        {/* Badge */}

        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Advisory Evacuation Intelligence
        </div>

        {/* Hero grid */}

        <div className="mt-12 grid items-center gap-16 lg:grid-cols-[1fr_0.9fr]">

          {/* LEFT */}

          <div>

            <h1 className="max-w-[650px] text-6xl font-black leading-[0.98] tracking-[-0.045em] md:text-7xl">

              Turn a floor
              <br />

              plan into a
              <br />

              <span className="text-emerald-600">
                live
                <br />
                evacuation
                <br />
                map.
              </span>

            </h1>

            <p className="mt-8 max-w-[650px] text-lg leading-9 text-slate-500">
              Upload an existing building floor plan. S33
              converts it into a structured digital twin that
              can understand rooms, corridors, exits, hazards
              and mobility constraints — then generate
              dynamic evacuation recommendations.
            </p>

            {/* Buttons */}

            <div className="mt-10 flex flex-wrap gap-3">

              <button
                onClick={openUpload}
                className="rounded-xl bg-slate-950 px-7 py-4 text-sm font-black text-white shadow-xl shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Upload floor plan
              </button>

              <button
                onClick={() => router.push("/")}
                className="rounded-xl border border-slate-300 bg-white px-7 py-4 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Live Evacuation →
              </button>

              <button
                onClick={() => router.push("/")}
                className="rounded-xl border border-slate-300 bg-white px-7 py-4 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Building Administration →
              </button>

            </div>

            {/* Feature points */}

            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-xs font-bold text-slate-400">

              <span className="flex items-center gap-2">
                <span className="text-emerald-600">✓</span>
                AI-assisted geometry extraction
              </span>

              <span className="flex items-center gap-2">
                <span className="text-emerald-600">✓</span>
                Accessibility-aware routing
              </span>

              <span className="flex items-center gap-2">
                <span className="text-emerald-600">✓</span>
                Fail-safe advisory system
              </span>

            </div>

          </div>

          {/* =================================================
              DIGITAL TWIN PREVIEW
          ================================================== */}

          <div className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-[0_30px_80px_rgba(15,23,42,0.10)]">

            <div className="rounded-[24px] border border-slate-100 bg-white p-5">

              <div className="flex items-center justify-between border-b border-slate-100 pb-5">

                <div>

                  <div className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
                    Digital Twin Preview
                  </div>

                  <div className="mt-1 text-sm font-black text-slate-900">
                    Building A · Floor 01
                  </div>

                </div>

                <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-[10px] font-black text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  LIVE MODEL
                </div>

              </div>

              {/* Mini floor plan */}

              <div
                className="relative mt-5 h-[440px] overflow-hidden rounded-2xl"
                style={{
                  backgroundImage: `
                    linear-gradient(#DCE6E1 1px, transparent 1px),
                    linear-gradient(90deg, #DCE6E1 1px, transparent 1px)
                  `,
                  backgroundSize: "28px 28px",
                }}
              >

                <div className="absolute left-[13%] top-[15%] h-[29%] w-[29%] border-[5px] border-slate-800 bg-[#F5F0D8]">

                  <div className="flex h-full items-center justify-center text-[10px] font-black tracking-wider text-slate-600">
                    OFFICE
                  </div>

                </div>

                <div className="absolute left-[42%] top-[15%] h-[29%] w-[38%] border-[5px] border-slate-800 bg-[#B9DDC7]">

                  <div className="flex h-full items-center justify-center text-[10px] font-black tracking-wider text-emerald-800">
                    SAFE CORRIDOR
                  </div>

                </div>

                <div className="absolute left-[13%] top-[44%] h-[32%] w-[29%] border-[5px] border-slate-800 bg-[#F5F0D8]">

                  <div className="flex h-full items-center justify-center text-[10px] font-black tracking-wider text-slate-600">
                    MEETING ROOM
                  </div>

                </div>

                <div className="absolute left-[42%] top-[44%] h-[32%] w-[22%] border-[5px] border-slate-800 bg-[#F5F0D8]">

                  <div className="flex h-full items-center justify-center text-[10px] font-black tracking-wider text-slate-600">
                    LOBBY
                  </div>

                </div>

                <div className="absolute left-[64%] top-[44%] h-[32%] w-[16%] border-[5px] border-slate-800 bg-[#B9DDC7]">

                  <div className="flex h-full items-center justify-center text-[9px] font-black text-emerald-800">
                    EXIT
                  </div>

                </div>

                {/* Route */}

                <svg
                  className="absolute inset-0 h-full w-full"
                  viewBox="0 0 500 440"
                >

                  <polyline
                    points="180,340 180,280 240,280 240,210 330,210 390,150"
                    fill="none"
                    stroke="#0E8C7F"
                    strokeWidth="6"
                    strokeDasharray="12 8"
                  />

                  <circle
                    cx="180"
                    cy="340"
                    r="10"
                    fill="#0E8C7F"
                  />

                  <circle
                    cx="390"
                    cy="150"
                    r="12"
                    fill="#D62F2F"
                  />

                </svg>

                {/* Route badge */}

                <div className="absolute right-4 top-4 rounded-xl bg-white px-4 py-3 shadow-lg">

                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Recommended route
                  </div>

                  <div className="mt-1 text-lg font-black text-emerald-700">
                    42 seconds
                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>
      </section>

      {/* =====================================================
          UPLOAD / BUILDING SETUP
      ====================================================== */}

      {showUpload && (
        <section
          ref={uploadRef}
          className="relative z-20 border-t border-slate-200 bg-white px-6 py-20"
        >

          <div className="mx-auto max-w-[1000px]">

            <div className="text-center">

              <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">
                Create your digital twin
              </div>

              <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
                Tell us about your building
              </h2>

              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-500">
                Upload your floor plan and provide some context.
                This information helps S33 generate better
                evacuation recommendations.
              </p>

            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">

              {/* =================================================
                  USER TYPE
              ================================================== */}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 lg:col-span-2">

                <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                  What kind of user are you?
                </label>

                <p className="mt-1 text-xs text-slate-400">
                  This determines the information and controls
                  shown in your evacuation console.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                  {[
                    {
                      value: "safety_officer",
                      title: "Safety Officer",
                      description: "Emergency planning & response",
                    },
                    {
                      value: "facility_manager",
                      title: "Facility Manager",
                      description: "Building operations",
                    },
                    {
                      value: "business_owner",
                      title: "Business Owner",
                      description: "Protect employees & visitors",
                    },
                    {
                      value: "emergency_planner",
                      title: "Emergency Planner",
                      description: "Scenario simulation",
                    },
                  ].map((option) => (

                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        updateForm(
                          "userType",
                          option.value
                        )
                      }
                      className={`rounded-xl border p-4 text-left transition ${
                        form.userType === option.value
                          ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >

                      <div className="text-sm font-black text-slate-900">
                        {option.title}
                      </div>

                      <div className="mt-1 text-xs leading-5 text-slate-500">
                        {option.description}
                      </div>

                    </button>

                  ))}

                </div>
              </div>

              {/* =================================================
                  BUILDING INFORMATION
              ================================================== */}

              <div className="rounded-2xl border border-slate-200 bg-white p-6">

                <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Building name
                </label>

                <input
                  value={form.buildingName}
                  onChange={(e) =>
                    updateForm(
                      "buildingName",
                      e.target.value
                    )
                  }
                  placeholder="e.g. ABC Corporate Office"
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
                />

              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">

                <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Building type
                </label>

                <select
                  value={form.buildingType}
                  onChange={(e) =>
                    updateForm(
                      "buildingType",
                      e.target.value
                    )
                  }
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                >

                  <option value="">
                    Select building type
                  </option>

                  <option value="office">
                    Office
                  </option>

                  <option value="school">
                    School / College
                  </option>

                  <option value="hospital">
                    Hospital / Healthcare
                  </option>

                  <option value="mall">
                    Shopping Mall
                  </option>

                  <option value="hotel">
                    Hotel
                  </option>

                  <option value="residential">
                    Residential
                  </option>

                  <option value="industrial">
                    Industrial
                  </option>

                  <option value="public">
                    Public Building
                  </option>

                  <option value="other">
                    Other
                  </option>

                </select>

              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">

                <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Number of floors
                </label>

                <input
                  type="number"
                  min="1"
                  value={form.floors}
                  onChange={(e) =>
                    updateForm(
                      "floors",
                      e.target.value
                    )
                  }
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                />

              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">

                <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Approximate occupants
                </label>

                <input
                  type="number"
                  min="1"
                  value={form.occupants}
                  onChange={(e) =>
                    updateForm(
                      "occupants",
                      e.target.value
                    )
                  }
                  placeholder="e.g. 150"
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                />

              </div>

              {/* =================================================
                  ACCESSIBILITY
              ================================================== */}

              <div className="rounded-2xl border border-slate-200 bg-white p-6">

                <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Accessibility considerations
                </label>

                <p className="mt-1 text-xs text-slate-400">
                  Select groups commonly present in the building.
                </p>

                <div className="mt-4 space-y-2">

                  {[
                    ["wheelchair", "Wheelchair users"],
                    ["elderly", "Elderly occupants"],
                    ["children", "Children"],
                    ["temporary_injury", "Temporary injuries"],
                  ].map(([value, label]) => (

                    <label
                      key={value}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 p-3 hover:bg-slate-50"
                    >

                      <input
                        type="checkbox"
                        checked={form.accessibilityNeeds.includes(
                          value
                        )}
                        onChange={() =>
                          toggleArrayValue(
                            "accessibilityNeeds",
                            value
                          )
                        }
                        className="h-4 w-4 accent-emerald-600"
                      />

                      <span className="text-sm font-semibold text-slate-700">
                        {label}
                      </span>

                    </label>

                  ))}

                </div>

              </div>

              {/* =================================================
                  HAZARDS
              ================================================== */}

              <div className="rounded-2xl border border-slate-200 bg-white p-6">

                <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Known hazards / restrictions
                </label>

                <p className="mt-1 text-xs text-slate-400">
                  These can later be updated during simulation.
                </p>

                <div className="mt-4 space-y-2">

                  {[
                    ["fire_risk", "Fire risk areas"],
                    ["flood_risk", "Flood-prone areas"],
                    ["restricted_exit", "Restricted exits"],
                    ["construction", "Construction / blocked areas"],
                  ].map(([value, label]) => (

                    <label
                      key={value}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 p-3 hover:bg-slate-50"
                    >

                      <input
                        type="checkbox"
                        checked={form.knownHazards.includes(
                          value
                        )}
                        onChange={() =>
                          toggleArrayValue(
                            "knownHazards",
                            value
                          )
                        }
                        className="h-4 w-4 accent-emerald-600"
                      />

                      <span className="text-sm font-semibold text-slate-700">
                        {label}
                      </span>

                    </label>

                  ))}

                </div>

              </div>

              {/* =================================================
                  FLOOR PLAN UPLOAD
              ================================================== */}

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 lg:col-span-2">

                <label className="text-xs font-black uppercase tracking-wider text-emerald-700">
                  Upload floor plan
                </label>

                <p className="mt-1 text-xs text-emerald-700/70">
                  PNG, JPG or PDF architectural floor plan.
                </p>

                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">

                  <label className="flex cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">

                    Choose floor plan

                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.pdf"
                      className="hidden"
                      onChange={(e) =>
                        setFile(
                          e.target.files?.[0] ?? null
                        )
                      }
                    />

                  </label>

                  {file && (
                    <div className="rounded-xl bg-white px-4 py-3 text-xs font-bold text-slate-600">
                      ✓ {file.name}
                    </div>
                  )}

                </div>

              </div>

            </div>

            {/* =================================================
                SUBMIT
            ================================================== */}

            <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:flex-row">

              <div>

                <div className="text-sm font-black text-slate-900">
                  Ready to generate your digital twin?
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  S33 will analyse the uploaded plan and
                  create the structured evacuation model.
                </div>

              </div>

              <button
                onClick={handleSubmit}
                className="rounded-xl bg-slate-950 px-7 py-4 text-sm font-black text-white shadow-lg transition hover:bg-slate-800"
              >
                Generate evacuation twin →
              </button>

            </div>

          </div>

        </section>
      )}

    </main>
  );
}