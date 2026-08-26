/**
 * Building3DAdapter
 *
 * Converts backend AI-generated building JSON (nodes + edges) into the
 * FloorGeometry format consumed by the existing Three.js renderer.
 *
 * Architecture:
 *   Backend JSON { building, nodes, edges }
 *       ↓
 *   Building3DAdapter
 *       ↓
 *   FloorGeometry[] (rooms, doors, exits, stairwells)
 *       ↓
 *   existing Three.js renderer (three-building-generator.ts)
 *       ↓
 *   3D representation of THAT building
 */

import type {
  FloorGeometry,
  Room,
  Door,
  ExitPoint,
  Stairwell,
  Point,
  RoomType,
  MobilityProfile,
  Occupant,
} from "./schema";

// ──────────────────────────────────────────────
// Backend API Types
// ──────────────────────────────────────────────

export type ApiBuildingNode = {
  id: string;
  x: number;
  y: number;
  floor: number;
  type: string;
  label: string;
};

export type ApiBuildingEdge = {
  from_node: string;
  to_node: string;
  weight: number;
  type: string;
  accessible: boolean;
};

/**
 * Normalizes an edge from any key format to from_node/to_node.
 * Handles both {from, to} (backend aliases) and {from_node, to_node} formats.
 */
function normalizeEdgeKeys(edge: any): ApiBuildingEdge {
  return {
    from_node: edge.from_node || edge.from || "",
    to_node: edge.to_node || edge.to || "",
    weight: edge.weight ?? 1,
    type: edge.type || "corridor",
    accessible: edge.accessible ?? true,
  };
}

export type ApiBuildingResponse = {
  building: {
    building: {
      id: string;
      name: string;
      floors: number;
    };
    nodes: ApiBuildingNode[];
    edges: ApiBuildingEdge[];
  };
};

export type ApiBuilding = {
  nodes: ApiBuildingNode[];
  edges: ApiBuildingEdge[];
};

// ──────────────────────────────────────────────
// Bounds Calculation
// ──────────────────────────────────────────────

function calculateBounds(nodes: ApiBuildingNode[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x);
    maxY = Math.max(maxY, node.y);
  }

  if (!isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 1000, maxY: 800 };
  }

  return { minX, minY, maxX, maxY };
}

// ──────────────────────────────────────────────
// Coordinate Transformation
// ──────────────────────────────────────────────

/**
 * Transforms backend node coordinates to the SVG canvas coordinates
 * used by the Three.js renderer.
 */
function transformNodeToCanvas(
  node: { x: number; y: number },
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  config: { padding: number; targetWidth: number; targetHeight: number } = {
    padding: 80,
    targetWidth: 900,
    targetHeight: 650,
  }
): Point {
  const { padding, targetWidth, targetHeight } = config;

  const normalX =
    bounds.maxX === bounds.minX
      ? 0.5
      : (node.x - bounds.minX) / (bounds.maxX - bounds.minX);
  const normalY =
    bounds.maxY === bounds.minY
      ? 0.5
      : (node.y - bounds.minY) / (bounds.maxY - bounds.minY);

  return {
    x: padding + normalX * (targetWidth - 2 * padding),
    y: padding + normalY * (targetHeight - 2 * padding),
  };
}

// ──────────────────────────────────────────────
// Room Polygon Generation
// ──────────────────────────────────────────────

