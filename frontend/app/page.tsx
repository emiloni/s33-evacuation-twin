"use client";

import { useEffect, useMemo, useState } from "react";

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

  /*
   * ----------------------------------------------------------
   * LOAD BUILDING
   * ----------------------------------------------------------
   */

  async function loadBuilding() {
    try {
      setBuildingLoading(true);
      setBuildingError("");

      const response = await fetch(
        `${BACKEND_HTTP}/api/v1/building`,
        {
          cache: "no-store",
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
        setStartNode(
          firstNonExit.id
        );
        setSelectedFloor(
          firstNonExit.floor
        );
      } else if (
        data.nodes.length > 0
      ) {
        setStartNode(
          data.nodes[0].id
        );
        setSelectedFloor(
          data.nodes[0].floor
        );
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

  useEffect(() => {
    loadBuilding();
  }, []);

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
      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          `${BACKEND_HTTP}/api/v1/building/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response.json();

      if (!data.success) {
        throw new Error(
          data.message ||
            "Building upload failed."
        );
      }

      setUploadMessage(
        `Loaded ${file.name} successfully.`
      );

      await loadBuilding();

    } catch (error) {
      console.error(error);

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
   * FLOORS
   * ----------------------------------------------------------
   */

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

  /*
   * ----------------------------------------------------------
   * RENDER
   * ----------------------------------------------------------
   */

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">

      <div className="max-w-7xl mx-auto">

        {/* HEADER */}

        <header className="mb-8">

          <h1 className="text-3xl font-bold">
            S33 Evacuation Digital Twin
          </h1>

          <p className="text-slate-400 mt-2">
            Multi-floor, mobility-aware
            evacuation routing
          </p>

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
                    {confidence}
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

                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <svg
                      viewBox="0 0 900 560"
                      className="mx-auto h-auto min-w-[760px] w-full"
                      role="img"
                      aria-label={`Architectural floor map for Floor ${selectedFloor}`}
                    >
                      {/* Building shell */}
                      <rect
                        x="25"
                        y="25"
                        width="850"
                        height="510"
                        rx="16"
                        fill="#f8fafc"
                        stroke="#94a3b8"
                        strokeWidth="4"
                      />

                      {/* Real building edges. These are rendered behind the rooms,
                          using the normalized positions from the uploaded dataset. */}
                      {currentFloorEdges.map((edge) => {
                        const from = floorLayout[edge.from];
                        const to = floorLayout[edge.to];

                        if (!from || !to) {
                          return null;
                        }

                        const blocked =
                          isHazard(edge.from) ||
                          isHazard(edge.to);

                        const onRoute =
                          currentFloorRouteEdges.some(
                            (routeEdge) =>
                              routeEdge.from.id === edge.from &&
                              routeEdge.to.id === edge.to
                          );

                        return (
                          <line
                            key={`edge-${edge.from}-${edge.to}`}
                            x1={from.x}
                            y1={from.y}
                            x2={to.x}
                            y2={to.y}
                            stroke={
                              blocked
                                ? "#ef4444"
                                : onRoute
                                  ? "#16a34a"
                                  : edge.type === "stairs"
                                    ? "#f59e0b"
                                    : edge.type === "elevator"
                                      ? "#8b5cf6"
                                      : "#94a3b8"
                            }
                            strokeWidth={onRoute ? 10 : 8}
                            strokeLinecap="round"
                            strokeDasharray={
                              blocked ? "10 7" : undefined
                            }
                            opacity={blocked ? 0.9 : 0.75}
                          />
                        );
                      })}

                      {/* Rooms and corridors */}
                      {currentFloorNodes
                        .filter(
                          (node) =>
                            node.type === "room" ||
                            node.type === "corridor"
                        )
                        .map((node) => {
                          const point = floorLayout[node.id];

                          if (!point) {
                            return null;
                          }

                          const hazard = isHazard(node.id);
                          const routeNode = isOnRoute(node.id);
                          const value = getOccupancy(node.id);
                          const isCorridor = node.type === "corridor";
                          const width = isCorridor ? 150 : 180;
                          const height = isCorridor ? 52 : 92;
                          const x = point.x - width / 2;
                          const y = point.y - height / 2;

                          return (
                            <g key={`space-${node.id}`}>
                              <rect
                                x={x}
                                y={y}
                                width={width}
                                height={height}
                                rx={isCorridor ? 10 : 12}
                                fill={
                                  hazard
                                    ? "#fee2e2"
                                    : routeNode
                                      ? "#dcfce7"
                                      : isCorridor
                                        ? "#e2e8f0"
                                        : "#ffffff"
                                }
                                stroke={
                                  hazard
                                    ? "#dc2626"
                                    : routeNode
                                      ? "#16a34a"
                                      : "#cbd5e1"
                                }
                                strokeWidth={
                                  hazard || routeNode ? 4 : 2
                                }
                              />

                              <text
                                x={point.x}
                                y={point.y - 7}
                                textAnchor="middle"
                                fontSize="12"
                                fontWeight="800"
                                fill="#0f172a"
                              >
                                {node.label}
                              </text>

                              <text
                                x={point.x}
                                y={point.y + 11}
                                textAnchor="middle"
                                fontSize="9"
                                fill="#64748b"
                              >
                                {node.id}
                              </text>

                              {!isCorridor && value > 0 && (
                                <text
                                  x={point.x}
                                  y={point.y + 30}
                                  textAnchor="middle"
                                  fontSize="9"
                                  fontWeight="800"
                                  fill={getOccupancyColor(value)}
                                >
                                  {value} people
                                </text>
                              )}

                              {hazard && (
                                <text
                                  x={point.x}
                                  y={y - 8}
                                  textAnchor="middle"
                                  fontSize="9"
                                  fontWeight="900"
                                  fill="#dc2626"
                                >
                                  ⚠ HAZARD / BLOCKED
                                </text>
                              )}
                            </g>
                          );
                        })}

                      {/* Stairs / elevators */}
                      {currentFloorNodes
                        .filter(
                          (node) =>
                            node.type === "stairs" ||
                            node.type === "elevator"
                        )
                        .map((node) => {
                          const point = floorLayout[node.id];

                          if (!point) {
                            return null;
                          }

                          const hazard = isHazard(node.id);
                          const routeNode = isOnRoute(node.id);
                          const stairs = node.type === "stairs";

                          return (
                            <g key={`infra-${node.id}`}>
                              <rect
                                x={point.x - 55}
                                y={point.y - 32}
                                width="110"
                                height="64"
                                rx="12"
                                fill={
                                  hazard
                                    ? "#fee2e2"
                                    : routeNode
                                      ? "#dcfce7"
                                      : stairs
                                        ? "#fef3c7"
                                        : "#ede9fe"
                                }
                                stroke={
                                  hazard
                                    ? "#dc2626"
                                    : routeNode
                                      ? "#16a34a"
                                      : stairs
                                        ? "#f59e0b"
                                        : "#8b5cf6"
                                }
                                strokeWidth="3"
                              />

                              <text
                                x={point.x}
                                y={point.y + 2}
                                textAnchor="middle"
                                fontSize="18"
                                fontWeight="900"
                                fill="#0f172a"
                              >
                                {stairs ? "S" : "E"}
                              </text>

                              <text
                                x={point.x}
                                y={point.y + 20}
                                textAnchor="middle"
                                fontSize="8"
                                fontWeight="800"
                                fill="#475569"
                              >
                                {stairs ? "STAIRWELL" : "ELEVATOR"}
                              </text>

                              {hazard && (
                                <text
                                  x={point.x}
                                  y={point.y - 42}
                                  textAnchor="middle"
                                  fontSize="9"
                                  fontWeight="900"
                                  fill="#dc2626"
                                >
                                  BLOCKED
                                </text>
                              )}
                            </g>
                          );
                        })}

                      {/* Exits */}
                      {currentFloorNodes
                        .filter((node) => node.type === "exit")
                        .map((node) => {
                          const point = floorLayout[node.id];

                          if (!point) {
                            return null;
                          }

                          const hazard = isHazard(node.id);
                          const routeNode = isOnRoute(node.id);

                          return (
                            <g key={`exit-${node.id}`}>
                              <rect
                                x={point.x - 52}
                                y={point.y - 30}
                                width="104"
                                height="60"
                                rx="12"
                                fill={
                                  hazard
                                    ? "#fee2e2"
                                    : routeNode
                                      ? "#dcfce7"
                                      : "#dbeafe"
                                }
                                stroke={
                                  hazard
                                    ? "#dc2626"
                                    : routeNode
                                      ? "#16a34a"
                                      : "#2563eb"
                                }
                                strokeWidth="4"
                              />
                              <text
                                x={point.x}
                                y={point.y - 3}
                                textAnchor="middle"
                                fontSize="12"
                                fontWeight="900"
                                fill="#0f172a"
                              >
                                EXIT
                              </text>
                              <text
                                x={point.x}
                                y={point.y + 15}
                                textAnchor="middle"
                                fontSize="9"
                                fill="#475569"
                              >
                                {node.label}
                              </text>
                              {hazard && (
                                <text
                                  x={point.x}
                                  y={point.y - 40}
                                  textAnchor="middle"
                                  fontSize="9"
                                  fontWeight="900"
                                  fill="#dc2626"
                                >
                                  CLOSED
                                </text>
                              )}
                            </g>
                          );
                        })}

                      {/* Start marker */}
                      {route[0] && floorLayout[route[0]] &&
                        nodeMap[route[0]]?.floor === selectedFloor && (
                          <g>
                            <circle
                              cx={floorLayout[route[0]].x}
                              cy={floorLayout[route[0]].y}
                              r="8"
                              fill="#2563eb"
                              stroke="white"
                              strokeWidth="3"
                            />
                            <text
                              x={floorLayout[route[0]].x}
                              y={floorLayout[route[0]].y - 18}
                              textAnchor="middle"
                              fontSize="9"
                              fontWeight="900"
                              fill="#2563eb"
                            >
                              START
                            </text>
                          </g>
                        )}

                      <text
                        x="450"
                        y="520"
                        textAnchor="middle"
                        fontSize="13"
                        fontWeight="900"
                        fill="#475569"
                      >
                        FLOOR {selectedFloor} • LIVE EVACUATION VIEW
                      </text>

                      {currentFloorNodes.length === 0 && (
                        <text
                          x="450"
                          y="280"
                          textAnchor="middle"
                          fontSize="18"
                          fill="#64748b"
                        >
                          No mapped nodes on this floor
                        </text>
                      )}
                    </svg>
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
