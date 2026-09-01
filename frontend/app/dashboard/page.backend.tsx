"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import DashboardShell from "@/components/dashboard/DashboardShell";
import SimulationPanel from "@/components/dashboard/SimulationPanel";
import StatusPanel from "@/components/dashboard/StatusPanel";
import DigitalTwinCanvas3D from "@/components/three/DigitalTwinCanvas3D";

import type {
  FloorGeometry,
  Hazard,
  MobilityProfile,
  Occupant,
  Point,
  RoutePoint,
  RouteSegment,
  Room,
  RoomType,
} from "@/lib/schema";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

type ApiBuildingNode = {
  id: string;
  x: number;
  y: number;
  floor: number;
  type: string;
  label: string;
};

type ApiBuildingEdge = {
  from: string;
  to: string;
  weight: number;
  type: string;
  accessible: boolean;
};

type ApiBuilding = {
  nodes: ApiBuildingNode[];
  edges: ApiBuildingEdge[];
};

type BackendHazard = {
  type: string;
  location: string;
  severity: string;
};

type BackendRouteResponse = {
  success: boolean;
  route: string[];
  distance: number | null;
  start: string;
  destination: string | null;
  mobility: string;
  hazards: BackendHazard[];
  blocked_nodes: string[];
  occupancy: Record<string, number>;
  mode: string;
  confidence: "high" | "medium" | "low" | string;
  advisory: boolean;
  message: string;
};

type SimulationHistoryItem = {
  id: number;
  building_name: string;
  start_node: string;
  destination: string | null;
  mobility: string;
  scenario: string;
  route: string[];
  hazards: BackendHazard[];
  confidence: string | null;
  mode: string | null;
  created_at: string;
};

type Scenario =
  | "normal"
  | "fire"
  | "sensor_failure"
  | "exit_closed"
  | "corridor_blocked"
  | "congestion";

const MOBILITY_OPTIONS: {
  value: MobilityProfile;
  label: string;
}[] = [
  { value: "normal", label: "Normal" },
  { value: "wheelchair", label: "Wheelchair" },
  { value: "temporary_injury", label: "Temporary injury" },
  { value: "child", label: "Child" },
  { value: "elderly", label: "Elderly" },
];

const SCENARIO_OPTIONS: {
  value: Scenario;
  label: string;
}[] = [
  { value: "normal", label: "Normal" },
  { value: "fire", label: "Fire" },
  { value: "sensor_failure", label: "Sensor failure" },
  { value: "exit_closed", label: "Exit closed" },
  { value: "corridor_blocked", label: "Corridor blocked" },
  { value: "congestion", label: "High occupancy" },
];

function getToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    localStorage.getItem("s33_access_token") ||
    localStorage.getItem("s33_access_token")
  );
}

function mapRoomType(type: string): RoomType {
  switch (type) {
    case "corridor":
      return "corridor";
    case "lobby":
      return "lobby";
    case "meeting_room":
      return "meeting_room";
    case "break_room":
      return "break_room";
    case "room":
      return "office";
    default:
      return "other";
  }
}

function getNodeSize(
  type: string,
  nodeCount: number
): { width: number; height: number } {
  const scale =
    nodeCount > 18
      ? 0.65
      : nodeCount > 12
        ? 0.78
        : nodeCount > 8
          ? 0.9
          : 1;

  switch (type) {
    case "corridor":
      return { width: 140 * scale, height: 48 * scale };
    case "stairs":
    case "elevator":
      return { width: 82 * scale, height: 96 * scale };
    case "exit":
      return { width: 78 * scale, height: 56 * scale };
    default:
      return { width: 124 * scale, height: 76 * scale };
  }
}

function rectangle(
  center: Point,
  width: number,
  height: number
): Point[] {
  const halfW = width / 2;
  const halfH = height / 2;

  return [
    { x: center.x - halfW, y: center.y - halfH },
    { x: center.x + halfW, y: center.y - halfH },
    { x: center.x + halfW, y: center.y + halfH },
    { x: center.x - halfW, y: center.y + halfH },
  ];
}

function createPositions(
  nodes: ApiBuildingNode[]
): Map<string, Point> {
  const positions = new Map<string, Point>();

  for (const node of nodes) {
    positions.set(node.id, {
      x: 150 + node.x * 1.45,
      y: 80 + node.y * 1.15,
    });
  }

  const points = [...positions.values()];

  if (!points.length) {
    return positions;
  }

  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));

  const needsFit =
    minX < 130 ||
    maxX > 870 ||
    minY < 120 ||
    maxY > 650;

  if (!needsFit) {
    return positions;
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const scale = Math.min(
    1,
    740 / Math.max(maxX - minX, 1),
    530 / Math.max(maxY - minY, 1)
  );

  for (const [id, point] of positions.entries()) {
    positions.set(id, {
      x: 500 + (point.x - centerX) * scale,
      y: 390 + (point.y - centerY) * scale,
    });
  }

  return positions;
}