function generateRoomPolygon(
  node: ApiBuildingNode,
  center: Point,
  edges: ApiBuildingEdge[],
  allPositions: Map<string, Point>
): Point[] {
  const type = node.type.toLowerCase();

  let halfWidth = 45;
  let halfHeight = 28;

  switch (type) {
    case "corridor": {
      halfWidth = 200;
      halfHeight = 22;

      // Try to stretch corridor along connected nodes
      const connectedPositions = edges
        .filter((e) => e.from_node === node.id || e.to_node === node.id)
        .map((e) => {
          const otherId =
            e.from_node === node.id ? e.to_node : e.from_node;
          return allPositions.get(otherId);
        })
        .filter((p): p is Point => p !== undefined);

      if (connectedPositions.length >= 2) {
        const xs = connectedPositions.map((p) => p.x);
        const ys = connectedPositions.map((p) => p.y);
        const spreadX = Math.max(...xs) - Math.min(...xs);
        const spreadY = Math.max(...ys) - Math.min(...ys);

        if (spreadX > spreadY) {
          halfWidth = Math.max(150, spreadX / 2 + 60);
          halfHeight = 22;
        } else {
          halfWidth = 22;
          halfHeight = Math.max(120, spreadY / 2 + 60);
        }
      }
      break;
    }
    case "room":
    case "office":
      halfWidth = 48;
      halfHeight = 32;
      break;
    case "lobby":
      halfWidth = 55;
      halfHeight = 35;
      break;
    case "meeting_room":
      halfWidth = 58;
      halfHeight = 38;
      break;
    case "break_room":
      halfWidth = 50;
      halfHeight = 35;
      break;
    case "restroom":
    case "male_restroom":
    case "female_restroom":
      halfWidth = 42;
      halfHeight = 35;
      break;
    case "stairs":
      halfWidth = 38;
      halfHeight = 45;
      break;
    case "elevator":
      halfWidth = 28;
      halfHeight = 28;
      break;
    case "exit":
      halfWidth = 22;
      halfHeight = 22;
      break;
    default:
      halfWidth = 45;
      halfHeight = 30;
  }

  return [
    { x: center.x - halfWidth, y: center.y - halfHeight },
    { x: center.x + halfWidth, y: center.y - halfHeight },
    { x: center.x + halfWidth, y: center.y + halfHeight },
    { x: center.x - halfWidth, y: center.y + halfHeight },
  ];
}

// ──────────────────────────────────────────────
// Main Adapter
// ──────────────────────────────────────────────

/**
 * Converts a backend API building response to the internal ApiBuilding format.
 */
export function normalizeApiBuilding(
  response: ApiBuildingResponse
): ApiBuilding {
  return {
    nodes: response.building.nodes,
    edges: response.building.edges,
  };
}

/**
 * Adapter result containing all transformed data.
 */
export interface AdaptedBuilding {
  floors: FloorGeometry[];
  occupants: Occupant[];
  positions: Map<string, Point>;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

/**
 * Converts backend building nodes and edges into FloorGeometry[] and Occupant[].
 *
 * This is the main adapter function that bridges the AI-generated
 * building graph to the existing Three.js renderer.
 */
export function adaptBuilding(data: ApiBuilding): AdaptedBuilding {
  // Calculate global bounds for coordinate transformation
  const bounds = calculateBounds(data.nodes);

  // Build position map for all nodes (transformed to canvas coords)
  const positions = new Map<string, Point>();
  for (const node of data.nodes) {
    positions.set(node.id, transformNodeToCanvas(node, bounds));
  }

  // Normalize all edge keys to from_node/to_node
  const normalizedEdges = data.edges.map(normalizeEdgeKeys);

  // Group nodes by floor level
  const floorLevels = Array.from(
    new Set(data.nodes.map((node) => node.floor))
  ).sort((a, b) => a - b);

  const floors: FloorGeometry[] = floorLevels.map((floorLevel) => {
    const floorNodes = data.nodes.filter((node) => node.floor === floorLevel);
    const floorNodeIds = new Set(floorNodes.map((node) => node.id));

    // Filter edges for this floor (both endpoints on this floor)
    const floorEdges = normalizedEdges.filter(
      (e) =>
        floorNodeIds.has(e.from_node) && floorNodeIds.has(e.to_node)
    );

    // ── Rooms ──
    const rooms: Room[] = floorNodes
      .filter((node) =>
        [
          "room",
          "corridor",
          "lobby",
          "meeting_room",
          "break_room",
          "restroom",
          "office",
        ].includes(node.type.toLowerCase())
      )
      .map((node) => {
        const center = positions.get(node.id) || { x: 500, y: 350 };
        const polygon = generateRoomPolygon(
          node,
          center,
          floorEdges,
          positions
        );

        let roomType: RoomType = "office";
        const t = node.type.toLowerCase();
        if (t === "corridor") roomType = "corridor";
        else if (t === "lobby") roomType = "lobby";
        else if (t === "meeting_room") roomType = "meeting_room";
        else if (t === "break_room") roomType = "break_room";

        return {
          id: node.id,
          label: node.label || node.id,
          type: roomType,
          polygon,
          confidence: "high" as const,
        };
      });

    // ── Doors ──
    const doors: Door[] = floorEdges
      .filter(
        (e) =>
          e.type !== "stairs" &&
          e.type !== "elevator"
      )
      .map((edge, index) => {
        const from = positions.get(edge.from_node) || { x: 500, y: 350 };
        const to = positions.get(edge.to_node) || { x: 500, y: 350 };

        return {
          id: `AI_DOOR_${floorLevel}_${index}`,
          position: {
            x: (from.x + to.x) / 2,
            y: (from.y + to.y) / 2,
          },
          connects: [edge.from_node, edge.to_node] as [string, string],
          accessible: edge.accessible,
          confidence: "high" as const,
          angle:
            Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI),
        };
      });

    // ── Stairwells ──
    const stairwells: Stairwell[] = floorNodes
      .filter(
        (node) =>
          node.type.toLowerCase() === "stairs" ||
          node.type.toLowerCase() === "stair"
      )
      .map((node) => {
        const center = positions.get(node.id) || { x: 500, y: 350 };
        return {
          id: node.id,
          polygon: [
            { x: center.x - 38, y: center.y - 45 },
            { x: center.x + 38, y: center.y - 45 },
            { x: center.x + 38, y: center.y + 45 },
            { x: center.x - 38, y: center.y + 45 },
          ],
        };
      });

    // ── Exits ──
    const exits: ExitPoint[] = floorNodes
      .filter((node) => node.type.toLowerCase() === "exit")
      .map((node) => {
        const position = positions.get(node.id) || { x: 500, y: 350 };

        // Determine exit direction based on position relative to building center
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        const centerCanvas = transformNodeToCanvas(
          { x: centerX, y: centerY },
          bounds
        );

        let direction: "up" | "down" | "left" | "right" = "right";
        if (position.y < centerCanvas.y - 50) direction = "up";
        else if (position.y > centerCanvas.y + 50) direction = "down";
        else if (position.x < centerCanvas.x - 50) direction = "left";

        return {
          id: node.id,
          position,
          accessible: true,
          direction,
        };
      });

    return {
      floorLevel,
      rooms,
      doors,
      exits,
      stairwells,
      connections: [],
      buildingOutline: undefined,
      hazards: [],
    };
  });

