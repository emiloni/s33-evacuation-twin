"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import FloorPlanSVG from "@/components/floorplan/FloorPlanSVG";
import Building3DOverview from "@/components/floorplan/Building3DOverview";
import type { RouteSegment } from "@/lib/schema";
import {
  buildFloorGeometry,
  getFloorNodePoint,
  type ApiBuildingNode,
  type ApiBuildingEdge,
} from "@/lib/building-to-floor-geometry";

type Mobility =
  | "normal"
  | "wheelchair"
  | "temporary_injury"
  | "child"
  | "elderly";

type Scenario =
  | "normal"
  | "fire"
  | "sensor_failure"
  | "exit_closed"
  | "corridor_blocked"
  | "congestion";

type Sensor = {
  id: string;
  type: string;
  location: string;
  value: unknown;
  available: boolean;
};

type BuildingNode = {
  id: string;
  x: number;
  y: number;
  type: string;
  floor: number;
  label: string;
};

type BuildingEdge = {
  from: string;
  to: string;
  weight: number;
  type: string;
  accessible: boolean;
};

type BuildingData = {
  nodes: BuildingNode[];
  edges: BuildingEdge[];
};

type Hazard = {
  type: string;
  location: string;
  severity: string;
};

type RouteResponse = {
  success: boolean;
  route: string[];
  distance: number | null;
  start: string;
  destination: string | null;
  mobility: string;
  hazards: Hazard[];
  blocked_nodes: string[];
  mode: string;
  confidence: string;
  advisory: boolean;
  message: string;
  occupancy?: Record<string, number>;
};

const BACKEND_HTTP =
  "http://127.0.0.1:8000";

const BACKEND_WS =
  "ws://127.0.0.1:8000/ws/evacuation";