function convertBackendBuildingToFloors(
  building: ApiBuilding
): FloorGeometry[] {
  const floorLevels = Array.from(
    new Set(
      building.nodes.map(
        (node) => node.floor
      )
    )
  ).sort((a, b) => a - b);

  return floorLevels.map(
    (floorLevel) => {
      const floorNodes =
        building.nodes.filter(
          (node) =>
            node.floor === floorLevel
        );

      const floorNodeIds =
        new Set(
          floorNodes.map(
            (node) => node.id
          )
        );

      const floorEdges =
        building.edges.filter(
          (edge) =>
            floorNodeIds.has(edge.from) &&
            floorNodeIds.has(edge.to)
        );

      const positions =
        createPositions(floorNodes);

      const rooms: Room[] =
        floorNodes
          .filter((node) =>
            [
              "room",
              "corridor",
              "lobby",
              "meeting_room",
              "break_room",
            ].includes(node.type)
          )
          .map((node) => {
            const center =
              positions.get(node.id) ?? {
                x: 500,
                y: 390,
              };

            const size =
              getNodeSize(
                node.type,
                floorNodes.length
              );

            return {
              id: node.id,
              label:
                node.label || node.id,
              type: mapRoomType(
                node.type
              ),
              polygon: rectangle(
                center,
                size.width,
                size.height
              ),
              confidence: "high" as const,
            };
          });

      const stairwells =
        floorNodes
          .filter(
            (node) =>
              node.type ===
              "stairs"
          )
          .map((node) => {
            const center =
              positions.get(
                node.id
              ) ?? {
                x: 500,
                y: 390,
              };

            return {
              id: node.id,
              polygon: rectangle(
                center,
                90,
                105
              ),
            };
          });

      const exits =
        floorNodes
          .filter(
            (node) =>
              node.type ===
              "exit"
          )
          .map((node) => ({
            id: node.id,
            position:
              positions.get(
                node.id
              ) ?? {
                x: 500,
                y: 390,
              },
            accessible: true,
            direction:
              "right" as const,
          }));

      const doors =
        floorEdges.map(
          (edge, index) => {
            const from =
              positions.get(
                edge.from
              ) ?? {
                x: 500,
                y: 390,
              };

            const to =
              positions.get(
                edge.to
              ) ?? {
                x: 500,
                y: 390,
              };

            return {
              id:
                `DOOR_${index}_${edge.from}_${edge.to}`,

              position: {
                x:
                  (from.x + to.x) /
                  2,
                y:
                  (from.y + to.y) /
                  2,
              },

              connects: [
                edge.from,
                edge.to,
              ] as [
                string,
                string
              ],

              accessible:
                edge.accessible,

              confidence:
                "high" as const,

              angle:
                Math.atan2(
                  to.y - from.y,
                  to.x - from.x
                ) *
                (180 / Math.PI),
            };
          }
        );

      const allPoints =
        floorNodes
          .map(
            (node) =>
              positions.get(
                node.id
              )
          )
          .filter(
            (
              point
            ): point is Point =>
              Boolean(point)
          );

      let buildingOutline:
        | Point[]
        | undefined;

      if (allPoints.length > 0) {
        const padding = 78;

        const minX = Math.max(
          35,
          Math.min(
            ...allPoints.map(
              (point) =>
                point.x
            )
          ) - padding
        );

        const maxX = Math.min(
          965,
          Math.max(
            ...allPoints.map(
              (point) =>
                point.x
            )
          ) + padding
        );

        const minY = Math.max(
          42,
          Math.min(
            ...allPoints.map(
              (point) =>
                point.y
            )
          ) - padding
        );

        const maxY = Math.min(
          740,
          Math.max(
            ...allPoints.map(
              (point) =>
                point.y
            )
          ) + padding
        );

        buildingOutline = [
          {
            x: minX,
            y: minY,
          },
          {
            x: maxX,
            y: minY,
          },
          {
            x: maxX,
            y: maxY,
          },
          {
            x: minX,
            y: maxY,
          },
        ];
      }

      return {
        floorLevel,
        rooms,
        doors,
        exits,
        stairwells,
        buildingOutline,
        hazards: [],
        connections: [],
      };
    }
  );
}
function normalizeConfidence(
  confidence: string
): "high" | "medium" | "low" {
  if (
    confidence === "high" ||
    confidence === "medium" ||
    confidence === "low"
  ) {
    return confidence;
  }

  return "medium";
}

