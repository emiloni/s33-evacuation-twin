import type {
  Building,
  FloorGeometry,
  Room,
  Door,
  ExitPoint,
  Stairwell,
  Point,
  RoomType,
} from "@/lib/schema";

export interface ApiBuildingNode {
  id: string;
  x: number;
  y: number;
  floor: number;
  type: string;
  label: string;
}

export interface ApiBuildingEdge {
  from: string;
  to: string;
  weight: number;
  type: string;
  accessible: boolean;
}

interface ApiBuilding {
  nodes: ApiBuildingNode[];
  edges: ApiBuildingEdge[];
}

/*
 * ------------------------------------------------------------
 * S33 FLOOR-PLAN DISPLAY COORDINATES
 * ------------------------------------------------------------
 *
 * Backend coordinates are small:
 *
 * x: 100 → 400
 * y: 100 → 300
 *
 * The friend's FloorPlanSVG uses a larger SVG canvas.
 * These functions scale the backend coordinates into
 * a cleaner architectural layout.
 */

function createFloorPositions(
  nodes: ApiBuildingNode[],
  _edges: ApiBuildingEdge[] = []
): Map<string, Point> {
  const positions = new Map<string, Point>();

  nodes.forEach((node) => {
    positions.set(node.id, {
      x: 150 + node.x * 1.45,
      y: 80 + node.y * 1.15,
    });
  });

  const points = [...positions.values()];

  if (points.length) {
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));
    const needsFit = minX < 130 || maxX > 870 || minY < 120 || maxY > 650;

    if (needsFit) {
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const scale = Math.min(
        1,
        740 / Math.max(maxX - minX, 1),
        530 / Math.max(maxY - minY, 1)
      );

      positions.forEach((point, id) => {
        positions.set(id, {
          x: 500 + (point.x - centerX) * scale,
          y: 390 + (point.y - centerY) * scale,
        });
      });
    }
  }

  return positions;
}

export function getFloorNodePoint(
  node: ApiBuildingNode,
  floorNodes: ApiBuildingNode[],
  floorEdges: ApiBuildingEdge[] = []
): Point {
  return createFloorPositions(floorNodes, floorEdges).get(node.id) ?? {
    x: 500,
    y: 400,
  };
}

/*
 * ------------------------------------------------------------
 * RECTANGLE
 * ------------------------------------------------------------
 */

function rectangle(
  center: Point,
  width: number,
  height: number
): Point[] {
  const halfW = width / 2;
  const halfH = height / 2;

  return [
    {
      x: center.x - halfW,
      y: center.y - halfH,
    },
    {
      x: center.x + halfW,
      y: center.y - halfH,
    },
    {
      x: center.x + halfW,
      y: center.y + halfH,
    },
    {
      x: center.x - halfW,
      y: center.y + halfH,
    },
  ];
}

/*
 * ------------------------------------------------------------
 * NODE SIZE
 * ------------------------------------------------------------
 */

function getNodeSize(
  type: string,
  nodeCount: number
): {
  width: number;
  height: number;
} {
  const scale =
    nodeCount > 18 ? 0.65 :
    nodeCount > 12 ? 0.78 :
    nodeCount > 8 ? 0.9 : 1;

  switch (type) {
    case "room":
      return {
        width: 124 * scale,
        height: 76 * scale,
      };

    case "corridor":
      return {
        width: 140 * scale,
        height: 48 * scale,
      };

    case "stairs":
      return {
        width: 82 * scale,
        height: 96 * scale,
      };

    case "elevator":
      return {
        width: 82 * scale,
        height: 96 * scale,
      };

    case "exit":
      return {
        width: 78 * scale,
        height: 56 * scale,
      };

    default:
      return {
        width: 94 * scale,
        height: 66 * scale,
      };
  }
}

/*
 * ------------------------------------------------------------
 * ROOM TYPE
 * ------------------------------------------------------------
 */

function getRoomType(
  type: string
): RoomType {
  switch (type) {
    case "room":
      return "office";

    case "corridor":
      return "corridor";

    case "lobby":
      return "lobby";

    case "meeting_room":
      return "meeting_room";

    case "break_room":
      return "break_room";

    default:
      return "other";
  }
}

/*
 * ------------------------------------------------------------
 * BUILDING OUTLINE
 * ------------------------------------------------------------
 *
 * Keep the actual building compact so the map does not
 * occupy only the top-left corner of the SVG.
 */

