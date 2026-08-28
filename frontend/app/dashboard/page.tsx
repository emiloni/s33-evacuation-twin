"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "@/components/dashboard/DashboardShell";
import SimulationPanel from "@/components/dashboard/SimulationPanel";
import StatusPanel from "@/components/dashboard/StatusPanel";
import DigitalTwinCanvas3D from "@/components/three/DigitalTwinCanvas3D";
import {
  CUSTOM_BUILDING_ID,
  getBuildingDefinition,
  getAllOccupantsForBuilding,
  type BuildingDefinition,
} from "@/lib/buildings-registry";
import { calculateAllEvacuationRoutes } from "@/lib/evacuation-engine";
import {
  adaptBuilding,
  adaptApiResponse,
  type ApiBuilding,
  type ApiBuildingResponse,
  type AdaptedBuilding,
} from "@/lib/building-3d-adapter";

import type {
  FloorGeometry,
  Hazard,
  Occupant,
  Point,
  RouteSegment,
  MobilityProfile,
} from "@/lib/schema";
const BACKEND_HTTP =
  process.env.NEXT_PUBLIC_BACKEND_HTTP ||
  "http://127.0.0.1:8000";

const CUSTOM_BUILDING_STORAGE_KEY =
  "s33-custom-building";

type SimulationHistoryItem = {
  id: number;
  building_name: string;
  start_node: string;
  destination: string | null;
  mobility: string;
  scenario: string;
  route: unknown[] | string[];
  hazards: unknown[];
  confidence: string | null;
  mode: string | null;
  created_at: string;
};

// Picks a reasonable fire-origin point for a GENERIC (uploaded/custom)
// floor: the centroid of a non-corridor room if one exists, else the first
// room. Demo Buildings 1/2/3 never use this — they keep their exact
// existing hardcoded fire coordinates below, unchanged.
function getGenericFirePosition(
  floor: FloorGeometry
): Point {
  const candidateRoom =
    floor.rooms.find(
      (r) => r.type !== "corridor"
    ) || floor.rooms[0];

  if (
    !candidateRoom ||
    candidateRoom.polygon.length === 0
  ) {
    return { x: 500, y: 300 };
  }

  const xs = candidateRoom.polygon.map(
    (p) => p.x
  );
  const ys = candidateRoom.polygon.map(
    (p) => p.y
  );

  return {
    x:
      (Math.min(...xs) + Math.max(...xs)) /
      2,
    y:
      (Math.min(...ys) + Math.max(...ys)) /
      2,
  };
}

export default function DashboardPage() {
  const router = useRouter();

  const [selectedBuilding, setSelectedBuilding] =
    useState<number>(1);

  const [selectedFloor, setSelectedFloor] =
    useState<number>(1);

  const [hazards, setHazards] =
    useState<Hazard[]>([]);

  const [simulationRunning, setSimulationRunning] =
    useState<boolean>(false);

  const [customBuilding, setCustomBuilding] =
    useState<BuildingDefinition | null>(null);

  const [savingSimulation, setSavingSimulation] =
    useState(false);

  const [simulationHistory, setSimulationHistory] =
    useState<SimulationHistoryItem[]>([]);

  const [message, setMessage] =
    useState("");

  const timerRef = useRef<NodeJS.Timeout | null>(null);
const [backendBuilding, setBackendBuilding] =
  useState<ApiBuilding | null>(null);
const [adaptedBuilding, setAdaptedBuilding] =
  useState<AdaptedBuilding | null>(null);
  // Load a building detected/analyzed from an uploaded architectural plan
  // (written to localStorage by the landing-page upload flow), if present.
  // Existing Building 1/2/3 demo scenarios are always available regardless.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(
        CUSTOM_BUILDING_STORAGE_KEY
      );

      if (raw) {
        const parsed = JSON.parse(raw);

        if (
          parsed &&
          Array.isArray(parsed.floors) &&
          parsed.floors.length > 0
        ) {
          setCustomBuilding(
            parsed as BuildingDefinition
          );
        }
      }
    } catch {
      // Malformed/missing custom building data — silently fall back to demo buildings.
    }
  }, []);

  // Helper to resolve floor geometry for specified building & floor level
  const getFloorGeometry = useCallback(
    (
      bldg: number,
      floorNum: number,
      currentHazards: Hazard[] = []
    ): FloorGeometry => {
      const def = getBuildingDefinition(
        bldg,
        customBuilding
      );

      const base =
        def.floors.find(
          (f) => f.floorLevel === floorNum
        ) || def.floors[0];

      const floorLevelHazards =
        currentHazards.filter(
          (h) =>
            (h as any).floorLevel === floorNum ||
            !("floorLevel" in h)
        );

      return {
        ...base,
        hazards: floorLevelHazards,
      };
    },
    [customBuilding]
  );

  // Helper to resolve all occupants across building floors
  const getAllOccupants = useCallback(
    (bldg: number): Occupant[] =>
      getAllOccupantsForBuilding(
        getBuildingDefinition(
          bldg,
          customBuilding
        )
      ),
    [customBuilding]
  );

  // Helper to resolve all building floors for vertical 3D rendering
  const getAllBuildingFloors = useCallback(
    (bldg: number): FloorGeometry[] =>
      getBuildingDefinition(
        bldg,
        customBuilding
      ).floors,
    [customBuilding]
  );