function nodeIdsToRouteSegment(
  route: string[],
  building: ApiBuilding,
  floors: FloorGeometry[],
  confidence: string,
  mobility: MobilityProfile
): RouteSegment[] {
  if (route.length < 2) {
    return [];
  }

  const nodeMap = new Map(
    building.nodes.map((node) => [
      node.id,
      node,
    ])
  );

  const result: RouteSegment[] = [];

  const floorGroups = new Map<
    number,
    string[]
  >();

  for (const nodeId of route) {
    const node = nodeMap.get(nodeId);

    if (!node) {
      continue;
    }

    const current =
      floorGroups.get(node.floor) ?? [];

    current.push(nodeId);

    floorGroups.set(node.floor, current);
  }

  for (const [
    floor,
    floorRoute,
  ] of floorGroups.entries()) {
    if (floorRoute.length < 2) {
      continue;
    }

    const geometry = floors.find(
      (item) =>
        item.floorLevel === floor
    );

    if (!geometry) {
      continue;
    }

    const pointsById = new Map<
  string,
  RoutePoint
>();

    for (const room of geometry.rooms) {
      const center =
        room.polygon.reduce(
          (acc, point) => ({
            x: acc.x + point.x,
            y: acc.y + point.y,
          }),
          { x: 0, y: 0 }
        );

      pointsById.set(room.id, {
        x:
          center.x /
          room.polygon.length,
        y:
          center.y /
          room.polygon.length,
      });
    }

    for (const stair of geometry.stairwells) {
      const center =
        stair.polygon.reduce(
          (acc, point) => ({
            x: acc.x + point.x,
            y: acc.y + point.y,
          }),
          { x: 0, y: 0 }
        );

      pointsById.set(stair.id, {
        x:
          center.x /
          stair.polygon.length,
        y:
          center.y /
          stair.polygon.length,
      });
    }

    for (const exit of geometry.exits) {
      pointsById.set(
        exit.id,
        exit.position
      );
    }

    const path = floorRoute
      .map((nodeId) =>
        pointsById.get(nodeId)
      )
      .filter(
        (point): point is Point =>
          Boolean(point)
      );

    if (path.length < 2) {
      continue;
    }

    result.push({
      occupantId:
        `evacuation-${floor}`,
      path,
      eta: Math.max(
        1,
        path.length - 1
      ),
      exitId:
        route[route.length - 1],
      confidence:
        normalizeConfidence(
          confidence
        ),
      basis:
        confidence === "low"
          ? "static_fallback"
          : "live_sensors",
    });
  }

  return result;
}

function backendHazardsToFrontend(
  hazards: BackendHazard[],
  building: ApiBuilding,
  floors: FloorGeometry[]
): Hazard[] {
  const nodeMap = new Map(
    building.nodes.map((node) => [
      node.id,
      node,
    ])
  );

  return hazards.map(
    (hazard, index) => {
      const node =
        nodeMap.get(
          hazard.location
        );

      let position: Point = {
        x: 500,
        y: 390,
      };

      if (node) {
        const floorGeometry =
          floors.find(
            (floor) =>
              floor.floorLevel ===
              node.floor
          );

        const room =
          floorGeometry?.rooms.find(
            (room) =>
              room.id ===
              hazard.location
          );

        if (
          room &&
          room.polygon.length
        ) {
          position =
            room.polygon.reduce(
              (acc, point) => ({
                x:
                  acc.x +
                  point.x,
                y:
                  acc.y +
                  point.y,
              }),
              { x: 0, y: 0 }
            );

          position = {
            x:
              position.x /
              room.polygon.length,
            y:
              position.y /
              room.polygon.length,
          };
        }
      }

      return {
        id:
          `backend-hazard-${index}`,
        type:
          hazard.type as
            | "fire"
            | "flood"
            | "blocked_corridor"
            | "closed_exit",
        position,
        severity:
          hazard.severity === "high" ||
          hazard.severity === "medium"
            ? hazard.severity
            : "low",
      };
    }
  );
}

