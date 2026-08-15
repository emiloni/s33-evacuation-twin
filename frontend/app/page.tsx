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
  | "exit_closed";

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
};

const BACKEND_HTTP =
  "http://127.0.0.1:8000";

const BACKEND_WS =
  "ws://127.0.0.1:8000/ws/evacuation/N1/AUTO";

export default function Home() {
  const [building, setBuilding] =
    useState<BuildingData | null>(null);

  const [mobility, setMobility] =
    useState<Mobility>("normal");

  const [scenario, setScenario] =
    useState<Scenario>("normal");

  const [route, setRoute] =
    useState<string[]>([]);

  const [hazards, setHazards] =
    useState<Hazard[]>([]);

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
   * Load building from FastAPI
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

      const data = await response.json();

      setBuilding(data);
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
   * Upload building dataset
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
   * WebSocket
   * ----------------------------------------------------------
   */

  useEffect(() => {
    if (!building) {
      return;
    }

    const socket =
      new WebSocket(
        `${BACKEND_WS}/${mobility}`
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
          data.route
        );

        setHazards(
          data.hazards
        );

        setConfidence(
          data.confidence
        );

        setMode(
          data.mode
        );

        setMessage(
          data.message
        );
      }
    };

    socket.onerror = () => {
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
    mobility,
    scenario,
  ]);

  /*
   * ----------------------------------------------------------
   * Scenario data
   * ----------------------------------------------------------
   */

  function sendScenarioState(
    socket: WebSocket,
    selectedScenario: Scenario
  ) {
    let sensors: Sensor[] =
      [];

    if (
      selectedScenario ===
      "normal"
    ) {
      sensors = [
        {
          id: "T1",
          type: "temperature",
          location: "N3",
          value: 24,
          available: true,
        },
        {
          id: "S1",
          type: "smoke",
          location: "N3",
          value: 5,
          available: true,
        },
        {
          id: "O1",
          type: "occupancy",
          location: "N2",
          value: 15,
          available: true,
        },
        {
          id: "D1",
          type: "door",
          location: "EXIT1",
          value: "open",
          available: true,
        },
      ];
    }

    if (
      selectedScenario ===
      "fire"
    ) {
      sensors = [
        {
          id: "T1",
          type: "temperature",
          location: "N3",
          value: 85,
          available: true,
        },
        {
          id: "S1",
          type: "smoke",
          location: "N3",
          value: 90,
          available: true,
        },
        {
          id: "O1",
          type: "occupancy",
          location: "N2",
          value: 15,
          available: true,
        },
        {
          id: "D1",
          type: "door",
          location: "EXIT1",
          value: "open",
          available: true,
        },
      ];
    }

    if (
      selectedScenario ===
      "sensor_failure"
    ) {
      sensors = [
        {
          id: "T1",
          type: "temperature",
          location: "N3",
          value: null,
          available: false,
        },
        {
          id: "S1",
          type: "smoke",
          location: "N3",
          value: null,
          available: false,
        },
        {
          id: "O1",
          type: "occupancy",
          location: "N2",
          value: 15,
          available: true,
        },
        {
          id: "D1",
          type: "door",
          location: "EXIT1",
          value: "open",
          available: true,
        },
      ];
    }

    if (
      selectedScenario ===
      "exit_closed"
    ) {
      sensors = [
        {
          id: "T1",
          type: "temperature",
          location: "N3",
          value: 24,
          available: true,
        },
        {
          id: "S1",
          type: "smoke",
          location: "N3",
          value: 5,
          available: true,
        },
        {
          id: "O1",
          type: "occupancy",
          location: "N2",
          value: 15,
          available: true,
        },
        {
          id: "D1",
          type: "door",
          location: "EXIT1",
          value: "closed",
          available: true,
        },
      ];
    }

    socket.send(
      JSON.stringify({
        sensors,
      })
    );
  }

  /*
   * ----------------------------------------------------------
   * Building helpers
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

  function isOnRoute(
    nodeId: string
  ) {
    return route.includes(
      nodeId
    );
  }

  function isHazard(
    nodeId: string
  ) {
    return hazards.some(
      (hazard) =>
        hazard.location ===
        nodeId
    );
  }

  /*
   * ----------------------------------------------------------
   * Render
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
            Data-driven real-time
            evacuation routing
          </p>

        </header>

        {/* DATASET UPLOAD */}

        <section className="bg-slate-900 rounded-xl p-6 mb-6">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div>

              <h2 className="text-xl font-semibold">
                Building Dataset
              </h2>

              <p className="text-sm text-slate-400 mt-1">
                Upload a valid S33 building
                JSON dataset.
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

              <div className="bg-slate-800 rounded-lg p-3">
                <div className="text-slate-400 text-xs">
                  Status
                </div>
                <div className="text-green-400 font-semibold">
                  Loaded
                </div>
              </div>

            </div>
          )}

        </section>

        {/* LOADING */}

        {buildingLoading && (
          <div className="bg-slate-900 rounded-xl p-8 text-center">
            Loading building...
          </div>
        )}

        {/* ERROR */}

        {buildingError && (
          <div className="bg-red-950 border border-red-800 rounded-xl p-6">
            {buildingError}
          </div>
        )}

        {/* MAIN */}

        {building && !buildingLoading && (

          <div className="grid lg:grid-cols-3 gap-6">

            {/* CONTROL */}

            <section className="bg-slate-900 rounded-xl p-6">

              <h2 className="text-xl font-semibold mb-6">
                Evacuation Control
              </h2>

              <label className="block text-sm text-slate-400 mb-2">
                Mobility
              </label>

              <select
                value={mobility}
                onChange={(event) =>
                  setMobility(
                    event.target
                      .value as Mobility
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
                    event.target
                      .value as Scenario
                  )
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3"
              >
                <option value="normal">
                  Normal
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

                  <p
                    className={
                      mode ===
                      "conservative"
                        ? "text-yellow-400 font-semibold mt-1"
                        : "text-green-400 font-semibold mt-1"
                    }
                  >
                    {mode}
                  </p>
                </div>

                <div>
                  <span className="text-sm text-slate-400">
                    Confidence
                  </span>

                  <p
                    className={
                      confidence ===
                      "low"
                        ? "text-yellow-400 font-semibold mt-1"
                        : "text-green-400 font-semibold mt-1"
                    }
                  >
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
                          route.length -
                            1
                        ]
                      : "None"}
                  </p>
                </div>

                <div>
                  <span className="text-sm text-slate-400">
                    Current Route
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

            {/* SVG */}

            <section className="lg:col-span-2 bg-slate-900 rounded-xl p-6">

              <div className="flex items-center justify-between mb-5">

                <div>
                  <h2 className="text-xl font-semibold">
                    Building Digital Twin
                  </h2>

                  <p className="text-sm text-slate-400 mt-1">
                    Generated from building
                    dataset
                  </p>
                </div>

                <div className="text-sm text-slate-400">
                  {building.nodes.length} nodes
                </div>

              </div>

              <svg
                viewBox="0 0 500 450"
                className="w-full bg-white rounded-lg"
              >

                {/* EDGES */}

                {building.edges.map(
                  (edge, index) => {

                    const from =
                      nodeMap[
                        edge.from
                      ];

                    const to =
                      nodeMap[
                        edge.to
                      ];

                    if (
                      !from ||
                      !to
                    ) {
                      return null;
                    }

                    return (
                      <line
                        key={`${edge.from}-${edge.to}-${index}`}
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke={
                          edge.type ===
                          "stairs"
                            ? "#f59e0b"
                            : "#94a3b8"
                        }
                        strokeWidth={
                          edge.type ===
                          "stairs"
                            ? 6
                            : 8
                        }
                        strokeLinecap="round"
                        strokeDasharray={
                          edge.type ===
                          "stairs"
                            ? "10 6"
                            : undefined
                        }
                      />
                    );
                  }
                )}

                {/* ROUTE */}

                {route
                  .slice(0, -1)
                  .map(
                    (
                      nodeId,
                      index
                    ) => {

                      const nextId =
                        route[
                          index + 1
                        ];

                      const from =
                        nodeMap[
                          nodeId
                        ];

                      const to =
                        nodeMap[
                          nextId
                        ];

                      if (
                        !from ||
                        !to
                      ) {
                        return null;
                      }

                      return (
                        <line
                          key={`route-${nodeId}-${nextId}`}
                          x1={from.x}
                          y1={from.y}
                          x2={to.x}
                          y2={to.y}
                          stroke="#16a34a"
                          strokeWidth="12"
                          strokeLinecap="round"
                        />
                      );
                    }
                  )}

                {/* NODES */}

                {building.nodes.map(
                  (node) => {

                    const hazard =
                      isHazard(
                        node.id
                      );

                    const routeNode =
                      isOnRoute(
                        node.id
                      );

                    let fill =
                      "#64748b";

                    if (
                      node.type ===
                      "exit"
                    ) {
                      fill =
                        "#2563eb";
                    }

                    if (
                      routeNode
                    ) {
                      fill =
                        "#16a34a";
                    }

                    if (
                      hazard
                    ) {
                      fill =
                        "#dc2626";
                    }

                    return (
                      <g
                        key={node.id}
                      >

                        <circle
                          cx={node.x}
                          cy={node.y}
                          r="20"
                          fill={fill}
                          stroke="white"
                          strokeWidth="3"
                        />

                        <text
                          x={node.x}
                          y={
                            node.y +
                            5
                          }
                          textAnchor="middle"
                          fontSize="11"
                          fill="white"
                          fontWeight="bold"
                        >
                          {node.id}
                        </text>

                      </g>
                    );
                  }
                )}

              </svg>

              {/* LEGEND */}

              <div className="flex flex-wrap gap-5 mt-5 text-sm text-slate-300">

                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-green-600" />
                  Route
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-red-600" />
                  Hazard
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-blue-600" />
                  Exit
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-500" />
                  Node
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-4 h-1 bg-orange-400" />
                  Stairs
                </div>

              </div>

            </section>

          </div>
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
    </main>
  );
}