  // ── Occupants ──
  const candidates = data.nodes.filter(
    (node) =>
      node.type.toLowerCase() === "room" ||
      node.type.toLowerCase() === "lobby" ||
      node.type.toLowerCase() === "meeting_room" ||
      node.type.toLowerCase() === "break_room"
  );

  const profiles: MobilityProfile[] = [
    "normal",
    "normal",
    "normal",
    "wheelchair",
    "elderly",
    "child",
    "temporary_injury",
    "first_responder",
  ];

  const occupants: Occupant[] = candidates.map((node, index) => {
    const floor = floors.find(
      (f) => f.floorLevel === node.floor
    );

    const room = floor?.rooms.find(
      (r) => r.id === node.id
    );

    let position: Point = positions.get(node.id) || { x: 500, y: 350 };

    if (room && room.polygon.length > 0) {
      const sumX = room.polygon.reduce((acc, p) => acc + p.x, 0);
      const sumY = room.polygon.reduce((acc, p) => acc + p.y, 0);
      position = {
        x: sumX / room.polygon.length,
        y: sumY / room.polygon.length,
      };
    }

    return {
      id: `ai-occupant-${index + 1}`,
      roomId: node.id,
      position,
      profile: profiles[index % profiles.length],
      floorLevel: node.floor,
    };
  });

  return {
    floors,
    occupants,
    positions,
    bounds,
  };
}

/**
 * Helper to adapt a full API response (with nested building object).
 */
export function adaptApiResponse(
  response: ApiBuildingResponse
): AdaptedBuilding {
  return adaptBuilding(normalizeApiBuilding(response));
}

/**
 * Converts a node ID to canvas coordinates using pre-computed positions.
 */
export function nodeIdToCanvasPosition(
  nodeId: string,
  positions: Map<string, Point>
): Point | null {
  return positions.get(nodeId) || null;
}

/**
 * Converts an array of node IDs (a route) to canvas coordinates.
 */
export function routeToCanvasPath(
  nodeIds: string[],
  positions: Map<string, Point>
): Point[] {
  return nodeIds
    .map((id) => positions.get(id))
    .filter((p): p is Point => p !== undefined);
}
