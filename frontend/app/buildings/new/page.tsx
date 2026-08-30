"use client";

import {
  ChangeEvent,
  FormEvent,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildBuildingGeometry } from "@/lib/building-to-floor-geometry";
import type { BuildingDefinition } from "@/lib/buildings-registry";
import type { Occupant } from "@/lib/schema";

const BACKEND_HTTP =
  process.env.NEXT_PUBLIC_BACKEND_HTTP ||
  "http://127.0.0.1:8000";

const API_V1 =
  `${BACKEND_HTTP}/api/v1`;

type BuildingType =
  | "office"
  | "school"
  | "hospital"
  | "mall"
  | "residential"
  | "campus"
  | "other";

interface FloorUpload {
  floor: number;
  file: File | null;
}

export default function NewBuildingPage() {
  const router = useRouter();

  const [buildingName, setBuildingName] =
    useState("");

  const [address, setAddress] =
    useState("");

  const [buildingType, setBuildingType] =
    useState<BuildingType>("office");

  const [floors, setFloors] =
    useState("1");

  const [normalOccupancy, setNormalOccupancy] =
    useState("");

  const [wheelchairAccessible, setWheelchairAccessible] =
    useState(true);

  const [accessibleExits, setAccessibleExits] =
    useState(true);

  const [elevatorAvailable, setElevatorAvailable] =
    useState(false);

  const [assemblyArea, setAssemblyArea] =
    useState("");

  const [floorUploads, setFloorUploads] =
    useState<FloorUpload[]>([
      {
        floor: 1,
        file: null,
      },
    ]);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  function handleFloorCountChange(
    value: string
  ) {
    const count = Math.max(
      1,
      Math.min(100, Number(value) || 1)
    );

    setFloors(String(count));

    setFloorUploads((current) => {
      const updated: FloorUpload[] = [];

      for (let i = 1; i <= count; i++) {
        const existing = current.find(
          (item) => item.floor === i
        );

        updated.push(
          existing || {
            floor: i,
            file: null,
          }
        );
      }

      return updated;
    });
  }

  function handleFloorFile(
    floor: number,
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0] || null;

    setFloorUploads((current) =>
      current.map((item) =>
        item.floor === floor
          ? {
              ...item,
              file,
            }
          : item
      )
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!buildingName.trim()) {
      setError("Please enter a building name.");
      return;
    }

    if (!address.trim()) {
      setError("Please enter the building address.");
      return;
    }

    if (!normalOccupancy) {
      setError(
        "Please enter the normal occupancy."
      );
      return;
    }

    const missingFloorPlans =
      floorUploads.filter(
        (item) => !item.file
      );

    if (missingFloorPlans.length > 0) {
      setError(
        `Please upload a floor plan for Floor ${missingFloorPlans[0].floor}.`
      );
      return;
    }

    setSubmitting(true);

    try {
      const token =
        localStorage.getItem(
          "s33_access_token"
        ) ||
        localStorage.getItem(
          "s33-token"
        );

      if (!token) {
        router.push("/login");
        return;
      }

      /*
       * STEP 1
       *
       * Analyze every uploaded floor plan with the S33 AI parser.
       *
       * Backend:
       *
       * POST /api/v1/building/ai-parse
       */

      const allNodes: Array<{
        id: string;
        x: number;
        y: number;
        floor: number;
        type: string;
        label: string;
      }> = [];

      const allEdges: Array<{
        from: string;
        to: string;
        weight: number;
        type: string;
        accessible: boolean;
      }> = [];

      for (const floor of floorUploads) {
        if (!floor.file) {
          continue;
        }

        const aiFormData = new FormData();
        aiFormData.append("file", floor.file);

        const aiResponse = await fetch(
          `${API_V1}/building/ai-parse`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: aiFormData,
          }
        );

        let aiData: any;

        try {
          aiData = await aiResponse.json();
        } catch {
          throw new Error(
            `AI analysis returned an invalid response for Floor ${floor.floor}.`
          );
        }

        if (aiResponse.status === 401) {
          localStorage.removeItem("s33_access_token");
          localStorage.removeItem("s33-token");
          router.push("/login");
          return;
        }
        if (!aiResponse.ok || !aiData?.success) {
          throw new Error(
            aiData?.detail ||
              aiData?.message ||
              `AI analysis failed for Floor ${floor.floor}.`
          );
        }

        const nodeIdMap = new Map<string, string>();

        const parsedBuilding =
          aiData?.building || {};

        const parsedNodes =
          Array.isArray(parsedBuilding.nodes)
            ? parsedBuilding.nodes
            : [];

        const parsedEdges =
          Array.isArray(parsedBuilding.edges)
            ? parsedBuilding.edges
            : [];

        const floorNodes = parsedNodes.map(
          (node: any, index: number) => {
            const originalId = String(
              node.id || `AI_N${index + 1}`
            );

            const normalizedId =
              `F${floor.floor}_${originalId}`;

            nodeIdMap.set(
              originalId,
              normalizedId
            );

            return {
              id: normalizedId,
              x: Number(node.x) || 0,
              y: Number(node.y) || 0,
              floor: floor.floor,
              type: String(
                node.type || "room"
              ),
              label: String(
                node.label || originalId
              ),
            };
          }
        );

       const floorEdges: Array<{
  from: string;
  to: string;
  weight: number;
  type: string;
  accessible: boolean;
}> = [];

for (const edge of parsedEdges) {
  const originalFrom =
    typeof edge?.from === "string"
      ? edge.from.trim()
      : "";

  const originalTo =
    typeof edge?.to === "string"
      ? edge.to.trim()
      : "";

  // Ignore malformed edges.
  if (!originalFrom || !originalTo) {
    continue;
  }

  const normalizedFrom =
    nodeIdMap.get(originalFrom);

  const normalizedTo =
    nodeIdMap.get(originalTo);

  // Ignore edges whose endpoints were
  // not detected as nodes on this floor.
  if (!normalizedFrom || !normalizedTo) {
    continue;
  }

  floorEdges.push({
    from: normalizedFrom,
    to: normalizedTo,
    weight:
      Number(edge.weight) || 1,
    type: String(
      edge.type || "corridor"
    ),
    accessible:
      Boolean(edge.accessible),
  });
}

allNodes.push(...floorNodes);
allEdges.push(...floorEdges);

        allNodes.push(...floorNodes);
        allEdges.push(...floorEdges);
      }

      if (allNodes.length === 0) {
        throw new Error(
          "AI analysis completed but no building nodes were detected."
        );
      }

      /*
       * STEP 2
       *
       * Send the complete AI-generated BuildingDataset to the
       * deterministic S33 backend validator/activator.
       *
       * Backend:
       *
       * POST /api/v1/building
       */

      const dataset = {
        building: {
          id: "AI_BUILDING_1",
          name:
            buildingName.trim() ||
            "AI Generated Building",
          floors: Number(floors),
          address: address.trim(),
          buildingType,
          normalOccupancy:
            Number(normalOccupancy),
          accessibility: {
            wheelchairAccessible,
            accessibleExits,
            elevatorAvailable,
          },
          assemblyArea:
            assemblyArea.trim(),
        },
        nodes: allNodes,
        edges: allEdges,
      };

      const buildingResponse =
        await fetch(
          `${API_V1}/building`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${token}`,
            },
            body: JSON.stringify(dataset),
          }
        );

      let buildingData: any;

      try {
        buildingData =
          await buildingResponse.json();
      } catch {
        throw new Error(
          "Building API returned an invalid response."
        );
      }

      if (
        !buildingResponse.ok ||
        buildingData?.success === false
      ) {
        throw new Error(
          buildingData?.detail ||
            buildingData?.message ||
            "The AI-generated building failed backend validation."
        );
      }

      /*
       * STEP 3
       *
       * Convert the same AI graph into the frontend's existing
       * FloorGeometry/BuildingDefinition format.
       */

      const generatedBuilding =
        buildBuildingGeometry({
          nodes: allNodes,
          edges: allEdges,
        });

      const occupantsByFloor:
        Record<number, Occupant[]> = {};

      const requestedOccupancy =
        Math.max(
          1,
          Number(normalOccupancy) || 1
        );

      const roomBuckets = generatedBuilding.floors
        .flatMap((floor) =>
          floor.rooms
            .filter(
              (room) =>
                room.type !== "corridor"
            )
            .map((room) => ({
              floor: floor.floorLevel,
              room,
            }))
        );

      const roomCount = roomBuckets.length;
      const baseCount =
        roomCount > 0
          ? Math.floor(
              requestedOccupancy /
                roomCount
            )
          : 0;
      const remainder =
        roomCount > 0
          ? requestedOccupancy %
            roomCount
          : 0;

      for (
        const floor of
          generatedBuilding.floors
      ) {
        occupantsByFloor[
          floor.floorLevel
        ] = [];
      }

      roomBuckets.forEach(
        ({ floor, room }, index) => {
          const countForRoom =
            baseCount +
            (index < remainder ? 1 : 0);

          const center =
            room.polygon.reduce(
              (acc, point) => ({
                x:
                  acc.x + point.x,
                y:
                  acc.y + point.y,
              }),
              { x: 0, y: 0 }
            );

          const pointCount =
            room.polygon.length || 1;

          for (
            let occupantIndex = 0;
            occupantIndex <
            countForRoom;
            occupantIndex++
          ) {
            occupantsByFloor[
              floor
            ].push({
              id:
                `AI_OCCUPANT_${floor}_${index + 1}_${occupantIndex + 1}`,
              roomId: room.id,
              position: {
                x:
                  center.x /
                  pointCount,
                y:
                  center.y /
                  pointCount,
              },
              profile: "normal",
              floorLevel: floor,
            });
          }
        }
      );

      const customBuilding:
        BuildingDefinition = {
        id: 4,
        name:
          buildingName.trim() ||
          "AI Generated Building",
        floors:
          generatedBuilding.floors,
        occupantsByFloor,
        isCustom: true,
      };

      localStorage.setItem(
        "s33-custom-building",
        JSON.stringify(
          customBuilding
        )
      );

      localStorage.setItem(
        "s33-custom-building-meta",
        JSON.stringify({
          backendBuildingId:
            buildingData?.building_id ||
            null,
          name:
            customBuilding.name,
          address,
          buildingType,
          normalOccupancy:
            requestedOccupancy,
          accessibility: {
            wheelchairAccessible,
            accessibleExits,
            elevatorAvailable,
          },
          assemblyArea,
        })
      );

      // Store the raw building dataset so it can be
      // re-activated on the backend after a server restart.
      localStorage.setItem(
        "s33-custom-building-dataset",
        JSON.stringify(dataset)
      );

      setSuccess(
        "Building registered and floor plans analyzed successfully."
      );

      setTimeout(() => {
        router.push(
          "/dashboard"
        );
      }, 700);
    } catch (err) {
      console.error(err);

      /*
       * During frontend development the backend may
       * not exist yet. We show a useful message rather
       * than pretending the building was saved.
       */

      setError(
        "Unable to register the building. Please make sure the backend is running and the building API is available."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-zinc-900">

      {/* HEADER */}

      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/95 px-6 shadow-sm backdrop-blur-xl">

        <Link
          href="/admin"
          className="block"
        >
          <div className="text-sm font-black tracking-tight text-zinc-950">
            S33 EVACUATION DIGITAL TWIN
          </div>

          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600">
            Building Registration
          </div>
        </Link>

        <Link
          href="/admin"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
        >
          Back to buildings
        </Link>

      </header>

      {/* CONTENT */}

      <div className="mx-auto max-w-5xl p-6 lg:p-8">

        <div>

          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">
            Building setup
          </div>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950">
            Register your building
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Save your building information once so
            emergency teams can access an up-to-date
            digital twin when an incident occurs.
          </p>

        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6"
        >

          {/* BASIC DETAILS */}

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">

            <SectionHeading
              number="01"
              title="Building details"
              description="Basic information about the building."
            />

            <div className="mt-6 grid gap-5 md:grid-cols-2">

              <Field
                label="Building name"
                required
              >
                <input
                  value={buildingName}
                  onChange={(event) =>
                    setBuildingName(
                      event.target.value
                    )
                  }
                  placeholder="e.g. ABC Corporate Tower"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm font-semibold text-zinc-900 outline-none transition placeholder:text-zinc-400 hover:bg-white hover:border-zinc-300 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </Field>

              <Field
                label="Building type"
                required
              >
                <select
                  value={buildingType}
                  onChange={(event) =>
                    setBuildingType(
                      event.target.value as BuildingType
                    )
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm font-semibold text-zinc-900 outline-none transition placeholder:text-zinc-400 hover:bg-white hover:border-zinc-300 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                >
                  <option value="office">
                    Office
                  </option>

                  <option value="school">
                    School / College
                  </option>

                  <option value="hospital">
                    Hospital
                  </option>

                  <option value="mall">
                    Mall / Commercial
                  </option>

                  <option value="residential">
                    Residential
                  </option>

                  <option value="campus">
                    Campus
                  </option>

                  <option value="other">
                    Other
                  </option>
                </select>
              </Field>

              <div className="md:col-span-2">
                <Field
                  label="Full address"
                  required
                >
                  <textarea
                    value={address}
                    onChange={(event) =>
                      setAddress(
                        event.target.value
                      )
                    }
                    rows={3}
                    placeholder="Building address"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm font-semibold text-zinc-900 outline-none transition placeholder:text-zinc-400 hover:bg-white hover:border-zinc-300 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 resize-none"
                  />
                </Field>
              </div>

              <Field
                label="Number of floors"
                required
              >
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={floors}
                  onChange={(event) =>
                    handleFloorCountChange(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm font-semibold text-zinc-900 outline-none transition placeholder:text-zinc-400 hover:bg-white hover:border-zinc-300 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </Field>

              <Field
                label="Normal occupancy"
                required
              >
                <input
                  type="number"
                  min="1"
                  value={normalOccupancy}
                  onChange={(event) =>
                    setNormalOccupancy(
                      event.target.value
                    )
                  }
                  placeholder="e.g. 250"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm font-semibold text-zinc-900 outline-none transition placeholder:text-zinc-400 hover:bg-white hover:border-zinc-300 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </Field>

            </div>

          </section>

          {/* ACCESSIBILITY */}

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">

            <SectionHeading
              number="02"
              title="Accessibility & emergency information"
              description="Information that helps the routing system plan for diverse mobility needs."
            />

            <div className="mt-6 grid gap-3 md:grid-cols-3">

              <Toggle
                label="Wheelchair accessible"
                description="Accessible paths exist"
                checked={
                  wheelchairAccessible
                }
                onChange={
                  setWheelchairAccessible
                }
              />

              <Toggle
                label="Accessible exits"
                description="At least one accessible exit"
                checked={
                  accessibleExits
                }
                onChange={
                  setAccessibleExits
                }
              />

              <Toggle
                label="Elevator available"
                description="Building has an elevator"
                checked={
                  elevatorAvailable
                }
                onChange={
                  setElevatorAvailable
                }
              />

            </div>

            <div className="mt-5">

              <Field
                label="Emergency assembly area"
              >
                <input
                  value={assemblyArea}
                  onChange={(event) =>
                    setAssemblyArea(
                      event.target.value
                    )
                  }
                  placeholder="e.g. Parking area near Gate 2"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm font-semibold text-zinc-900 outline-none transition placeholder:text-zinc-400 hover:bg-white hover:border-zinc-300 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </Field>

            </div>

          </section>

          {/* FLOOR PLANS */}

<section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">

  <SectionHeading
    number="03"
    title="Floor plans"
    description="Upload a separate floor plan for every level of the building."
  />

  <div className="mt-6">

    <div className="mb-4 flex items-center justify-between">

      <div>
        <div className="text-xs font-black text-slate-900">
          Building floors
        </div>

        <div className="mt-1 text-[10px] text-slate-400">
          {floorUploads.length} floor
          {floorUploads.length !== 1 ? "s" : ""} added
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          const nextFloor =
            floorUploads.length + 1;

          setFloorUploads([
            ...floorUploads,
            {
              floor: nextFloor,
              file: null,
            },
          ]);

          setFloors(String(nextFloor));
        }}
        className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white transition hover:bg-emerald-700"
      >
        + Add Floor
      </button>

    </div>

    <div className="space-y-3">

      {floorUploads.map((floor) => (
        <div
          key={floor.floor}
          className="flex items-center gap-3"
        >

          <div className="flex-1">
            <FloorUploadCard
              floor={floor.floor}
              file={floor.file}
              onChange={handleFloorFile}
            />
          </div>

          {floorUploads.length > 1 && (
            <button
              type="button"
              onClick={() => {
                const updated =
                  floorUploads
                    .filter(
                      (item) =>
                        item.floor !==
                        floor.floor
                    )
                    .map(
                      (item, index) => ({
                        ...item,
                        floor:
                          index + 1,
                      })
                    );

                setFloorUploads(updated);
                setFloors(
                  String(updated.length)
                );
              }}
              className="rounded-lg border border-red-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-red-500 hover:bg-red-50"
            >
              Remove
            </button>
          )}

        </div>
      ))}

    </div>

    <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">

      <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
        AI processing
      </div>

      <p className="mt-1 text-sm leading-6 text-emerald-950">
        Each floor plan will be processed separately.
        The system can identify rooms, doors, exits,
        stairwells, corridors and other geometry for
        that floor.
      </p>

    </div>

  </div>

</section>

          {/* ERRORS */}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">

              <div className="text-xs font-black uppercase tracking-wider text-red-600">
                Registration failed
              </div>

              <p className="mt-1 text-sm font-semibold text-red-900">
                {error}
              </p>

            </div>
          )}

          {/* SUCCESS */}

          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">

              <div className="text-xs font-black uppercase tracking-wider text-emerald-600">
                Success
              </div>

              <p className="mt-1 text-sm font-semibold text-emerald-900">
                {success}
              </p>

            </div>
          )}

          {/* ACTIONS */}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

            <Link
              href="/admin"
              className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-center text-xs font-bold text-zinc-700 transition hover:bg-zinc-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-emerald-600 px-6 py-3 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Registering building..."
                : "Register building"}
            </button>

          </div>

        </form>

      </div>

    </main>
  );
}


/* -------------------------------------------------------------------------- */
/* SECTION HEADING                                                            */
/* -------------------------------------------------------------------------- */

function SectionHeading({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">

      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-[10px] font-black text-white">
        {number}
      </div>

      <div>
        <h2 className="text-lg font-black text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-xs leading-5 text-slate-400">
          {description}
        </p>
      </div>

    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* FIELD                                                                      */
/* -------------------------------------------------------------------------- */

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      <div className="mt-2">
        {children}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* TOGGLE                                                                     */
/* -------------------------------------------------------------------------- */

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        onChange(!checked)
      }
      className={`rounded-xl border p-4 text-left transition ${
        checked
          ? "border-teal-300 bg-teal-50"
          : "border-slate-200 bg-white"
      }`}
    >

      <div className="flex items-center justify-between">

        <div>
          <div className="text-xs font-bold text-slate-900">
            {label}
          </div>

          <div className="mt-1 text-[10px] leading-4 text-slate-400">
            {description}
          </div>
        </div>

        <div
          className={`flex h-5 w-9 items-center rounded-full p-0.5 ${
            checked
              ? "bg-teal-500"
              : "bg-slate-300"
          }`}
        >
          <div
            className={`h-4 w-4 rounded-full bg-white transition ${
              checked
                ? "translate-x-4"
                : "translate-x-0"
            }`}
          />
        </div>

      </div>

    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* FLOOR UPLOAD                                                               */
/* -------------------------------------------------------------------------- */

function FloorUploadCard({
  floor,
  file,
  onChange,
}: {
  floor: number;
  file: File | null;
  onChange: (
    floor: number,
    event: ChangeEvent<HTMLInputElement>
  ) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100">

      <div className="flex items-center gap-4">

        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-xs font-black text-slate-900 shadow-sm">
          F{floor}
        </div>

        <div>

          <div className="text-sm font-bold text-slate-900">
            Floor {floor}
          </div>

          <div className="mt-1 text-[10px] text-slate-400">
            {file
              ? file.name
              : "Upload floor plan image"}
          </div>

        </div>

      </div>

      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600">
        {file
          ? "Change"
          : "Upload"}
      </div>

      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) =>
          onChange(floor, event)
        }
      />

    </label>
  );
}