export default function DashboardPage() {
  const [building, setBuilding] =
    useState<ApiBuilding | null>(null);

  const [floors, setFloors] =
    useState<FloorGeometry[]>([]);

  const [selectedFloor, setSelectedFloor] =
    useState(1);
  const [visibleFloor, setVisibleFloor] =
    useState<number | "ALL">("ALL");

  const [startNode, setStartNode] =
    useState("");

  const [destination, setDestination] =
    useState<string | null>("AUTO");

  const [mobility, setMobility] =
    useState<MobilityProfile>("normal");

  const [scenario, setScenario] =
    useState<Scenario>("normal");

  const [hazards, setHazards] =
    useState<Hazard[]>([]);

    const [selectedBuilding, setSelectedBuilding] =
  useState<number>(1);
  const [occupants, setOccupants] =
    useState<Occupant[]>([]);

  const [routes, setRoutes] =
    useState<RouteSegment[]>([]);

  const [simulationRunning, setSimulationRunning] =
    useState(false);

  const [connected, setConnected] =
    useState(false);

  const [confidence, setConfidence] =
    useState("unknown");

  const [mode, setMode] =
    useState("unknown");

  const [message, setMessage] =
    useState("");

  const [simulationHistory, setSimulationHistory] =
    useState<SimulationHistoryItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const socketRef =
    useRef<WebSocket | null>(null);

  const currentFloor =
    useMemo(
      () =>
        floors.find(
          (floor) =>
            floor.floorLevel ===
            selectedFloor
        ) ??
        floors[0] ??
        null,
      [floors, selectedFloor]
    );

  const availableFloors =
    useMemo(
      () =>
        floors.map(
          (floor) =>
            floor.floorLevel
        ),
      [floors]
    );

  const nodeMap =
    useMemo(
      () =>
        new Map(
          building?.nodes.map(
            (node) => [
              node.id,
              node,
            ]
          ) ?? []
        ),
      [building]
    );

  const startOptions =
    useMemo(
      () =>
        building?.nodes.filter(
          (node) =>
            node.type !== "exit"
        ) ?? [],
      [building]
    );

  const exitOptions =
    useMemo(
      () =>
        building?.nodes.filter(
          (node) =>
            node.type === "exit"
        ) ?? [],
      [building]
    );

  const createFallbackOccupants =
    useCallback(
      (
        apiBuilding: ApiBuilding
      ): Occupant[] => {
        const candidates =
          apiBuilding.nodes.filter(
            (node) =>
              node.type === "room" ||
              node.type === "lobby"
          );

        return candidates.map(
          (node, index) => {
            const floorGeometry =
              convertBackendBuildingToFloors(
                apiBuilding
              ).find(
                (floor) =>
                  floor.floorLevel ===
                  node.floor
              );

            const room =
              floorGeometry?.rooms.find(
                (item) =>
                  item.id === node.id
              );

            let position: Point = {
              x: 500,
              y: 390,
            };

            if (
              room &&
              room.polygon.length
            ) {
              position =
                room.polygon.reduce(
                  (acc, point) => ({
                    x:
                      acc.x +
                      point.x,
                    y:
                      acc.y +
                      point.y,
                  }),
                  { x: 0, y: 0 }
                );

              position = {
                x:
                  position.x /
                  room.polygon.length,
                y:
                  position.y /
                  room.polygon.length,
              };
            }

            const profiles: MobilityProfile[] =
              [
                "normal",
                "normal",
                "wheelchair",
                "elderly",
              ];

            return {
              id:
                `occupant-${index + 1}`,
              roomId: node.id,
              position,
              profile:
                profiles[
                  index %
                    profiles.length
                ],
                floorLevel: node.floor,
            };
          }
        );
      },
      []
    );

  const loadBuilding =
    useCallback(
      async () => {
        const token = getToken();

        if (!token) {
          window.location.href =
            "/login";
          return;
        }

        setLoading(true);
        setError("");

        try {
          const response =
            await fetch(
              `${API_BASE_URL}/api/v1/building`,
              {
                cache: "no-store",
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          if (!response.ok) {
  const errorText = await response.text();

  console.error(
    "BUILDING API ERROR:",
    response.status,
    errorText
  );

  throw new Error(
    `Unable to load building (${response.status})`
  );
}

          const data =
            (await response.json()) as ApiBuilding;

          setBuilding(data);

          const geometry =
            convertBackendBuildingToFloors(
              data
            );

          setFloors(geometry);

          const firstStart =
            data.nodes.find(
              (node) =>
                node.type !== "exit"
            );

          const initialFloor =
            firstStart?.floor ??
            geometry[0]?.floorLevel ??
            1;

          setSelectedFloor(
            initialFloor
          );

          setStartNode(
            firstStart?.id ??
              data.nodes[0]?.id ??
              ""
          );

          setDestination("AUTO");

          setOccupants(
            createFallbackOccupants(
              data
            )
          );

          setRoutes([]);
          setHazards([]);
          setConfidence(
            "unknown"
          );
          setMode("unknown");
          setMessage("");
        } catch (loadError) {
          console.error(
            loadError
          );

          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load building."
          );
        } finally {
          setLoading(false);
        }
      },
      [createFallbackOccupants]
    );

  const loadSimulationHistory =
    useCallback(
      async () => {
        const token = getToken();

        if (!token) {
          return;
        }

        try {
          const response =
            await fetch(
              `${API_BASE_URL}/api/v1/simulations`,
              {
                cache: "no-store",
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          if (!response.ok) {
            return;
          }

          const data =
            await response.json();

          setSimulationHistory(
            Array.isArray(data)
              ? data
              : []
          );
        } catch (historyError) {
          console.error(
            historyError
          );
        }
      },
      []
    );

  const closeSocket =
    useCallback(() => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }

      setConnected(false);
    }, []);

  const applyBackendResult =
    useCallback(
      (
        result: BackendRouteResponse
      ) => {
        if (!building) {
          return;
        }

        const frontendHazards =
          backendHazardsToFrontend(
            result.hazards ?? [],
            building,
            floors
          );

        const frontendRoutes =
          nodeIdsToRouteSegment(
            result.route ?? [],
            building,
            floors,
            result.confidence,
            mobility
          );

        setRoutes(
          frontendRoutes
        );

        setHazards(
          frontendHazards
        );

        setConfidence(
          result.confidence ||
            "unknown"
        );

        setMode(
          result.mode ||
            "unknown"
        );

        setMessage(
          result.message ||
            ""
        );

        // Highlight the floor containing
        // the returned route.
        const firstRouteNode =
          building.nodes.find(
            (node) =>
              node.id ===
              result.route?.[0]
          );

        if (firstRouteNode) {
          setSelectedFloor(
            firstRouteNode.floor
          );
        }
      },
      [
        building,
        floors,
        mobility,
      ]
    );

  const generateRoute =
    useCallback(
      async (
        sensors: unknown[] = []
      ) => {
        const token = getToken();

        if (!token) {
          window.location.href =
            "/login";
          return;
        }

        if (!startNode) {
          setMessage(
            "Select a starting location first."
          );
          return;
        }

        try {
          const response =
            await fetch(
              `${API_BASE_URL}/api/v1/evacuation/route`,
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                  Authorization:
                    `Bearer ${token}`,
                },
                body: JSON.stringify({
                  start: startNode,
                  destination:
                    destination === "AUTO"
                      ? null
                      : destination,
                  mobility,
                  sensors,
                }),
              }
            );

          const result =
            (await response.json()) as BackendRouteResponse;

          if (!response.ok) {
            throw new Error(
              result.message ||
                "Route calculation failed."
            );
          }

          applyBackendResult(
            result
          );
        } catch (routeError) {
          console.error(
            routeError
          );

          setMessage(
            routeError instanceof Error
              ? routeError.message
              : "Unable to calculate route."
          );
        }
      },
      [
        startNode,
        destination,
        mobility,
        applyBackendResult,
      ]
    );

  const buildScenarioSensors =
    useCallback(
      (selectedScenario: Scenario) => {
        switch (
          selectedScenario
        ) {
          case "fire":
            return [
              {
                id: "T1",
                type: "temperature",
                location: startNode,
                value: 85,
                available: true,
              },
              {
                id: "S1",
                type: "smoke",
                location: startNode,
                value: 90,
                available: true,
              },
            ];

          case "sensor_failure":
            return [
              {
                id: "T1",
                type: "temperature",
                location: startNode,
                value: null,
                available: false,
              },
              {
                id: "S1",
                type: "smoke",
                location: startNode,
                value: null,
                available: false,
              },
            ];

          case "exit_closed":
            return [
              {
                id: "D1",
                type: "door",
                location:
                  destination &&
                  destination !== "AUTO"
                    ? destination
                    : "EXIT1",
                value: "closed",
                available: true,
              },
            ];

          case "corridor_blocked":
            return [
              {
                id: "C1",
                type: "blocked_corridor",
                location: startNode,
                value: "blocked",
                available: true,
              },
            ];

          case "congestion":
            return [
              {
                id: "O1",
                type: "occupancy",
                location: startNode,
                value: 100,
                available: true,
              },
            ];

          default:
            return [];
        }
      },
      [
        startNode,
        destination,
      ]
    );

  const startLiveSimulation =
    useCallback(() => {
      closeSocket();

      if (!building || !startNode) {
        setMessage(
          "Building or starting location is unavailable."
        );
        return;
      }

      const wsDestination =
        destination || "AUTO";

      const socket =
        new WebSocket(
          `${WS_BASE_URL}/ws/evacuation/${encodeURIComponent(
            startNode
          )}/${encodeURIComponent(
            wsDestination
          )}/${encodeURIComponent(
            mobility
          )}`
        );

      socketRef.current =
        socket;

      socket.onopen = () => {
        setConnected(true);
        setSimulationRunning(
          true
        );

        socket.send(
          JSON.stringify({
            sensors:
              buildScenarioSensors(
                scenario
              ),
          })
        );
      };

      socket.onmessage = (
        event
      ) => {
        try {
          const payload =
            JSON.parse(
              event.data
            );

          if (
            payload.type ===
            "route_update"
          ) {
            applyBackendResult(
              payload.data as BackendRouteResponse
            );
          }
        } catch (
          parseError
        ) {
          console.error(
            parseError
          );
        }
      };

      socket.onerror = () => {
        setConnected(false);
        setMessage(
          "Realtime evacuation connection failed."
        );
      };

      socket.onclose = () => {
        setConnected(false);
      };
    },
    [
      building,
      startNode,
      destination,
      mobility,
      scenario,
      buildScenarioSensors,
      applyBackendResult,
      closeSocket,
    ]);

  const stopSimulation =
    useCallback(() => {
      closeSocket();
      setSimulationRunning(
        false
      );
      setMessage(
        "Evacuation simulation stopped."
      );
    }, [closeSocket]);

  const handleSimulation =
    useCallback(() => {
      if (simulationRunning) {
        stopSimulation();
        return;
      }

      startLiveSimulation();
    }, [
      simulationRunning,
      startLiveSimulation,
      stopSimulation,
    ]);

  const saveCurrentSimulation =
    useCallback(
      async () => {
        const token =
          getToken();

        if (!token) {
          window.location.href =
            "/login";
          return;
        }

        if (!startNode) {
          setMessage(
            "Select a starting location first."
          );
          return;
        }

        if (!routes.length) {
          setMessage(
            "Generate an evacuation route first."
          );
          return;
        }

        try {
          const response =
            await fetch(
              `${API_BASE_URL}/api/v1/simulations`,
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
                    "S33 Building",
                  start_node:
                    startNode,
                  destination:
                    destination ===
                    "AUTO"
                      ? null
                      : destination,
                  mobility,
                  scenario,
                  route:
                    routes.flatMap(
                      (route) =>
                        route.path.map(
                          (point) =>
                            `${point.x},${point.y}`
                        )
                    ),
                  hazards,
                  confidence,
                  mode,
                }),
              }
            );

          const result =
            await response.json();

          if (!response.ok) {
            throw new Error(
              result.detail ||
                "Unable to save simulation."
            );
          }

          setMessage(
            "Simulation saved successfully."
          );

          await loadSimulationHistory();
        } catch (
          saveError
        ) {
          console.error(
            saveError
          );

          setMessage(
            saveError instanceof Error
              ? saveError.message
              : "Unable to save simulation."
          );
        }
      },
      [
        startNode,
        routes,
        destination,
        mobility,
        scenario,
        hazards,
        confidence,
        mode,
        loadSimulationHistory,
      ]
    );

  useEffect(() => {
    void loadBuilding();
    void loadSimulationHistory();

    return () => {
      closeSocket();
    };
  }, [
    loadBuilding,
    loadSimulationHistory,
    closeSocket,
  ]);

  useEffect(() => {
    if (!building || !startNode) {
      return;
    }

    void generateRoute(
      buildScenarioSensors(
        "normal"
      )
    );
  }, [
    building,
    startNode,
  ]);

  useEffect(() => {
    if (
      !building ||
      !simulationRunning ||
      !socketRef.current ||
      socketRef.current.readyState !==
        WebSocket.OPEN
    ) {
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        sensors:
          buildScenarioSensors(
            scenario
          ),
      })
    );
  }, [
    scenario,
    buildScenarioSensors,
    building,
    simulationRunning,
  ]);

  const handleSelectFloor =
    useCallback(
      (floorNum: number | "ALL") => {
        if (floorNum === "ALL") {
          setVisibleFloor("ALL");
          return;
        }
        setVisibleFloor(floorNum);
        setSelectedFloor(floorNum);

        const floorNode =
          building?.nodes.find(
            (node) =>
              node.floor ===
              floorNum &&
              node.type !==
                "exit"
          );

        if (floorNode) {
          setStartNode(
            floorNode.id
          );
        }

        if (!simulationRunning) {
          void generateRoute();
        }
      },
      [
        building,
        simulationRunning,
        generateRoute,
      ]
    );

  const handleSelectStart =
    useCallback(
      (value: string) => {
        setStartNode(value);

        const node =
          nodeMap.get(value);

        if (node) {
          setSelectedFloor(
            node.floor
          );
        }
      },
      [nodeMap]
    );

  const handleToggleHazard =
    useCallback(() => {
      const nextScenario =
        scenario === "fire"
          ? "normal"
          : "fire";

      setScenario(
        nextScenario
      );

      if (
        simulationRunning &&
        socketRef.current?.readyState ===
          WebSocket.OPEN
      ) {
        socketRef.current.send(
          JSON.stringify({
            sensors:
              buildScenarioSensors(
                nextScenario
              ),
          })
        );
      }
    }, [
      scenario,
      simulationRunning,
      buildScenarioSensors,
    ]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="rounded-2xl border border-zinc-200 bg-white px-8 py-6 shadow-sm">
          <div className="text-sm font-bold text-zinc-900">
            Loading evacuation digital twin...
          </div>
        </div>
      </main>
    );
  }

  if (
    error ||
    !building ||
    !currentFloor
  ) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="max-w-lg rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
          <div className="text-xs font-black uppercase tracking-wider text-red-600">
            Digital Twin Error
          </div>

          <h1 className="mt-2 text-xl font-black text-zinc-950">
            Unable to load building
          </h1>

          <p className="mt-3 text-sm text-zinc-500">
            {error ||
              "No building data was returned by the backend."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <DashboardShell
      selectedFloor={
        selectedFloor
      }
      onSelectFloor={
        handleSelectFloor
      }
      simulationRunning={
        simulationRunning
      }
      hazardsCount={
        hazards.length
      }
      buildingName="S33 Building"
      floors={availableFloors}
    >
      <div className="grid min-h-[calc(100vh-6.5rem)] grid-cols-1 lg:grid-cols-[290px_minmax(0,1fr)_310px]">

        {/* LEFT CONTROL PANEL */}

        <SimulationPanel
          hazards={hazards}
          occupants={occupants}
          simulationRunning={
            simulationRunning
          }
          selectedBuilding={selectedBuilding}
          hasCustomBuilding={true}
          customBuildingFloorCount={
            floors.length
          }
          onSelectBuilding={(building) => {
  setSelectedBuilding(building);
}}
          onToggleSimulation={
            handleSimulation
          }
          onToggleHazard={
            handleToggleHazard
          }
        />

        {/* CENTER 3D DIGITAL TWIN */}

        <main className="min-w-0 p-4 flex flex-col bg-[#F8FAFC]">
          <div className="flex-1 min-h-[700px] flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-xs overflow-hidden relative">

            <DigitalTwinCanvas3D
              geometry={
                currentFloor
              }
              occupants={
                occupants
              }
              hazards={
                hazards
              }
              routes={
                routes
              }
              allFloors={
                floors
              }
              className="h-full w-full flex-1"
            />

            {/* SIMPLE SIMULATION CONTROLS */}

            <div className="absolute bottom-20 left-5 z-30 w-[280px] rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-lg backdrop-blur-xl">

              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
                Live evacuation
              </div>

              <div className="mt-3 space-y-3">

                <div>
                  <label
                    htmlFor="start-node"
                    className="mb-1 block text-xs font-bold text-zinc-600"
                  >
                    Start location
                  </label>

                  <select
                    id="start-node"
                    value={startNode}
                    onChange={(event) =>
                      handleSelectStart(
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 outline-none"
                  >
                    {startOptions.map(
                      (node) => (
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
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="destination"
                    className="mb-1 block text-xs font-bold text-zinc-600"
                  >
                    Destination
                  </label>

                  <select
                    id="destination"
                    value={
                      destination ??
                      "AUTO"
                    }
                    onChange={(event) =>
                      setDestination(
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 outline-none"
                  >
                    <option value="AUTO">
                      Automatic safe exit
                    </option>

                    {exitOptions.map(
                      (exit) => (
                        <option
                          key={exit.id}
                          value={exit.id}
                        >
                          {exit.id}
                          {exit.label
                            ? ` — ${exit.label}`
                            : ""}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="mobility"
                    className="mb-1 block text-xs font-bold text-zinc-600"
                  >
                    Mobility profile
                  </label>

                  <select
                    id="mobility"
                    value={
                      mobility
                    }
                    onChange={(
                      event
                    ) =>
                      setMobility(
                        event.target
                          .value as MobilityProfile
                      )
                    }
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 outline-none"
                  >
                    {MOBILITY_OPTIONS.map(
                      (option) => (
                        <option
                          key={
                            option.value
                          }
                          value={
                            option.value
                          }
                        >
                          {
                            option.label
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="scenario"
                    className="mb-1 block text-xs font-bold text-zinc-600"
                  >
                    Scenario
                  </label>

                  <select
                    id="scenario"
                    value={
                      scenario
                    }
                    onChange={(
                      event
                    ) =>
                      setScenario(
                        event.target
                          .value as Scenario
                      )
                    }
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 outline-none"
                  >
                    {SCENARIO_OPTIONS.map(
                      (option) => (
                        <option
                          key={
                            option.value
                          }
                          value={
                            option.value
                          }
                        >
                          {
                            option.label
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    simulationRunning
                      ? stopSimulation()
                      : startLiveSimulation()
                  }
                  className={`w-full rounded-lg px-4 py-2.5 text-xs font-black uppercase tracking-wider transition ${
                    simulationRunning
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-zinc-950 text-white hover:bg-zinc-800"
                  }`}
                >
                  {simulationRunning
                    ? "Stop simulation"
                    : "Start simulation"}
                </button>

                {routes.length >
                  0 && (
                  <button
                    type="button"
                    onClick={
                      saveCurrentSimulation
                    }
                    className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-xs font-black text-zinc-700 hover:bg-zinc-50"
                  >
                    Save simulation
                  </button>
                )}

                {message && (
                  <div className="rounded-lg bg-zinc-50 p-3 text-[11px] leading-5 text-zinc-600">
                    {message}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                  <div className="rounded-lg bg-zinc-50 p-2">
                    <div className="text-zinc-400">
                      Connection
                    </div>
                    <div
                      className={
                        connected
                          ? "mt-1 text-emerald-600"
                          : "mt-1 text-zinc-500"
                      }
                    >
                      {connected
                        ? "LIVE"
                        : "OFFLINE"}
                    </div>
                  </div>

                  <div className="rounded-lg bg-zinc-50 p-2">
                    <div className="text-zinc-400">
                      Confidence
                    </div>
                    <div className="mt-1 text-zinc-800 uppercase">
                      {confidence}
                    </div>
                  </div>
                </div>

                {mode ===
                  "conservative" && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="text-xs font-black text-amber-700">
                      ⚠ Conservative mode
                    </div>

                    <div className="mt-1 text-[10px] leading-4 text-amber-700">
                      Sensor data is unavailable.
                      The route is advisory.
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </main>

        {/* RIGHT INTELLIGENCE PANEL */}

        <StatusPanel
          occupants={
            occupants
          }
          routes={routes}
          hazards={hazards}
          simulationRunning={
            simulationRunning
          }
        />

      </div>

      {/* SIMULATION HISTORY */}

      <section className="border-t border-zinc-200 bg-white p-6">

        <div className="mx-auto max-w-7xl">

          <div className="flex items-center justify-between">

            <div>
              <div className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">
                Evacuation records
              </div>

              <h2 className="mt-1 text-lg font-black text-zinc-900">
                Simulation history
              </h2>
            </div>

            <div className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-black text-zinc-600">
              {simulationHistory.length} saved
            </div>

          </div>

          {simulationHistory.length ===
            0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center">
              <div className="text-sm font-bold text-zinc-600">
                No saved simulations yet
              </div>

              <div className="mt-1 text-xs text-zinc-400">
                Run an evacuation simulation
                and save it here.
              </div>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {simulationHistory.map(
                (simulation) => (
                  <div
                    key={
                      simulation.id
                    }
                    className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">

                      <div>
                        <div className="text-sm font-black text-zinc-900">
                          {
                            simulation.building_name
                          }
                        </div>

                        <div className="mt-1 text-xs text-zinc-500">
                          {
                            simulation.start_node
                          }
                          {" → "}
                          {
                            simulation.destination ||
                              "AUTO"
                          }
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">

                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase text-emerald-700">
                          {
                            simulation.scenario
                          }
                        </span>

                        <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase text-blue-700">
                          {
                            simulation.mobility
                          }
                        </span>

                        {simulation.confidence && (
                          <span className="rounded-full bg-zinc-200 px-3 py-1 text-[10px] font-black uppercase text-zinc-600">
                            {
                              simulation.confidence
                            }
                          </span>
                        )}

                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-400">
                      <span>
                        {simulation.created_at
                          ? new Date(
                              simulation.created_at
                            ).toLocaleString()
                          : "Recently saved"}
                      </span>

                      <span className="font-bold text-zinc-500">
                        {
                          simulation.route.length
                        } route nodes
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

        </div>
      </section>
    </DashboardShell>
  );
}