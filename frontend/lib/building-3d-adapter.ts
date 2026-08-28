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
// Room Polygon Generation (Voronoi-like, row-based)

function computeRoomBounds(
  rawNode: { x: number; y: number },
  nodeId: string,
  rawPositions: Map<string, { x: number; y: number }>,
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
): { left: number; right: number; top: number; bottom: number } {
  const ROW_TOLERANCE = 80;
  const allNodes = Array.from(rawPositions.entries()).map(([id, pos]) => ({ id, ...pos }));
  const sameRow = allNodes.filter(n => n.id !== nodeId && Math.abs(n.y - rawNode.y) < ROW_TOLERANCE);
  const above = allNodes.filter(n => n.y < rawNode.y - ROW_TOLERANCE);
  const below = allNodes.filter(n => n.y > rawNode.y + ROW_TOLERANCE);

  const leftNeighbors = sameRow.filter(n => n.x < rawNode.x).sort((a, b) => b.x - a.x);
  const rightNeighbors = sameRow.filter(n => n.x > rawNode.x).sort((a, b) => a.x - b.x);
  const leftBound = leftNeighbors.length > 0 ? (rawNode.x + leftNeighbors[0].x) / 2 : bounds.minX;
  const rightBound = rightNeighbors.length > 0 ? (rawNode.x + rightNeighbors[0].x) / 2 : bounds.maxX;

  const verticalNeighbors = [...above, ...below].sort((a, b) => a.y - b.y);
  let avgRowSpacing = 150;
  if (verticalNeighbors.length >= 2) {
    const spacings: number[] = [];
    for (let i = 1; i < verticalNeighbors.length; i++) {
      const sp = verticalNeighbors[i].y - verticalNeighbors[i - 1].y;
      if (sp > 30) spacings.push(sp);
    }
    if (spacings.length > 0) avgRowSpacing = spacings.reduce((s, v) => s + v, 0) / spacings.length;
  } else if (verticalNeighbors.length === 1) {
    avgRowSpacing = Math.abs(verticalNeighbors[0].y - rawNode.y);
  }
  const defaultHalfV = avgRowSpacing * 0.4;
  const topBound = above.length > 0 ? (rawNode.y + above.sort((a, b) => b.y - a.y)[0].y) / 2 : rawNode.y - defaultHalfV;
  const bottomBound = below.length > 0 ? (rawNode.y + below.sort((a, b) => a.y - b.y)[0].y) / 2 : rawNode.y + defaultHalfV;

  function rawToCanvas(rx: number, ry: number) {
    const nx = bounds.maxX === bounds.minX ? 0.5 : (rx - bounds.minX) / (bounds.maxX - bounds.minX);
    const ny = bounds.maxY === bounds.minY ? 0.5 : (ry - bounds.minY) / (bounds.maxY - bounds.minY);
    return { x: 80 + nx * (900 - 160), y: 80 + ny * (650 - 160) };
  }
  const tl = rawToCanvas(leftBound, topBound);
  const br = rawToCanvas(rightBound, bottomBound);
  return { left: tl.x, right: br.x, top: tl.y, bottom: br.y };
}