export default function Home() {

  const router = useRouter();

  // ----------------------------------------------------------
  // STATE — ALL HOOKS MUST COME BEFORE FUNCTIONS / EFFECTS
  // ----------------------------------------------------------

  const [building, setBuilding] =
    useState<BuildingData | null>(null);

  const [startNode, setStartNode] =
    useState("");

  const [mobility, setMobility] =
    useState<Mobility>("normal");

  const [scenario, setScenario] =
    useState<Scenario>("normal");

  const [selectedFloor, setSelectedFloor] =
    useState(1);

  const [mapView, setMapView] =
    useState<"plan" | "overview">("plan");

  const [route, setRoute] =
    useState<string[]>([]);

  const [hazards, setHazards] =
    useState<Hazard[]>([]);

  const [occupancy, setOccupancy] =
    useState<Record<string, number>>({});

  const [confidence, setConfidence] =
    useState("unknown");

  const [mode, setMode] =
    useState("unknown");

  const [message, setMessage] =
    useState("");

  const [connected, setConnected] =
    useState(false);

  const [buildingLoading, setBuildingLoading] =
    useState(true);

  const [buildingError, setBuildingError] =
    useState("");

  const [uploading, setUploading] =
    useState(false);

  const [uploadMessage, setUploadMessage] =
    useState("");

  const [simulationHistory, setSimulationHistory] =
    useState<any[]>([]);

  const [myBuildings, setMyBuildings] =
    useState<
      {
        id: number;
        name: string;
        created_at: string;
      }[]
    >([]);

  const [currentUser, setCurrentUser] =
    useState<{
      id: number;
      name: string;
      email: string;
    } | null>(null);

  /*
   * ----------------------------------------------------------
   * LOAD BUILDING
   * ----------------------------------------------------------
   */

  async function loadBuilding() {
    try {
      setBuildingLoading(true);
      setBuildingError("");

      const token =
        localStorage.getItem("s33-token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(
        `${BACKEND_HTTP}/api/v1/building`,
        {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to load building."
        );
      }

      const data: BuildingData =
        await response.json();

      setBuilding(data);

      const firstNonExit =
        data.nodes.find(
          (node) =>
            node.type !== "exit"
        );

      if (firstNonExit) {
        setStartNode(firstNonExit.id);
        setSelectedFloor(firstNonExit.floor);
      } else if (data.nodes.length > 0) {
        setStartNode(data.nodes[0].id);
        setSelectedFloor(data.nodes[0].floor);
      } else {
        setStartNode("");
      }

      setRoute([]);
      setHazards([]);
      setOccupancy({});
      setConfidence("unknown");
      setMode("unknown");
      setMessage("");
    } catch (error) {
      console.error(error);

      setBuildingError(
        "Unable to load building from backend."
      );
    } finally {
      setBuildingLoading(false);
    }
  }

  /*
   * ----------------------------------------------------------
   * LOAD MY BUILDINGS
   * ----------------------------------------------------------
   */

  async function loadMyBuildings() {
    const token =
      localStorage.getItem("s33-token");

    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const response = await fetch(
        `${BACKEND_HTTP}/api/v1/buildings`,
        {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          "Unable to load your buildings."
        );
      }

      const data =
        await response.json();

      setMyBuildings(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (error) {
      console.error(
        "My buildings error:",
        error
      );
    }
  }

  /*
   * ----------------------------------------------------------
   * LOAD SIMULATION HISTORY
   * ----------------------------------------------------------
   */

  async function loadSimulationHistory() {
    const token =
      localStorage.getItem("s33-token");

    if (!token) {
      router.replace("/login");
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

      const data =
        await response.json();

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
  }

  /*
   * ----------------------------------------------------------
   * SAVE CURRENT SIMULATION
   * ----------------------------------------------------------
   */

  async function saveCurrentSimulation() {
    const token =
      localStorage.getItem("s33-token");

    if (!token) {
      router.replace("/login");
      return;
    }

    if (!startNode) {
      setMessage(
        "Please select a starting location first."
      );
      return;
    }

    if (!route.length) {
      setMessage(
        "Generate an evacuation route before saving."
      );
      return;
    }

    try {
      const response = await fetch(
        `${BACKEND_HTTP}/api/v1/simulations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            building_name: "S33 Building",
            start_node: startNode,
            destination:
              route[route.length - 1] ||
              null,
            mobility,
            scenario,
            route,
            hazards,
            confidence,
            mode,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Unable to save simulation."
        );
      }

      setMessage(
        "Simulation saved successfully."
      );

      await loadSimulationHistory();
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save simulation."
      );
    }
  }

  /*
   * ----------------------------------------------------------
   * UPLOAD BUILDING
   * ----------------------------------------------------------
   */

  async function handleBuildingUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploading(true);
    setUploadMessage("");

    try {
      const token =
        localStorage.getItem("s33-token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const response = await fetch(
        `${BACKEND_HTTP}/api/v1/building/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            `Building upload failed (${response.status}).`
        );
      }

      setUploadMessage(
        `Loaded ${file.name} successfully.`
      );

      await loadBuilding();
      await loadMyBuildings();
      await loadSimulationHistory();
    } catch (error) {
      console.error(
        "Building upload error:",
        error
      );

      setUploadMessage(
        error instanceof Error
          ? error.message
          : "Upload failed."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  /*
   * ----------------------------------------------------------
   * LOGOUT
   * ----------------------------------------------------------
   */

  function handleLogout() {
    localStorage.removeItem("s33-token");
    localStorage.removeItem("s33-user");
    localStorage.removeItem("s33-authenticated");

    router.replace("/");
  }

  /*
   * ----------------------------------------------------------
   * AUTH / INITIAL LOAD
   * ----------------------------------------------------------
   */

  useEffect(() => {
    const authenticated =
      localStorage.getItem(
        "s33-authenticated"
      );

    if (authenticated !== "true") {
      router.replace("/login");
      return;
    }

    const storedUser =
      localStorage.getItem("s33-user");

    if (storedUser) {
      try {
        setCurrentUser(
          JSON.parse(storedUser)
        );
      } catch {
        localStorage.removeItem(
          "s33-user"
        );
      }
    }

    loadBuilding();
    loadSimulationHistory();
    loadMyBuildings();
  }, [router]);

  /*
   * ----------------------------------------------------------
   * OTHER MEMOIZED VALUES
   * ----------------------------------------------------------
   */

  const floorGeometry = useMemo(() => {
    if (!building) {
      return null;
    }

    return buildFloorGeometry(
      {
        nodes:
          building.nodes as ApiBuildingNode[],
        edges:
          building.edges as ApiBuildingEdge[],
      },
      selectedFloor
    );
  }, [building, selectedFloor]);

  const floors = useMemo(() => {
    if (!building) {
      return [];
    }

    return Array.from(
      new Set(
        building.nodes.map(
          (node) => node.floor
        )
      )
    ).sort(
      (a, b) => a - b
    );
  }, [building]);

  /*
   * ----------------------------------------------------------
   * NODE MAP
   * ----------------------------------------------------------
   */

  const nodeMap = useMemo(() => {
    const map: Record<
      string,
      BuildingNode
    > = {};

    if (!building) {
      return map;
    }

    for (
      const node of building.nodes
    ) {
      map[node.id] = node;
    }

    return map;
  }, [building]);

  /*
   * ----------------------------------------------------------
   * CURRENT FLOOR NODES
   * ----------------------------------------------------------
   */

  const currentFloorNodes =
    useMemo(() => {
      if (!building) {
        return [];
      }

      return building.nodes.filter(
        (node) =>
          node.floor ===
          selectedFloor
      );
    }, [
      building,
      selectedFloor,
    ]);

  /*
   * ----------------------------------------------------------
   * ARCHITECTURAL FLOOR LAYOUT
   * ----------------------------------------------------------
   * Keep the real dataset coordinates, but normalize them into
   * the SVG map area. This makes the displayed route follow the
   * actual building topology instead of using index-based
   * positions.
   */

  const floorLayout = useMemo(() => {
    if (currentFloorNodes.length === 0) {
      return {};
    }

    const xs = currentFloorNodes.map((node) => node.x);
    const ys = currentFloorNodes.map((node) => node.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const rangeX = Math.max(maxX - minX, 1);
    const rangeY = Math.max(maxY - minY, 1);

    const layout: Record<string, { x: number; y: number }> = {};

    for (const node of currentFloorNodes) {
      layout[node.id] = {
        x: 95 + ((node.x - minX) / rangeX) * 680,
        y: 85 + ((node.y - minY) / rangeY) * 320,
      };
    }

    return layout;
  }, [currentFloorNodes]);

  /*
   * ----------------------------------------------------------
   * CURRENT FLOOR EDGES
   * ----------------------------------------------------------
   */

  const currentFloorEdges =
    useMemo(() => {
      if (!building) {
        return [];
      }

      return building.edges.filter(
        (edge) => {
          const from =
            nodeMap[edge.from];

          const to =
            nodeMap[edge.to];

          if (!from || !to) {
            return false;
          }

          return (
            from.floor ===
              selectedFloor &&
            to.floor ===
              selectedFloor
          );
        }
      );
    }, [
      building,
      nodeMap,
      selectedFloor,
    ]);

  /*
   * ----------------------------------------------------------
   * ROUTE NODES ON CURRENT FLOOR
   * ----------------------------------------------------------
   */

  const currentFloorRoute =
    route.filter(
      (nodeId) =>
        nodeMap[nodeId]?.floor ===
        selectedFloor
    );

  /*
   * ----------------------------------------------------------
   * CURRENT FLOOR ROUTE EDGES
   * ----------------------------------------------------------
   */

  const currentFloorRouteEdges =
    useMemo(() => {
      const result: {
        from: BuildingNode;
        to: BuildingNode;
      }[] = [];

      for (
        let i = 0;
        i <
        route.length - 1;
        i++
      ) {
        const from =
          nodeMap[route[i]];

        const to =
          nodeMap[
            route[i + 1]
          ];

        if (!from || !to) {
          continue;
        }

        if (
          from.floor ===
            selectedFloor &&
          to.floor ===
            selectedFloor
        ) {
          result.push({
            from,
            to,
          });
        }
      }

      return result;
    }, [
      route,
      nodeMap,
      selectedFloor,
    ]);

  /*
   * ----------------------------------------------------------
   * HELPERS
   * ----------------------------------------------------------
   */

  function isHazard(
    nodeId: string
  ) {
    return hazards.some(
      (hazard) =>
        hazard.location ===
        nodeId
    );
  }

  function isOnRoute(
    nodeId: string
  ) {
    return route.includes(
      nodeId
    );
  }

  function getNodeHazards(
  nodeId: string
) {
  return hazards.filter(
    (hazard) =>
      hazard.location === nodeId
  );
}

function isNodeBlocked(
  nodeId: string
) {
  return getNodeHazards(
    nodeId
  ).length > 0;
}

  function getOccupancy(
    nodeId: string
  ) {
    return occupancy[nodeId] ?? 0;
  }

  function getOccupancyColor(
    value: number
  ) {
    if (value >= 80) {
      return "#dc2626";
    }

    if (value >= 50) {
      return "#f59e0b";
    }

    return "#16a34a";
  }

  /*
   * ----------------------------------------------------------
   * SCENARIO SENSORS
   * ----------------------------------------------------------
   */

  function buildScenarioSensors(
    selectedScenario: Scenario
  ): Sensor[] {

    if (
      selectedScenario ===
      "fire"
    ) {
      return [
        {
          id: "T1",
          type: "temperature",
          location: "F3_N3",
          value: 85,
          available: true,
        },
        {
          id: "S1",
          type: "smoke",
          location: "F3_N3",
          value: 90,
          available: true,
        },
        {
          id: "O1",
          type: "occupancy",
          location: "F3_N2",
          value: 20,
          available: true,
        },
        {
          id: "D1",
          type: "door",
          location: "F1_EXIT1",
          value: "open",
          available: true,
        },
      ];
    }

    if (
      selectedScenario ===
      "sensor_failure"
    ) {
      return [
        {
          id: "T1",
          type: "temperature",
          location: "F3_N3",
          value: null,
          available: false,
        },
        {
          id: "S1",
          type: "smoke",
          location: "F3_N3",
          value: null,
          available: false,
        },
        {
          id: "O1",
          type: "occupancy",
          location: "F3_N2",
          value: 20,
          available: true,
        },
        {
          id: "D1",
          type: "door",
          location: "F1_EXIT1",
          value: "open",
          available: true,
        },
      ];
    }

    if (
      selectedScenario ===
      "exit_closed"
    ) {
      return [
        {
          id: "T1",
          type: "temperature",
          location: "F3_N3",
          value: 24,
          available: true,
        },
        {
          id: "S1",
          type: "smoke",
          location: "F3_N3",
          value: 5,
          available: true,
        },
        {
          id: "O1",
          type: "occupancy",
          location: "F3_N2",
          value: 20,
          available: true,
        },
        {
          id: "D1",
          type: "door",
          location: "F1_EXIT1",
          value: "closed",
          available: true,
        },
      ];
    }
    if (
      selectedScenario ===
      "corridor_blocked"
    ) {
      return [
        {
          id: "T1",
          type: "temperature",
          location: "F3_N3",
          value: 24,
          available: true,
        },
        {
          id: "S1",
          type: "smoke",
          location: "F3_N3",
          value: 5,
          available: true,
        },
        {
          id: "O1",
          type: "occupancy",
          location: "F3_N2",
          value: 20,
          available: true,
        },
        {
          id: "C1",
          type: "blocked_corridor",
          location: "F3_N2",
          value: "blocked",
          available: true,
        },
        {
          id: "D1",
          type: "door",
          location: "F1_EXIT1",
          value: "open",
          available: true,
        },
      ];
    }
    if (
      selectedScenario ===
      "congestion"
    ) {
      return [
        {
          id: "T1",
          type: "temperature",
          location: "F3_N3",
          value: 24,
          available: true,
        },
        {
          id: "S1",
          type: "smoke",
          location: "F3_N3",
          value: 5,
          available: true,
        },
        {
          id: "O1",
          type: "occupancy",
          location: "F3_N2",
          value: 100,
          available: true,
        },
        {
          id: "D1",
          type: "door",
          location: "F1_EXIT1",
          value: "open",
          available: true,
        },
      ];
    }

    return [
      {
        id: "T1",
        type: "temperature",
        location: "F3_N3",
        value: 24,
        available: true,
      },
      {
        id: "S1",
        type: "smoke",
        location: "F3_N3",
        value: 5,
        available: true,
      },
      {
        id: "O1",
        type: "occupancy",
        location: "F3_N2",
        value: 20,
        available: true,
      },
      {
        id: "D1",
        type: "door",
        location: "F1_EXIT1",
        value: "open",
        available: true,
      },
    ];
  }

  function sendScenarioState(
    socket: WebSocket,
    selectedScenario: Scenario
  ) {
    socket.send(
      JSON.stringify({
        sensors:
          buildScenarioSensors(
            selectedScenario
          ),
      })
    );
  }

  /*
   * ----------------------------------------------------------
   * WEBSOCKET
   * ----------------------------------------------------------
   */

  useEffect(() => {
    if (
      !building ||
      !startNode
    ) {
      return;
    }

    

    const socket =
      new WebSocket(
        `${BACKEND_WS}/${startNode}/AUTO/${mobility}`
      );

    socket.onopen = () => {
      setConnected(true);

      sendScenarioState(
        socket,
        scenario
      );
    };

    socket.onmessage = (
      event
    ) => {
      const messageData =
        JSON.parse(
          event.data
        );

      if (
        messageData.type ===
        "route_update"
      ) {
        const data: RouteResponse =
          messageData.data;

        setRoute(
          data.route || []
        );

        setHazards(
          data.hazards || []
        );

        setOccupancy(
          data.occupancy || {}
          );

        setConfidence(
          data.confidence ||
            "unknown"
        );

        setMode(
          data.mode ||
            "unknown"
        );

        setMessage(
          data.message || ""
        );
      }
    };

    socket.onerror = () => {
  // WebSocket errors are handled by onclose.
  // Avoid logging a noisy browser Event object.
  setConnected(false);
};

    socket.onclose = () => {
      setConnected(false);
    };

    return () => {
      socket.close();
    };

  }, [
    building,
    startNode,
    mobility,
    scenario,
  ]);
const visualRoutes = useMemo<RouteSegment[]>(() => {
  if (!building || route.length < 2) {
    return [];
  }

  const nodeMap = new Map(
    building.nodes.map((node) => [
      node.id,
      node,
    ])
  );

  const selectedFloorNodes = route
    .map((nodeId) =>
      nodeMap.get(nodeId)
    )
    .filter(
      (node): node is NonNullable<typeof node> =>
        Boolean(node)
    )
    .filter(
      (node) =>
        node.floor === selectedFloor
    );

  if (selectedFloorNodes.length < 2) {
    return [];
  }

  const floorNodes = building.nodes.filter(
    (node) => node.floor === selectedFloor
  );

  const floorEdges = building.edges.filter((edge) => {
    const from = nodeMap.get(edge.from);
    const to = nodeMap.get(edge.to);

    return from?.floor === selectedFloor && to?.floor === selectedFloor;
  });

  const path = selectedFloorNodes.map((node) =>
    getFloorNodePoint(node, floorNodes, floorEdges)
  );

  const exitId =
    route[route.length - 1];

  const routeConfidence =
    confidence === "high" ||
    confidence === "medium" ||
    confidence === "low"
      ? confidence
      : "medium";

  return [
    {
      occupantId:
        "evacuation-route",

      path,

      eta: path.length - 1,

      exitId,

      confidence:
        routeConfidence,

      basis:
        confidence === "unknown"
          ? "static_fallback"
          : "live_sensors",
    },
  ];
}, [
  building,
  route,
  selectedFloor,
  confidence,
]);
  /*
   * ----------------------------------------------------------
   * RENDER
   * ----------------------------------------------------------
   */

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">

      <div className="max-w-7xl mx-auto">

        {/* HEADER */}

        <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

          <div>
            <h1 className="text-3xl font-bold">
              S33 Evacuation Digital Twin
            </h1>

            <p className="text-slate-400 mt-2">
              Multi-floor, mobility-aware
              evacuation routing
            </p>
          </div>

          <div className="flex items-center gap-4">
            {currentUser && (
              <div className="text-right">
                <div className="text-sm font-black text-white">
                  Welcome, {currentUser.name}
                </div>
                <div className="text-xs text-slate-400">
                  {currentUser.email}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              Log out
            </button>
          </div>

        </header>

        {/* DATASET */}

        <section className="bg-slate-900 rounded-xl p-6 mb-6">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div>

              <h2 className="text-xl font-semibold">
                Building Dataset
              </h2>

              <p className="text-sm text-slate-400 mt-1">
                Upload a multi-floor S33
                building JSON dataset.
              </p>

            </div>

            <label className="cursor-pointer">

              <span className="inline-block bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-lg font-medium">
                {uploading
                  ? "Uploading..."
                  : "Upload Building JSON"}
              </span>

              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={
                  handleBuildingUpload
                }
                disabled={
                  uploading
                }
              />

            </label>

          </div>

          {uploadMessage && (
            <div className="mt-4 bg-slate-800 rounded-lg p-3 text-sm">
              {uploadMessage}
            </div>
          )}

          {building && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">

              <div className="bg-slate-800 rounded-lg p-3">
                <div className="text-slate-400 text-xs">
                  Nodes
                </div>

                <div className="text-xl font-semibold">
                  {building.nodes.length}
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-3">
                <div className="text-slate-400 text-xs">
                  Edges
                </div>

                <div className="text-xl font-semibold">
                  {building.edges.length}
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-3">
                <div className="text-slate-400 text-xs">
                  Floors
                </div>

                <div className="text-xl font-semibold">
                  {floors.length}
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-3">
                <div className="text-slate-400 text-xs">
                  Exits
                </div>

                <div className="text-xl font-semibold">
                  {
                    building.nodes.filter(
                      (node) =>
                        node.type ===
                        "exit"
                    ).length
                  }
                </div>
              </div>

            </div>
          )}

        </section>

        {buildingLoading && (
          <div className="bg-slate-900 rounded-xl p-8 text-center">
            Loading building...
          </div>
        )}

        {buildingError && (
          <div className="bg-red-950 border border-red-800 rounded-xl p-6">
            {buildingError}
          </div>
        )}

        {building &&
          !buildingLoading && (

          <div className="grid lg:grid-cols-3 gap-6">

            {/* CONTROLS */}

            <section className="bg-slate-900 rounded-xl p-6">

              <h2 className="text-xl font-semibold mb-6">
                Evacuation Control
              </h2>

              <label className="block text-sm text-slate-400 mb-2">
                Start Location
              </label>

              <select
                value={startNode}
                onChange={(event) => {

                  const value =
                    event.target.value;

                  setStartNode(value);

                  const node =
                    nodeMap[value];

                  if (node) {
                    setSelectedFloor(
                      node.floor
                    );
                  }
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 mb-6"
              >
                {building.nodes
                  .filter(
                    (node) =>
                      node.type !==
                      "exit"
                  )
                  .map((node) => (
                    <option
                      key={node.id}
                      value={node.id}
                    >
                      {node.label &&
                      node.label !==
                        node.id
                        ? `${node.id} — ${node.label}`
                        : node.id}
                    </option>
                  ))}
              </select>

              <label className="block text-sm text-slate-400 mb-2">
                Mobility
              </label>

              <select
                value={mobility}
                onChange={(event) =>
                  setMobility(
                    event.target.value as Mobility
                  )
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3"
              >
                <option value="normal">
                  Normal
                </option>

                <option value="wheelchair">
                  Wheelchair
                </option>

                <option value="temporary_injury">
                  Temporary Injury
                </option>

                <option value="child">
                  Child
                </option>

                <option value="elderly">
                  Elderly
                </option>
              </select>

              <label className="block text-sm text-slate-400 mb-2 mt-6">
                Simulation Scenario
              </label>

              <select
                value={scenario}
                onChange={(event) =>
                  setScenario(
                    event.target.value as Scenario
                  )
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3"
              >
                <option value="normal">
                  Normal
                </option>

                <option value="congestion">
                  High Occupancy
                </option>

                <option value="fire">
                  Fire
                </option>

                <option value="sensor_failure">
                  Sensor Failure
                </option>

                <option value="exit_closed">
                  Exit Closed
                </option>

                <option value="corridor_blocked">
                    Corridor Blocked
                  </option>
              </select>

              {/* STATUS */}

              <div className="mt-8 space-y-5">

                <div>
                  <span className="text-sm text-slate-400">
                    Connection
                  </span>

                  <p className="mt-1">
                    {connected ? (
                      <span className="text-green-400 font-semibold">
                        ● Connected
                      </span>
                    ) : (
                      <span className="text-red-400 font-semibold">
                        ● Disconnected
                      </span>
                    )}
                  </p>
                </div>
{mode === "conservative" && (
  <div className="mb-6 rounded-xl border border-amber-500/50 bg-amber-950/40 p-5">
    <div className="flex items-start gap-3">
      <div className="text-2xl">⚠️</div>

      <div>
        <h3 className="text-lg font-bold text-amber-400">
          CONSERVATIVE MODE
        </h3>

        <p className="mt-1 text-sm text-amber-200">
          Safety sensor data is unavailable.
          The calculated evacuation route is
          advisory and should be verified against
          available conditions.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300">
            LOW CONFIDENCE
          </span>

          <span className="rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-300">
            SENSOR FAILURE
          </span>
        </div>
      </div>
    </div>
  </div>
)}
                <div>
                  <span className="text-sm text-slate-400">
                    System Mode
                  </span>

                  <p className="text-green-400 font-semibold mt-1">
                    {mode}
                  </p>
                </div>

                <div>
                  <span className="text-sm text-slate-400">
                    Confidence
                  </span>

                  <p className="text-green-400 font-semibold mt-1">

                  <span
  className={
    confidence === "low"
      ? "font-bold text-amber-400"
      : confidence === "medium"
        ? "font-bold text-yellow-400"
        : "font-bold text-green-400"
  }
>
  {confidence}
</span>



                  </p>
                </div>

                <div>
                  <span className="text-sm text-slate-400">
                    Selected Exit
                  </span>

                  <p className="text-blue-400 font-semibold mt-1">
                    {route.length > 0
                      ? route[
                          route.length - 1
                        ]
                      : "None"}
                  </p>
                </div>

                <div>
                  <span className="text-sm text-slate-400">
                    Total Route
                  </span>

                  <p className="text-sm mt-2 leading-6">
                    {route.length > 0
                      ? route.join(
                          " → "
                        )
                      : "No safe route"}
                  </p>
                </div>

              </div>

              {message && (
                <div className="mt-6 rounded-lg bg-slate-800 p-4 text-sm text-slate-300">
                  {message}
                </div>
              )}

            </section>

            {/* DIGITAL TWIN */}

            <section className="lg:col-span-2 bg-slate-900 rounded-xl p-6">

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">

                <div>

                  <h2 className="text-xl font-semibold">
                    Building Digital Twin
                  </h2>

                  <p className="text-sm text-slate-400 mt-1">
                    Floor {selectedFloor}
                  </p>

                </div>

                {/* FLOOR SELECTOR */}

                <div className="flex gap-2 flex-wrap">

                  {floors.map(
                    (floor) => (
                      <button
                        key={floor}
                        onClick={() =>
                          setSelectedFloor(
                            floor
                          )
                        }
                        className={
                          selectedFloor ===
                          floor
                            ? "bg-blue-600 px-4 py-2 rounded-lg font-semibold"
                            : "bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg"
                        }
                      >
                        Floor {floor}
                      </button>
                    )
                  )}

                </div>

              </div>

              {/* ARCHITECTURAL FLOOR MAP */}
              <div className="mt-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        Building Floor Map
                      </h2>
                      <p className="text-xs text-slate-500">
                        Floor {selectedFloor} • Live digital twin
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-green-50 px-3 py-1 font-semibold text-green-700">● Recommended route</span>
                      <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">● Exit</span>
                      <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700">● Stairs</span>
                      <span className="rounded-full bg-violet-50 px-3 py-1 font-semibold text-violet-700">● Elevator</span>
                      <span className="rounded-full bg-red-50 px-3 py-1 font-semibold text-red-700">● Hazard</span>
                    </div>
                  </div>

                  <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setMapView("plan")}
                      className={mapView === "plan" ? "rounded-md bg-white px-3 py-2 text-slate-900 shadow-sm" : "rounded-md px-3 py-2 text-slate-500 hover:text-slate-800"}
                    >
                      2D floor plan
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapView("overview")}
                      className={mapView === "overview" ? "rounded-md bg-white px-3 py-2 text-slate-900 shadow-sm" : "rounded-md px-3 py-2 text-slate-500 hover:text-slate-800"}
                    >
                      3D overview
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                    {mapView === "overview" && building ? (
                        <Building3DOverview
                          nodes={building.nodes}
                          edges={building.edges}
                          floors={floors}
                          selectedFloor={selectedFloor}
                          route={route}
                          hazards={hazards}
                          onFloorSelect={(floor) => {
                            setSelectedFloor(floor);
                            setMapView("plan");
                          }}
                        />
                      ) : floorGeometry ? (
                        <div className="h-[620px] w-full">
                          <FloorPlanSVG
                              geometry={floorGeometry}
                              routes={visualRoutes}
                            />
                                </div>
                              ) : (
                                <div className="flex h-[620px] items-center justify-center rounded-xl border border-slate-200 bg-white">
                                  <p className="text-sm text-slate-500">
                                    Loading floor plan...
                                  </p>
                                </div>
                              )}
                  </div>

                  <div className="mt-4 flex flex-wrap justify-center gap-5 text-xs text-slate-600">
                    <span><strong className="text-green-700">Green:</strong> recommended route</span>
                    <span><strong className="text-red-700">Red:</strong> hazard / blocked</span>
                    <span><strong className="text-amber-700">Amber:</strong> stairs</span>
                    <span><strong className="text-violet-700">Purple:</strong> elevator</span>
                  </div>
                </div>
              </div>

             </section>
              {/* CROSS-FLOOR ROUTE */}


        {route.length > 0 && (
          <section className="mt-6 bg-slate-900 rounded-xl p-6">

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
              <div>
                <h2 className="text-xl font-semibold">
                  Route Decision
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  NetworkX Dijkstra uses distance, occupancy,
                  hazards and mobility constraints.
                </p>
              </div>

              <div className="text-sm text-slate-300">
                <span className="text-slate-400">
                  Routing mode:
                </span>{" "}
                <span className="text-blue-400 font-semibold">
                  {mode}
                </span>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">

              <div className="bg-slate-800 rounded-lg p-4">
                <div className="text-slate-400 text-xs uppercase tracking-wide">
                  Selected Route
                </div>

                <div className="text-green-400 font-semibold mt-2 break-words leading-6">
                  {route.join(" → ")}
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-4">
                <div className="text-slate-400 text-xs uppercase tracking-wide">
                  Congested Locations
                </div>

                <div className="mt-2 space-y-1">
                  {Object.entries(occupancy).filter(
                    ([, value]) => value >= 50
                  ).length === 0 ? (
                    <span className="text-green-400">
                      No significant congestion
                    </span>
                  ) : (
                    Object.entries(occupancy)
                      .filter(
                        ([, value]) => value >= 50
                      )
                      .map(
                        ([nodeId, value]) => (
                          <div
                            key={nodeId}
                            className={
                              value >= 80
                                ? "text-red-400"
                                : "text-orange-400"
                            }
                          >
                            {nodeId}: {value} people
                          </div>
                        )
                      )
                  )}
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-4">
                <div className="text-slate-400 text-xs uppercase tracking-wide">
                  Decision Basis
                </div>

                <div className="text-blue-400 font-semibold mt-2">
                  Distance + Occupancy
                </div>

                <div className="text-xs text-slate-400 mt-2 leading-5">
                  The deterministic routing engine selects
                  the lowest-cost safe route. LLMs do not
                  determine evacuation paths.
                </div>
              </div>

            </div>

            {Object.entries(occupancy).some(
              ([, value]) => value >= 80
            ) && (
              <div className="mt-4 rounded-lg border border-orange-800 bg-orange-950/40 p-4">
                <div className="font-semibold text-orange-300">
                  Dynamic rerouting active
                </div>
                <div className="text-sm text-orange-200 mt-1">
                  High occupancy has increased routing cost
                  on one or more building nodes. The recommended
                  route may change to a less congested path.
                </div>
              </div>
            )}

          </section>
        )}

        {/* SAVE SIMULATION */}

        {route.length > 0 && (
          <section className="mt-6 bg-slate-900 rounded-xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  Save Current Simulation
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Save this evacuation decision to your simulation history.
                </p>
              </div>

              <button
                type="button"
                onClick={saveCurrentSimulation}
                disabled={!route.length}
                className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save Simulation
              </button>
            </div>
          </section>
        )}

        {/* CROSS-FLOOR ROUTE */}

        {building &&
          route.length > 0 && (

          <section className="mt-6 bg-slate-900 rounded-xl p-6">

            <h2 className="text-xl font-semibold mb-5">
              Evacuation Path by Floor
            </h2>

            <div className="space-y-4">

              {floors.map(
                (floor) => {

                  const floorRoute =
                    route.filter(
                      (nodeId) =>
                        nodeMap[
                          nodeId
                        ]?.floor ===
                        floor
                    );

                  if (
                    floorRoute.length ===
                    0
                  ) {
                    return null;
                  }

                  return (
                    <div
                      key={floor}
                      className="bg-slate-800 rounded-lg p-4"
                    >

                      <div className="text-blue-400 font-semibold mb-2">
                        Floor {floor}
                      </div>

                      <div className="text-sm">
                        {floorRoute.join(
                          " → "
                        )}
                      </div>

                    </div>
                  );
                }
              )}

            </div>

          </section>
        )}



        {/* =====================================================
    SIMULATION HISTORY
===================================================== */}

<div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

  <div className="flex flex-wrap items-center justify-between gap-4">

    <div>
      <h2 className="text-lg font-black text-slate-900">
        Simulation History
      </h2>

      <p className="mt-1 text-xs text-slate-500">
        Your previously saved evacuation simulations.
      </p>
    </div>

    <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
      {simulationHistory.length} saved
    </div>

  </div>


  {simulationHistory.length === 0 ? (

    <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">

      <div className="text-sm font-bold text-slate-600">
        No saved simulations yet
      </div>

      <div className="mt-1 text-xs text-slate-400">
        Run an evacuation simulation and click
        "Save Simulation" to keep it here.
      </div>

    </div>

  ) : (

    <div className="mt-5 space-y-3">

      {simulationHistory.map((simulation) => (

        <div
          key={simulation.id}
          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
        >

          <div className="flex flex-wrap items-center justify-between gap-4">

            <div>

              <div className="text-sm font-black text-slate-900">
                {simulation.building_name ||
                  "S33 Building"}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                {simulation.start_node}
                {" → "}
                {simulation.destination || "AUTO"}
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
                <span className="rounded-full bg-slate-200 px-3 py-1 text-[10px] font-black uppercase text-slate-600">
                  {simulation.confidence}
                </span>
              )}

            </div>

          </div>


          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">

            <div className="text-xs text-slate-400">
              {simulation.created_at
                ? new Date(
                    simulation.created_at
                  ).toLocaleString()
                : "Recently saved"}
            </div>

            <div className="text-xs font-bold text-slate-500">
              {Array.isArray(simulation.route)
                ? `${simulation.route.length} route nodes`
                : "Route saved"}
            </div>

          </div>

        </div>

      ))}

    </div>

  )}

</div>

        {/* HAZARDS */}

        <section className="mt-6 bg-slate-900 rounded-xl p-6">

          <h2 className="text-xl font-semibold mb-4">
            Active Hazards
          </h2>

          {hazards.length ===
          0 ? (
            <p className="text-green-400">
              ✓ No active hazards
              detected
            </p>
          ) : (
            <div className="space-y-3">

              {hazards.map(
                (
                  hazard,
                  index
                ) => (
                  <div
                    key={`${hazard.type}-${hazard.location}-${index}`}
                    className="bg-red-950 border border-red-800 rounded-lg p-4"
                  >

                    <div className="font-semibold text-red-300">
                      Hazard:{" "}
                      {hazard.type}
                    </div>

                    <div className="text-sm text-red-200 mt-1">
                      Location:{" "}
                      {hazard.location}
                    </div>

                    <div className="text-sm text-red-200 mt-1">
                      Severity:{" "}
                      {hazard.severity}
                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </section>

          </div>

        )}

      </div>

    </main>
  );
}