const loadBackendBuilding = useCallback(
  async () => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("s33_access_token") ||
          localStorage.getItem("s33-token")
        : null;

    console.log(
      "BUILDING TOKEN EXISTS:",
      Boolean(token)
    );

    if (!token) {
      console.error(
        "NO S33 ACCESS TOKEN FOUND"
      );

      setMessage(
        "No login token found. Please log in again."
      );

      return null;
    }

    try {
      const url =
        `${BACKEND_HTTP}/api/v1/building`;

      console.log(
        "GET BUILDING URL:",
        url
      );

      const response =
        await fetch(
          url,
          {
            cache: "no-store",
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      console.log(
        "GET BUILDING STATUS:",
        response.status
      );

      const rawText =
        await response.text();
console.log("AI PARSE STATUS:", response.status);
console.log("AI PARSE RAW RESPONSE:", rawText);
      console.log(
        "GET BUILDING RAW RESPONSE:",
        rawText
      );

      if (!response.ok) {
        throw new Error(
          `Building API failed (${response.status}): ${rawText}`
        );
      }

      let data: ApiBuilding;

      try {
        data =
          JSON.parse(
            rawText
          ) as ApiBuilding;
      } catch {
        throw new Error(
          "Building API returned invalid JSON."
        );
        
      }

      console.log(
        "BACKEND BUILDING RECEIVED:",
        data
      );

      console.log(
        "BACKEND NODE COUNT:",
        data?.nodes?.length
      );

      console.log(
        "BACKEND EDGE COUNT:",
        data?.edges?.length
      );

      if (
        !Array.isArray(
          data?.nodes
        ) ||
        !Array.isArray(
          data?.edges
        )
      ) {
        throw new Error(
          "Building API response does not contain nodes and edges."
        );
      }

      setBackendBuilding(
        data
      );

      // Adapt building data for 3D rendering
      const adapted = adaptBuilding(data);
      setAdaptedBuilding(adapted);

      return data;
    } catch (error) {
      console.error(
        "LOAD BUILDING ERROR:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load AI building."
      );

      return null;
    }
  },
  [router]
);

  // Helper to calculate evacuation routes for the currently selected floor
  // CRITICAL RULE: HAZARD FLOOR = SOURCE FLOOR (NOT SELECTED FLOOR)
  const getRoutesForSelectedFloor = useCallback(
    (
      bldg: number,
      floorNum: number,
      currentHazards: Hazard[] = []
    ): RouteSegment[] => {
      const def = getBuildingDefinition(
        bldg,
        customBuilding
      );

      const activeHazard = currentHazards.find(
        (h) => "floorLevel" in h
      );

      const hazardFloorLevel = activeHazard
        ? (activeHazard as any).floorLevel
        : null;

      const sourceFloor =
        hazardFloorLevel !== null &&
        hazardFloorLevel !== undefined
          ? floorNum > hazardFloorLevel
            ? floorNum
            : hazardFloorLevel
          : floorNum;

      const floorOccupants =
        def.occupantsByFloor[sourceFloor] || [];

      const floorGeo =
        def.floors.find(
          (f) => f.floorLevel === sourceFloor
        ) || def.floors[0];

      const floorWithHazards = {
        ...floorGeo,
        hazards: currentHazards,
      };

      // Only the custom (uploaded) building passes its real Ground Floor so
      // descent terminates at an actually-detected exit. Demo Buildings
      // 1/2/3 omit this and keep their exact existing behavior.
      const groundFloor = def.isCustom
        ? def.floors.find(
            (f) => f.floorLevel === 1
          )
        : undefined;

      const calculatedRoutes =
        calculateAllEvacuationRoutes(
          floorOccupants,
          floorWithHazards,
          groundFloor
        );

      if (
        hazardFloorLevel !== null &&
        floorNum > hazardFloorLevel
      ) {
        return calculatedRoutes.map(
          (r) => ({
            ...r,
            isRerouted: false,
          })
        );
      }

      return calculatedRoutes;
    },
    [customBuilding]
  );

  
  const [floor, setFloor] =
    useState<FloorGeometry>(() =>
      getFloorGeometry(1, 1, [])
    );

  const [occupants, setOccupants] =
    useState<Occupant[]>(() =>
      getAllOccupants(1)
    );

  const [routes, setRoutes] =
    useState<RouteSegment[]>(() =>
      getRoutesForSelectedFloor(1, 1, [])
    );

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);const buildBackendFloorsFromGraph =
    useCallback(
      (
        data: ApiBuilding
      ): FloorGeometry[] => {
        // Use the adapter to convert backend data to FloorGeometry
        const adapted = adaptBuilding(data);
        setAdaptedBuilding(adapted);
        return adapted.floors;
      },
      []
    );
    const generateBackendRoute = useCallback(
  async (
    startNodeId: string,
    mobility: MobilityProfile = "normal",
    destination: string | null = null,
    sensors: unknown[] = []
  ): Promise<RouteSegment[]> => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("s33_access_token") ||
          localStorage.getItem("s33-token")
        : null;

    if (!token) {
      router.replace("/login");
      return [];
    }

    try {
      const response = await fetch(
        `${BACKEND_HTTP}/api/v1/evacuation/route`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${token}`,
          },
          body: JSON.stringify({
            start: startNodeId,
            destination,
            mobility,
            sensors,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.detail ||
            result?.message ||
            "Backend route calculation failed."
        );
      }

      const routeIds: string[] =
        Array.isArray(result?.route)
          ? result.route
          : [];

      if (routeIds.length < 2) {
        setMessage(
          result?.message ||
            "No evacuation route could be calculated."
        );
        return [];
      }

      if (!backendBuilding) {
        return [];
      }

      const nodeMap = new Map(
        backendBuilding.nodes.map(
          (node) => [
            node.id,
            node,
          ]
        )
      );

      const path = routeIds
        .map((nodeId) => {
          const node =
            nodeMap.get(nodeId);

          if (!node) {
            return null;
          }

          // Use adapted positions if available, otherwise fallback to simple transform
          const adaptedPos =
            adaptedBuilding?.positions?.get(nodeId);

          return {
            x: adaptedPos?.x ?? (150 + (Number(node.x) || 0) * 1.45),
            y: adaptedPos?.y ?? (80 + (Number(node.y) || 0) * 1.15),
            level: Number(node.floor) || 1,
          };
        })
        .filter(
          (
            point
          ): point is {
            x: number;
            y: number;
            level: number;
          } => point !== null
        );

      if (path.length < 2) {
        setMessage(
          "Backend returned an invalid evacuation route."
        );
        return [];
      }

      return [
        {
          occupantId: startNodeId,
          path,
          eta: Math.max(
            1,
            Number(result?.distance) ||
              path.length - 1
          ),
          exitId:
            result?.destination ||
            routeIds[
              routeIds.length - 1
            ],
          confidence:
            result?.confidence ||
            "medium",
          basis:
            result?.mode ===
            "conservative"
              ? "static_fallback"
              : "live_sensors",
          isRerouted: false,
        },
      ];
    } catch (error) {
      console.error(
        "Backend route error:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to calculate evacuation route."
      );

      return [];
    }
  },
  [backendBuilding, adaptedBuilding, router]
);
const createBackendOccupants =
  useCallback(
    (
      data: ApiBuilding,
      _geometry: FloorGeometry[]
    ): Occupant[] => {
      // Use the adapter to create occupants
      // If we have adapted data, use it; otherwise adapt on the fly
      if (adaptedBuilding) {
        return adaptedBuilding.occupants;
      }
      const adapted = adaptBuilding(data);
      setAdaptedBuilding(adapted);
      return adapted.occupants;
    },
    [adaptedBuilding]
  );
  // Handle Building Scenario Selection
// Handle Building Scenario Selection
const handleSelectBuilding = useCallback(
  async (bldg: number) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setSelectedBuilding(bldg);
    setSelectedFloor(1);
    setHazards([]);
    setSimulationRunning(false);
    setMessage("");

    // Existing demo buildings keep their current frontend logic.
    if (bldg !== CUSTOM_BUILDING_ID) {
      const newFloor = getFloorGeometry(
        bldg,
        1,
        []
      );

      const newOccupants =
        getAllOccupants(bldg);

      setFloor(newFloor);
      setOccupants(newOccupants);

      setRoutes(
        getRoutesForSelectedFloor(
          bldg,
          1,
          []
        )
      );

      return;
    }

    // Uploaded / AI building uses the backend graph.
    try {
      const data =
        backendBuilding ||
        (await loadBackendBuilding());

      if (!data) {
        setMessage(
          "Unable to load the uploaded building."
        );
        return;
      }

      const geometry =
        buildBackendFloorsFromGraph(data);

      const firstFloor =
        geometry.find(
          (f) => f.floorLevel === 1
        ) || geometry[0];

      if (!firstFloor) {
        setMessage(
          "The uploaded building has no valid floor data."
        );
        return;
      }

      setFloor(firstFloor);

      const backendOccupants =
        createBackendOccupants(
          data,
          geometry
        );

      setOccupants(
        backendOccupants
      );
      console.log(
  "AI OCCUPANTS:",
  backendOccupants.length,
  backendOccupants
);

      // Generate normal routes for ALL occupants
      const normalRoutes =
        await Promise.all(
          backendOccupants.map(
            (occupant) =>
              generateBackendRoute(
                occupant.roomId,
                occupant.profile,
                null,
                []
              )
          )
        );

      // Remap occupantId from roomId to actual occupant.id
      const remappedRoutes = normalRoutes.flat().map((route) => {
        const matchedOccupant = backendOccupants.find(o => o.roomId === route.occupantId);
        return {
          ...route,
          occupantId: matchedOccupant?.id || route.occupantId,
        };
      });

      setRoutes(remappedRoutes);

      return;
    } catch (error) {
      console.error(
        "Custom building selection error:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load uploaded building."
      );

      return;
    }
  },
  [
    backendBuilding,
    loadBackendBuilding,
    buildBackendFloorsFromGraph,
    createBackendOccupants,
    getFloorGeometry,
    getAllOccupants,
    getRoutesForSelectedFloor,
    generateBackendRoute,
  ]
);

  // Handle Floor Level Switch
  const handleSelectFloor = useCallback(
    (floorNum: number) => {
      setSelectedFloor(floorNum);

      const newFloor = getFloorGeometry(
        selectedBuilding,
        floorNum,
        hazards
      );

      setFloor(newFloor);

      setRoutes(
        getRoutesForSelectedFloor(
          selectedBuilding,
          floorNum,
          hazards
        )
      );
    },
    [
      selectedBuilding,
      hazards,
      getFloorGeometry,
      getRoutesForSelectedFloor,
    ]
  );

  // Toggle Evacuation Simulation
  // Toggle Evacuation Simulation
const handleSimulation = useCallback(() => {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  // =========================================================
  // START SIMULATION
  // =========================================================
  if (!simulationRunning) {
    setSimulationRunning(true);
    setHazards([]);
    setMessage("");

    // -------------------------------------------------------
    // BUILDINGS 1 / 2 / 3
    // Keep the existing frontend simulation unchanged.
    // -------------------------------------------------------
    if (
      selectedBuilding !==
      CUSTOM_BUILDING_ID
    ) {
      const cleanFloor =
        getFloorGeometry(
          selectedBuilding,
          selectedFloor,
          []
        );

      setFloor(cleanFloor);

      const normalRoutes =
        getRoutesForSelectedFloor(
          selectedBuilding,
          selectedFloor,
          []
        );

      setRoutes(normalRoutes);

      timerRef.current =
        setTimeout(() => {
          let fireFloorLevel = 1;
          let randomPos = {
            x: 680,
            y: 330,
          };

          if (selectedBuilding === 3) {
            fireFloorLevel =
              Math.floor(
                Math.random() * 2
              ) + 1;

            randomPos =
              fireFloorLevel === 2
                ? {
                    x: 380,
                    y: 330,
                  }
                : {
                    x: 680,
                    y: 330,
                  };
          } else if (
            selectedBuilding === 2
          ) {
            fireFloorLevel =
              Math.floor(
                Math.random() * 3
              ) + 1;

            randomPos =
              fireFloorLevel === 3
                ? {
                    x: 380,
                    y: 330,
                  }
                : {
                    x: 680,
                    y: 330,
                  };
          } else {
            randomPos = {
              x: 680,
              y: 330,
            };
          }

          const autoFire: Hazard = {
            id:
              "hazard-fire-auto",
            type: "fire",
            position: randomPos,
            severity: "high",
          };

          (
            autoFire as any
          ).floorLevel =
            fireFloorLevel;

          const activeHazards = [
            autoFire,
          ];

          setHazards(
            activeHazards
          );

          setSelectedFloor(
            fireFloorLevel
          );

          const updatedFloor =
            getFloorGeometry(
              selectedBuilding,
              fireFloorLevel,
              activeHazards
            );

          setFloor(
            updatedFloor
          );

          const reroutedPaths =
            getRoutesForSelectedFloor(
              selectedBuilding,
              fireFloorLevel,
              activeHazards
            );

          setRoutes(
            reroutedPaths
          );
        }, 2000);

      return;
    }

    // -------------------------------------------------------
    // BUILDING 4 / AI BUILDING
    // Use backend graph + backend routing.
    // -------------------------------------------------------

    void (async () => {
      try {
        const data =
          backendBuilding ||
          (await loadBackendBuilding());

        if (!data) {
          setMessage(
            "Unable to load the uploaded building."
          );

          setSimulationRunning(
            false
          );

          return;
        }

        const backendFloors =
          buildBackendFloorsFromGraph(
            data
          );

        if (
          backendFloors.length ===
          0
        ) {
          throw new Error(
            "The uploaded building contains no valid floors."
          );
        }

        // ---------------------------------------------------
        // NORMAL ROUTES BEFORE FIRE
        // Route each generated occupant through the backend.
        // ---------------------------------------------------

        const normalRoutes =
          await Promise.all(
            occupants.map(
              (occupant) =>
                generateBackendRoute(
                  occupant.roomId,
                  occupant.profile,
                  null,
                  []
                )
            )
          );

        // Remap occupantId from roomId to actual occupant.id
        // so the Three.js scene engine can match routes to occupants
        const remappedNormalRoutes = normalRoutes.flat().map((route) => {
          const matchedOccupant = occupants.find(o => o.roomId === route.occupantId);
          return {
            ...route,
            occupantId: matchedOccupant?.id || route.occupantId,
          };
        });

        setRoutes(
          remappedNormalRoutes
        );

        // ---------------------------------------------------
        // FIRE ACTIVATION AFTER 2 SECONDS
        // ---------------------------------------------------

        timerRef.current =
          setTimeout(() => {
            void (async () => {
              try {
                const floorLevels =
                  Array.from(
                    new Set(
                      data.nodes.map(
                        (node) =>
                          node.floor
                      )
                    )
                  );

                if (
                  floorLevels.length ===
                  0
                ) {
                  return;
                }

                const fireFloorLevel =
                  floorLevels[
                    Math.floor(
                      Math.random() *
                        floorLevels.length
                    )
                  ];

                // Pick a real ROOM node on that
                // floor so the backend knows exactly
                // where the hazard is.
                const roomCandidates =
                  data.nodes.filter(
                    (node) =>
                      node.floor ===
                        fireFloorLevel &&
                      (
                        node.type ===
                          "room" ||
                        node.type ===
                          "lobby"
                      )
                  );

                const fireNode =
                  roomCandidates[
                    Math.floor(
                      Math.random() *
                        roomCandidates.length
                    )
                  ] ||
                  data.nodes.find(
                    (node) =>
                      node.floor ===
                      fireFloorLevel &&
                      node.type !==
                        "exit"
                  );

                if (!fireNode) {
                  throw new Error(
                    "Unable to find a valid fire location."
                  );
                }

                // Use adapted positions if available
                const adaptedFirePos =
                  adaptedBuilding?.positions?.get(
                    fireNode.id
                  );
                const firePosition = {
                  x:
                    adaptedFirePos?.x ??
                    (150 + Number(fireNode.x) * 1.45),
                  y:
                    adaptedFirePos?.y ??
                    (80 + Number(fireNode.y) * 1.15),
                };

                const autoFire: Hazard = {
                  id:
                    "hazard-fire-auto",
                  type: "fire",
                  position:
                    firePosition,
                  severity: "high",
                };

                (
                  autoFire as any
                ).floorLevel =
                  fireFloorLevel;

                const activeHazards = [
                  autoFire,
                ];

                setHazards(
                  activeHazards
                );

                setSelectedFloor(
                  fireFloorLevel
                );

                const updatedFloor =
                  backendFloors.find(
                    (floor) =>
                      floor.floorLevel ===
                      fireFloorLevel
                  ) ||
                  backendFloors[0];

                if (updatedFloor) {
                  setFloor(
                    {
                      ...updatedFloor,
                      hazards:
                        activeHazards,
                    }
                  );
                }

                // ------------------------------------------------
                // Recalculate every occupant's route through
                // the backend using fire/smoke sensor data.
                // ------------------------------------------------

                const fireSensors = [
                  {
                    id: "T1",
                    type:
                      "temperature",
                    location:
                      fireNode.id,
                    value: 85,
                    available: true,
                  },
                  {
                    id: "S1",
                    type: "smoke",
                    location:
                      fireNode.id,
                    value: 90,
                    available: true,
                  },
                ];

                const rerouted =
                  await Promise.all(
                    occupants.map(
                      (occupant) =>
                        generateBackendRoute(
                          occupant.roomId,
                          occupant.profile,
                          null,
                          fireSensors
                        )
                    )
                  );

                // Remap occupantId from roomId to actual occupant.id
                const remappedReroutes = rerouted.flat().map((route) => {
                  const matchedOccupant = occupants.find(o => o.roomId === route.occupantId);
                  return {
                    ...route,
                    occupantId: matchedOccupant?.id || route.occupantId,
                  };
                });

                setRoutes(
                  remappedReroutes
                );
              } catch (error) {
                console.error(
                  "Custom building simulation error:",
                  error
                );

                setMessage(
                  error instanceof Error
                    ? error.message
                    : "Unable to run the uploaded-building simulation."
                );
              }
            })();
          }, 2000);
      } catch (error) {
        console.error(
          "Custom building simulation setup error:",
          error
        );

        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to start simulation."
        );

        setSimulationRunning(
          false
        );
      }
    })();

    return;
  }

  // =========================================================
  // STOP SIMULATION
  // =========================================================

  setSimulationRunning(
    false
  );

  setHazards([]);
  setMessage("");

  // Uploaded / AI building returns to backend-generated
  // normal routes.
  if (
    selectedBuilding ===
    CUSTOM_BUILDING_ID
  ) {
    void (async () => {
      try {
        const data =
          backendBuilding ||
          (await loadBackendBuilding());

        if (!data) {
          setRoutes([]);
          return;
        }

        const normalRoutes =
          await Promise.all(
            occupants.map(
              (occupant) =>
                generateBackendRoute(
                  occupant.roomId,
                  occupant.profile,
                  null,
                  []
                )
            )
          );

        const remappedRoutes = normalRoutes.flat().map((route) => {
          const matchedOccupant = occupants.find(o => o.roomId === route.occupantId);
          return {
            ...route,
            occupantId: matchedOccupant?.id || route.occupantId,
          };
        });

        setRoutes(
          remappedRoutes
        );

        const geometry =
          buildBackendFloorsFromGraph(
            data
          );

        const current =
          geometry.find(
            (floor) =>
              floor.floorLevel ===
              selectedFloor
          ) ||
          geometry[0];

        if (current) {
          setFloor(current);
        }
      } catch (error) {
        console.error(
          "Custom building stop error:",
          error
        );

        setRoutes([]);
      }
    })();

    return;
  }

  // Existing demo buildings.
  const cleanFloor =
    getFloorGeometry(
      selectedBuilding,
      selectedFloor,
      []
    );

  setFloor(cleanFloor);

  setRoutes(
    getRoutesForSelectedFloor(
      selectedBuilding,
      selectedFloor,
      []
    )
  );
}, [
  simulationRunning,
  selectedBuilding,
  selectedFloor,
  customBuilding,
  backendBuilding,
  occupants,
  getFloorGeometry,
  getRoutesForSelectedFloor,
  generateBackendRoute,
  loadBackendBuilding,
  buildBackendFloorsFromGraph,
]);
  // Toggle Emergency Fire Hazard Manually
  const handleToggleHazard = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setHazards((prevHazards) => {
      let nextHazards: Hazard[] = [];

      if (prevHazards.length === 0) {
        let firePos = {
          x: 680,
          y: 330,
        };

        if (
          selectedBuilding === CUSTOM_BUILDING_ID &&
          customBuilding
        ) {
          const targetFloor =
            customBuilding.floors.find(
              (f) =>
                f.floorLevel === selectedFloor
            );

          if (targetFloor) {
            firePos = getGenericFirePosition(
              targetFloor
            );
          }
        }

        nextHazards = [
          {
            id: "hazard-fire-manual",
            type: "fire",
            position: firePos,
            severity: "high",
          },
        ];
      }

      if (nextHazards.length > 0) {
        (nextHazards[0] as any).floorLevel =
          selectedBuilding > 1
            ? selectedFloor
            : 1;
      }

      const updatedFloor =
        getFloorGeometry(
          selectedBuilding,
          selectedFloor,
          nextHazards
        );

      setFloor(updatedFloor);

      const calculatedRoutes =
        getRoutesForSelectedFloor(
          selectedBuilding,
          selectedFloor,
          nextHazards
        );

      setRoutes(calculatedRoutes);
      setSimulationRunning(true);

      return nextHazards;
    });
  }, [
    selectedBuilding,
    selectedFloor,
    customBuilding,
    getFloorGeometry,
    getRoutesForSelectedFloor,
  ]);

  // Load saved simulations for the authenticated user.
  const loadSimulationHistory = useCallback(
    async () => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("s33_access_token") ||
            localStorage.getItem("s33-token")
          : null;

      if (!token) {
        return;
      }

      try {
        const response = await fetch(
          `${BACKEND_HTTP}/api/v1/simulations`,
          {
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            "Unable to load simulation history."
          );
        }

        const data = await response.json();

        setSimulationHistory(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (error) {
        console.error(
          "Simulation history error:",
          error
        );
      }
    }, []
  );

  // Save the currently displayed 3D simulation to the backend.
  const saveCurrentSimulation = useCallback(
    async () => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("s33_access_token") ||
            localStorage.getItem("s33-token")
          : null;

      if (!token) {
        router.replace("/login");
        return;
      }

      if (!routes.length) {
        setMessage(
          "Generate an evacuation route before saving."
        );
        return;
      }

      try {
        setSavingSimulation(true);
        setMessage("");

        const routePayload = routes.flatMap(
          (segment) =>
            segment.path.map(
              (point) =>
                `${point.x},${point.y}`
            )
        );

        const firstRoute = routes[0];

        const buildingDef =
          getBuildingDefinition(
            selectedBuilding,
            customBuilding
          );

        const startNode =
          firstRoute?.occupantId ||
          `building-${selectedBuilding}-floor-${selectedFloor}`;

        const destination =
          firstRoute?.exitId || null;

        const response = await fetch(
          `${BACKEND_HTTP}/api/v1/simulations`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${token}`,
            },
            body: JSON.stringify({
              building_name:
                buildingDef.name,
              start_node: startNode,
              destination,
              mobility: "normal",
              scenario:
                hazards.length > 0
                  ? "fire"
                  : "normal",
              route: routePayload,
              hazards,
              confidence: "high",
              mode: "local_demo",
            }),
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail ||
              data.message ||
              "Unable to save simulation."
          );
        }

        setMessage(
          "Simulation saved successfully."
        );

        await loadSimulationHistory();
      } catch (error) {
        console.error(
          "Save simulation error:",
          error
        );

        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to save simulation."
        );
      } finally {
        setSavingSimulation(false);
      }
    },
    [
      routes,
      hazards,
      selectedBuilding,
      selectedFloor,
      customBuilding,
      loadSimulationHistory,
      router,
    ]
  );

  // Load saved simulations after the dashboard mounts.
  useEffect(() => {
    void loadSimulationHistory();
  }, [loadSimulationHistory]);

  const activeBuildingDef =
    getBuildingDefinition(
      selectedBuilding,
      customBuilding
    );

  const buildingName =
    activeBuildingDef.name;

  const availableFloors =
    activeBuildingDef.floors.map(
      (f) => f.floorLevel
    );

  const allBuildingFloors =
    getAllBuildingFloors(
      selectedBuilding
    );

  return (
    <DashboardShell
      selectedFloor={selectedFloor}
      onSelectFloor={handleSelectFloor}
      simulationRunning={simulationRunning}
      hazardsCount={hazards.length}
      buildingName={buildingName}
      floors={availableFloors}
    >
      <div className="grid min-h-[calc(100vh-6.5rem)] grid-cols-1 lg:grid-cols-[290px_minmax(0,1fr)_310px]">
        {/* LEFT OPERATIONAL CONTROL PANEL */}
        <SimulationPanel
          hazards={hazards}
          occupants={occupants}
          simulationRunning={simulationRunning}
          selectedBuilding={selectedBuilding}
          hasCustomBuilding={Boolean(
            customBuilding
          )}
          customBuildingFloorCount={
            customBuilding?.floors.length
          }
          onSelectBuilding={
            handleSelectBuilding
          }
          onToggleSimulation={
            handleSimulation
          }
          onToggleHazard={
            handleToggleHazard
          }
        />

        {/* CENTER 3D DIGITAL TWIN WORKSPACE */}
        <main className="min-w-0 p-4 flex flex-col bg-[#F8FAFC]">
          <div className="flex-1 min-h-[700px] flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-xs overflow-hidden relative">
            <DigitalTwinCanvas3D
              geometry={floor}
              occupants={occupants}
              hazards={hazards}
              routes={routes}
              allFloors={allBuildingFloors}
              simulationRunning={simulationRunning}
              className="h-full w-full flex-1"
            />
          </div>
        </main>

        {/* RIGHT OPERATIONAL INTELLIGENCE PANEL */}
        <StatusPanel
          occupants={occupants}
          routes={routes}
          hazards={hazards}
          simulationRunning={simulationRunning}
        />
      </div>

      {/* SAVE CURRENT SIMULATION */}
      {routes.length > 0 && (
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-zinc-900">
                Save Current Simulation
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Save this evacuation decision to your simulation history.
              </p>
            </div>

            <button
              type="button"
              onClick={saveCurrentSimulation}
              disabled={savingSimulation}
              className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {savingSimulation
                ? "Saving..."
                : "Save Simulation"}
            </button>
          </div>

          {message && (
            <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600">
              {message}
            </div>
          )}
        </section>
      )}

      {/* SIMULATION HISTORY */}
      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-zinc-900">
              Simulation History
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Your previously saved evacuation simulations.
            </p>
          </div>

          <div className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-black text-zinc-600">
            {simulationHistory.length} saved
          </div>
        </div>

        {simulationHistory.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center">
            <div className="text-sm font-bold text-zinc-600">
              No saved simulations yet
            </div>

            <div className="mt-1 text-xs text-zinc-400">
              Run an evacuation simulation and click
              "Save Simulation" to keep it here.
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {simulationHistory.map(
              (simulation) => (
                <div
                  key={simulation.id}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-black text-zinc-900">
                        {simulation.building_name ||
                          "S33 Building"}
                      </div>

                      <div className="mt-1 text-xs text-zinc-500">
                        {simulation.start_node}
                        {" → "}
                        {simulation.destination ||
                          "AUTO"}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase text-emerald-700">
                        {simulation.scenario}
                      </span>

                      <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase text-blue-700">
                        {simulation.mobility}
                      </span>

                      {simulation.confidence && (
                        <span className="rounded-full bg-zinc-200 px-3 py-1 text-[10px] font-black uppercase text-zinc-600">
                          {simulation.confidence}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-zinc-400">
                      {simulation.created_at
                        ? new Date(
                            simulation.created_at
                          ).toLocaleString()
                        : "Recently saved"}
                    </div>

                    <div className="text-xs font-bold text-zinc-500">
                      {Array.isArray(
                        simulation.route
                      )
                        ? `${simulation.route.length} route nodes`
                        : "Route saved"}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