function generateRoomPolygon(
  node: ApiBuildingNode,
  center: Point,
  edges: ApiBuildingEdge[],
  allPositions: Map<string, Point>,
  rawPositions: Map<string, { x: number; y: number }>,
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
): Point[] {
  const type = node.type.toLowerCase();

  if (type === "exit") {
    const s = 14;
    return [
      { x: center.x - s, y: center.y - s },
      { x: center.x + s, y: center.y - s },
      { x: center.x + s, y: center.y + s },
      { x: center.x - s, y: center.y + s },
    ];
  }

  if (type === "stairs") {
    const s = 24;
    return [
      { x: center.x - s, y: center.y - s },
      { x: center.x + s, y: center.y - s },
      { x: center.x + s, y: center.y + s },
      { x: center.x - s, y: center.y + s },
    ];
  }

  if (type === "elevator") {
    const s = 18;
    return [
      { x: center.x - s, y: center.y - s },
      { x: center.x + s, y: center.y - s },
      { x: center.x + s, y: center.y + s },
      { x: center.x - s, y: center.y + s },
    ];
  }

  if (type === "corridor" || type === "lobby") {
    const rawNode = rawPositions.get(node.id) || { x: 500, y: 350 };
    const allRaw = Array.from(rawPositions.entries());
    const rawXs = allRaw.map(([, p]) => p.x);
    const buildingWidth = Math.max(...rawXs) - Math.min(...rawXs);
    const rawHalfW = buildingWidth / 2 + 20;
    const aboveY = allRaw.filter(([id, p]) => id !== node.id && p.y < rawNode.y - 40).map(([, p]) => p.y);
    const belowY = allRaw.filter(([id, p]) => id !== node.id && p.y > rawNode.y + 40).map(([, p]) => p.y);
    const gapAbove = aboveY.length > 0 ? rawNode.y - Math.max(...aboveY) : 100;
    const gapBelow = belowY.length > 0 ? Math.min(...belowY) - rawNode.y : 100;
    const rawHalfH = Math.min(gapAbove, gapBelow) * 0.45;
    function rawToCanvas(rx: number, ry: number) {
      const nx = bounds.maxX === bounds.minX ? 0.5 : (rx - bounds.minX) / (bounds.maxX - bounds.minX);
      const ny = bounds.maxY === bounds.minY ? 0.5 : (ry - bounds.minY) / (bounds.maxY - bounds.minY);
      return { x: 80 + nx * (900 - 160), y: 80 + ny * (650 - 160) };
    }
    const tl = rawToCanvas(rawNode.x - rawHalfW, rawNode.y - rawHalfH);
    const br = rawToCanvas(rawNode.x + rawHalfW, rawNode.y + rawHalfH);
    return [
      { x: tl.x, y: tl.y }, { x: br.x, y: tl.y },
      { x: br.x, y: br.y }, { x: tl.x, y: br.y },
    ];
  }

  const rawNode = rawPositions.get(node.id) || { x: 500, y: 350 };
  const vBounds = computeRoomBounds(rawNode, node.id, rawPositions, bounds);
  return [
    { x: vBounds.left, y: vBounds.top }, { x: vBounds.right, y: vBounds.top },
    { x: vBounds.right, y: vBounds.bottom }, { x: vBounds.left, y: vBounds.bottom },
  ];
}

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
  const rawPositions = new Map<string, { x: number; y: number }>();
  for (const node of data.nodes) {
    positions.set(node.id, transformNodeToCanvas(node, bounds));
    rawPositions.set(node.id, { x: node.x, y: node.y });
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
          positions,
          rawPositions,
          bounds
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

        // Doors (placed at room polygon boundary)
    function findDoorPosition(fromPos: Point, toPos: Point, fromNodeId: string, toNodeId: string, roomPolygons: Map<string, Point[]>): Point {
      const fromPoly = roomPolygons.get(fromNodeId);
      const toPoly = roomPolygons.get(toNodeId);
      const poly = fromPoly || toPoly;
      const polyCenter = fromPoly ? fromPos : toPos;
      const otherPos = fromPoly ? toPos : fromPos;
      if (poly && poly.length >= 3) {
        let bestPoint = { x: (fromPos.x + toPos.x) / 2, y: (fromPos.y + toPos.y) / 2 };
        const dx = otherPos.x - polyCenter.x;
        const dy = otherPos.y - polyCenter.y;
        const lineLen = Math.hypot(dx, dy);
        if (lineLen < 0.01) return bestPoint;
        let bestT = Infinity;
        for (let i = 0; i < poly.length; i++) {
          const p1 = poly[i];
          const p2 = poly[(i + 1) % poly.length];
          const ex = p2.x - p1.x; const ey = p2.y - p1.y;
          const denom = dx * ey - dy * ex;
          if (Math.abs(denom) < 0.001) continue;
          const t = ((p1.x - polyCenter.x) * ey - (p1.y - polyCenter.y) * ex) / denom;
          const u = ((p1.x - polyCenter.x) * dy - (p1.y - polyCenter.y) * dx) / denom;
          if (t > 0.01 && t < 2.0 && u >= -0.05 && u <= 1.05) {
            const dist = Math.abs(t - 1.0);
            if (dist < bestT) { bestT = dist; bestPoint = { x: polyCenter.x + t * dx, y: polyCenter.y + t * dy }; }
          }
        }
        return bestPoint;
      }
      return { x: (fromPos.x + toPos.x) / 2, y: (fromPos.y + toPos.y) / 2 };
    }
    const roomPolygons = new Map<string, Point[]>();
    for (const room of rooms) { roomPolygons.set(room.id, room.polygon); }

    const doors: Door[] = floorEdges
      .filter((e) => e.type !== "stairs" && e.type !== "elevator")
      .map((edge, index) => {
        const from = positions.get(edge.from_node) || { x: 500, y: 350 };
        const to = positions.get(edge.to_node) || { x: 500, y: 350 };
        
        // Use door_x/door_y from edge if available, otherwise calculate position
        let doorPos: Point;
        const edgeAny = edge as any;
        if (edgeAny.door_x !== undefined && edgeAny.door_y !== undefined) {
          // Transform raw AI coordinates to canvas space
          doorPos = transformNodeToCanvas(
            { x: edgeAny.door_x, y: edgeAny.door_y },
            bounds
          );
        } else {
          // Fallback to intersection calculation
          doorPos = findDoorPosition(from, to, edge.from_node, edge.to_node, roomPolygons);
        }
        
        return {
          id: `AI_DOOR_${'${floorLevel}'}_${'${index}'}`,
          position: doorPos,
          connects: [edge.from_node, edge.to_node] as [string, string],
          accessible: edge.accessible,
          confidence: "high" as const,
          angle: Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI),
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