function createBuildingOutline(
  positions: Map<string, Point>,
  nodes: ApiBuildingNode[]
): Point[] {
  const points = nodes
    .map((node) => positions.get(node.id))
    .filter((point): point is Point => Boolean(point));

  if (!points.length) {
    return [];
  }

  const padding = 78;
  const minX = Math.max(35, Math.min(...points.map((point) => point.x)) - padding);
  const maxX = Math.min(965, Math.max(...points.map((point) => point.x)) + padding);
  const minY = Math.max(42, Math.min(...points.map((point) => point.y)) - padding);
  const maxY = Math.min(740, Math.max(...points.map((point) => point.y)) + padding);

  return [
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

/*
 * ------------------------------------------------------------
 * ROOMS + CORRIDORS
 * ------------------------------------------------------------
 */

function createRooms(
  nodes: ApiBuildingNode[],
  positions: Map<string, Point>
): Room[] {
  return nodes
    .filter(
      (node) =>
        node.type === "room" ||
        node.type === "corridor" ||
        node.type === "lobby" ||
        node.type === "meeting_room" ||
        node.type === "break_room"
    )
    .map((node) => {
      const center = positions.get(node.id)!;

      const size = getNodeSize(
        node.type,
        nodes.length
      );

      return {
        id: node.id,
        label:
          node.label || node.id,
        type: getRoomType(
          node.type
        ),
        polygon: rectangle(
          center,
          size.width,
          size.height
        ),
        confidence: "high",
      };
    });
}

/*
 * ------------------------------------------------------------
 * STAIRWELLS
 * ------------------------------------------------------------
 */

function createStairwells(
  nodes: ApiBuildingNode[],
  positions: Map<string, Point>
): Stairwell[] {
  return nodes
    .filter(
      (node) =>
        node.type === "stairs"
    )
    .map((node) => {
      const center = positions.get(node.id)!;

      return {
        id: node.id,
        polygon: rectangle(
          center,
          90,
          105
        ),
      };
    });
}

/*
 * ------------------------------------------------------------
 * EXITS
 * ------------------------------------------------------------
 */

function createExits(
  nodes: ApiBuildingNode[],
  positions: Map<string, Point>
): ExitPoint[] {
  return nodes
    .filter(
      (node) =>
        node.type === "exit"
    )
    .map((node) => {
      const position = positions.get(node.id)!;

      return {
        id: node.id,
        position,
        accessible: true,
        direction: "right",
      };
    });
}

/*
 * ------------------------------------------------------------
 * DOORS
 * ------------------------------------------------------------
 *
 * Doors are generated only from same-floor edges.
 */

function createDoors(
  nodes: ApiBuildingNode[],
  edges: ApiBuildingEdge[],
  positions: Map<string, Point>
): Door[] {
  const nodeMap = new Map<
    string,
    ApiBuildingNode
  >();

  for (const node of nodes) {
    nodeMap.set(
      node.id,
      node
    );
  }

  return edges
    .filter((edge) => {
      const from =
        nodeMap.get(edge.from);

      const to =
        nodeMap.get(edge.to);

      if (!from || !to) {
        return false;
      }

      return (
        from.floor ===
        to.floor
      );
    })
    .map((edge, index) => {
      const from =
        nodeMap.get(edge.from)!;

      const to =
        nodeMap.get(edge.to)!;

      const fromPoint = positions.get(from.id)!;
      const toPoint = positions.get(to.id)!;

      return {
        id: `DOOR_${index}_${edge.from}_${edge.to}`,

        position: {
          x:
            (fromPoint.x +
              toPoint.x) /
            2,

          y:
            (fromPoint.y +
              toPoint.y) /
            2,
        },

        connects: [
          edge.from,
          edge.to,
        ],

        accessible:
          edge.accessible,

        confidence: "high",

        angle:
          Math.atan2(
            toPoint.y -
              fromPoint.y,

            toPoint.x -
              fromPoint.x
          ) *
          (180 / Math.PI),
      };
    });
}

/*
 * ------------------------------------------------------------
 * ELEVATORS
 * ------------------------------------------------------------
 *
 * Elevators are rendered as room-like blocks.
 * This makes them visually consistent with stairwells.
 */

function createElevators(
  nodes: ApiBuildingNode[],
  positions: Map<string, Point>
): Room[] {
  return nodes
    .filter(
      (node) =>
        node.type ===
        "elevator"
    )
    .map((node) => {
      const center = positions.get(node.id)!;

      return {
        id: node.id,

        label:
          node.label ||
          "Elevator",

        type: "other",

        polygon: rectangle(
          center,
          90,
          105
        ),

        confidence: "high",
      };
    });
}

/*
 * ------------------------------------------------------------
 * FLOOR GEOMETRY
 * ------------------------------------------------------------
 */

export function buildFloorGeometry(
  apiBuilding: ApiBuilding,
  floorLevel: number
): FloorGeometry {
  const floorNodes =
    apiBuilding.nodes.filter(
      (node) =>
        node.floor ===
        floorLevel
    );

  const floorNodeIds =
    new Set(
      floorNodes.map(
        (node) =>
          node.id
      )
    );

  const floorEdges =
    apiBuilding.edges.filter(
      (edge) =>
        floorNodeIds.has(
          edge.from
        ) &&
        floorNodeIds.has(
          edge.to
        )
    );

  const positions = createFloorPositions(
    floorNodes,
    floorEdges
  );

  const rooms = [
    ...createRooms(
      floorNodes,
      positions
    ),

    ...createElevators(
      floorNodes,
      positions
    ),
  ];

  const doors =
    createDoors(
      floorNodes,
      floorEdges,
      positions
    );

  const exits =
    createExits(
      floorNodes,
      positions
    );

  const stairwells =
    createStairwells(
      floorNodes,
      positions
    );

  return {
    floorLevel,

    rooms,

    doors,

    exits,

    stairwells,

    buildingOutline:
      createBuildingOutline(positions, floorNodes),

    hazards: [],
    connections: [],
  };
}

/*
 * ------------------------------------------------------------
 * COMPLETE BUILDING
 * ------------------------------------------------------------
 */

export function buildBuildingGeometry(
  apiBuilding: ApiBuilding
): Building {
  const floors =
    Array.from(
      new Set(
        apiBuilding.nodes.map(
          (node) =>
            node.floor
        )
      )
    )
      .sort(
        (a, b) => a - b
      )
      .map((floor) =>
        buildFloorGeometry(
          apiBuilding,
          floor
        )
      );

  return {
    floors,

    /*
     * Vertical connectors will be connected
     * to the actual Dijkstra route in the next step.
     */
    connectors: [],
  };
}
