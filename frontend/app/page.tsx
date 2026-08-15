"use client";

import { useEffect, useState } from "react";

type Mobility =
  | "normal"
  | "wheelchair"
  | "temporary_injury"
  | "child"
  | "elderly";

type Sensor = {
  id: string;
  type: string;
  location: string;
  value: unknown;
  available: boolean;
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
  destination: string;
  mobility: string;
  hazards: Hazard[];
  blocked_nodes: string[];
  mode: string;
  confidence: string;
  advisory: boolean;
  message: string;
};

const BACKEND_WS =
  "ws://127.0.0.1:8000/ws/evacuation/N1/EXIT1";

const nodes = {
  N1: { x: 100, y: 100 },
  N2: { x: 250, y: 100 },
  N3: { x: 400, y: 100 },
  N4: { x: 100, y: 250 },
  N5: { x: 250, y: 250 },
  N6: { x: 400, y: 250 },
  EXIT1: { x: 400, y: 400 },
};

const edges = [
  ["N1", "N2"],
  ["N2", "N3"],
  ["N1", "N4"],
  ["N4", "N5"],
  ["N5", "N6"],
  ["N3", "N6"],
  ["N2", "N5"],
  ["N6", "EXIT1"],
];

export default function Home() {
  const [mobility, setMobility] =
    useState<Mobility>("normal");

  const [route, setRoute] = useState<string[]>([]);

  const [hazards, setHazards] =
    useState<Hazard[]>([]);

  const [confidence, setConfidence] =
    useState("unknown");

  const [mode, setMode] =
    useState("unknown");

  const [connected, setConnected] =
    useState(false);

  useEffect(() => {
    const socket = new WebSocket(
      `${BACKEND_WS}/${mobility}`
    );

    socket.onopen = () => {
      setConnected(true);

      sendNormalState(socket);
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (
        message.type === "route_update"
      ) {
        const data: RouteResponse =
          message.data;

        setRoute(data.route);
        setHazards(data.hazards);
        setConfidence(data.confidence);
        setMode(data.mode);
      }
    };

    socket.onclose = () => {
      setConnected(false);
    };

    return () => {
      socket.close();
    };
  }, [mobility]);

  function sendNormalState(
    socket: WebSocket
  ) {
    const sensors: Sensor[] = [
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
        id: "D1",
        type: "door",
        location: "EXIT1",
        value: "open",
        available: true,
      },
    ];

    socket.send(
      JSON.stringify({
        sensors,
      })
    );
  }

  function isOnRoute(
    nodeId: string
  ) {
    return route.includes(nodeId);
  }

  function isHazard(
    nodeId: string
  ) {
    return hazards.some(
      (hazard) =>
        hazard.location === nodeId
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto">

        <header className="mb-8">
          <h1 className="text-3xl font-bold">
            S33 Evacuation Digital Twin
          </h1>

          <p className="text-slate-400 mt-2">
            Real-time safe evacuation routing
          </p>
        </header>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* Controls */}
          <section className="bg-slate-900 rounded-xl p-6">

            <h2 className="text-xl font-semibold mb-5">
              Evacuation Control
            </h2>

            <label className="block text-sm text-slate-400 mb-2">
              Mobility
            </label>

            <select
              value={mobility}
              onChange={(e) =>
                setMobility(
                  e.target.value as Mobility
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

            <div className="mt-6 space-y-3">

              <div>
                <span className="text-slate-400">
                  Connection
                </span>

                <p>
                  {connected
                    ? "🟢 Connected"
                    : "🔴 Disconnected"}
                </p>
              </div>

              <div>
                <span className="text-slate-400">
                  Mode
                </span>

                <p>{mode}</p>
              </div>

              <div>
                <span className="text-slate-400">
                  Confidence
                </span>

                <p>{confidence}</p>
              </div>

              <div>
                <span className="text-slate-400">
                  Current Route
                </span>

                <p className="text-sm mt-1">
                  {route.length
                    ? route.join(" → ")
                    : "No route"}
                </p>
              </div>

            </div>

          </section>

          {/* SVG Digital Twin */}
          <section className="lg:col-span-2 bg-slate-900 rounded-xl p-6">

            <h2 className="text-xl font-semibold mb-4">
              Building Digital Twin
            </h2>

            <svg
              viewBox="0 0 500 450"
              className="w-full bg-white rounded-lg"
            >

              {/* Edges */}
              {edges.map(
                ([from, to]) => {
                  const a =
                    nodes[
                      from as keyof typeof nodes
                    ];

                  const b =
                    nodes[
                      to as keyof typeof nodes
                    ];

                  return (
                    <line
                      key={`${from}-${to}`}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="#94a3b8"
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                  );
                }
              )}

              {/* Route */}
              {route
                .slice(0, -1)
                .map((node, index) => {
                  const next =
                    route[index + 1];

                  const a =
                    nodes[
                      node as keyof typeof nodes
                    ];

                  const b =
                    nodes[
                      next as keyof typeof nodes
                    ];

                  return (
                    <line
                      key={`route-${node}-${next}`}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="#16a34a"
                      strokeWidth="12"
                      strokeLinecap="round"
                    />
                  );
                })}

              {/* Nodes */}
              {Object.entries(nodes).map(
                ([id, position]) => {

                  const hazard =
                    isHazard(id);

                  const routeNode =
                    isOnRoute(id);

                  return (
                    <g key={id}>

                      <circle
                        cx={position.x}
                        cy={position.y}
                        r="18"
                        fill={
                          hazard
                            ? "#dc2626"
                            : id === "EXIT1"
                            ? "#2563eb"
                            : routeNode
                            ? "#16a34a"
                            : "#64748b"
                        }
                        stroke="#ffffff"
                        strokeWidth="3"
                      />

                      <text
                        x={position.x}
                        y={
                          position.y + 5
                        }
                        textAnchor="middle"
                        fontSize="11"
                        fill="white"
                        fontWeight="bold"
                      >
                        {id}
                      </text>

                    </g>
                  );
                }
              )}

            </svg>

          </section>

        </div>

        {/* Hazards */}
        <section className="mt-6 bg-slate-900 rounded-xl p-6">

          <h2 className="text-xl font-semibold mb-4">
            Active Hazards
          </h2>

          {hazards.length === 0 ? (
            <p className="text-green-400">
              ✓ No active hazards detected
            </p>
          ) : (
            <div className="space-y-2">

              {hazards.map(
                (hazard, index) => (
                  <div
                    key={index}
                    className="bg-red-950 border border-red-800 rounded-lg p-3"
                  >
                    ⚠️{" "}
                    {hazard.type}
                    {" at "}
                    {hazard.location}
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