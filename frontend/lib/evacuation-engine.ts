import type {
  Door,
  ExitPoint,
  FloorGeometry,
  Hazard,
  Occupant,
  Point,
  RouteSegment,
} from "./schema";

const HAZARD_BUFFER = 180;
const DEFAULT_SPEED = 1.35;

// Graph-based routing cost weights
const HAZARD_PENALTY = 500;

/**
 * Returns a mobility-adjusted multiplier for an edge type.
 * Used to weight corridor path segments differently for different
 * mobility profiles.
 */
function mobilityEdgeCost(
  edgeType: "corridor" | "ramp" | "stairs" | "elevator" | "door",
  profile: Occupant["profile"]
): number {
  switch (profile) {
    case "wheelchair":
      if (edgeType === "stairs") return Infinity;
      if (edgeType === "ramp") return 0.8;
      if (edgeType === "elevator") return 0.5;
      return 1.0;
    case "temporary_injury":
      if (edgeType === "stairs") return Infinity;
      if (edgeType === "ramp") return 0.85;
      return 1.0;
    case "elderly":
      if (edgeType === "stairs") return 1.4;
      if (edgeType === "ramp") return 0.9;
      return 1.0;
    case "child":
      if (edgeType === "stairs") return 1.1;
      return 1.0;
    default:
      return 1.0;
  }
}

// Fallback stair-shaft entry point used only when a floor has no stairwell
// geometry at all. Matches Building 2/3's existing stairwell placement
// exactly, so demo-building behavior is unchanged.
const FALLBACK_STAIR_CENTER: Point = { x: 530, y: 430 };

/**
 * Derives the point where the corridor meets the staircase shaft (top edge,
 * horizontal midpoint of the stairwell polygon) from the floor's actual
 * stairwell geometry, instead of relying on a hardcoded building-specific
 * coordinate. This makes multi-floor descent routing work for ANY building
 * (including a freshly-uploaded/analyzed one), not just Building 2/3.
 *
 * For Building 2/3's existing stairwell polygon ([480,430]-[580,530]) this
 * resolves to exactly {x:530, y:430} — identical to the previous hardcoded
 * value — so existing behavior is unchanged.
 */
function getStairEntryPoint(floor: FloorGeometry): Point {
  const stairwell = floor.stairwells && floor.stairwells[0];
  if (!stairwell || !stairwell.polygon || stairwell.polygon.length === 0) {
    return FALLBACK_STAIR_CENTER;
  }

  const xs = stairwell.polygon.map((p) => p.x);
  const ys = stairwell.polygon.map((p) => p.y);

  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: Math.min(...ys),
  };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(
    b.x - a.x,
    b.y - a.y
  );
}

function pathLength(path: Point[]): number {
  let total = 0;

  for (let i = 1; i < path.length; i++) {
    total += distance(
      path[i - 1],
      path[i]
    );
  }

  return total;
}

function pointNearHazard(
  point: Point,
  hazards: Hazard[]
): boolean {
  return hazards.some((hazard) => {
    const radius =
      hazard.severity === "high"
        ? HAZARD_BUFFER * 1.4
        : hazard.severity === "medium"
          ? HAZARD_BUFFER
          : HAZARD_BUFFER * 0.7;

    return distance(point, hazard.position) < radius;
  });
}

function segmentNearHazard(
  start: Point,
  end: Point,
  hazards: Hazard[]
): boolean {
  const steps = Math.max(
    4,
    Math.ceil(distance(start, end) / 25)
  );

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;

    const point = {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
    };

    if (pointNearHazard(point, hazards)) {
      return true;
    }
  }

  return false;
}

function routeTouchesHazard(
  path: Point[],
  hazards: Hazard[]
): boolean {
  if (hazards.length === 0) {
    return false;
  }

  for (let i = 0; i < path.length; i++) {
    if (pointNearHazard(path[i], hazards)) {
      return true;
    }

    if (i > 0) {
      if (
        segmentNearHazard(
          path[i - 1],
          path[i],
          hazards
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Same hazard check as routeTouchesHazard, but ignores the path's final
 * segment (the direct approach into the exit/stair doorway).
 *
 * Why: when a fire sits close enough to the staircase that the doorway
 * itself falls inside the hazard buffer, EVERY candidate corridor path ends
 * with a point inside that buffer — so the plain check always fails for all
 * of them, and the router silently fell back to the first candidate
 * regardless of how well it actually avoided the hazard along the way. That
 * produced routes that looked like they cut through the fire.
 *
 * The final few meters into a stairwell that's genuinely next to the fire
 * are physically unavoidable (there's only one staircase). What IS avoidable
 * — and what this lets the router actually optimize for — is how safely the
 * occupant travels through the corridor to get there.
 */
function corridorTraversalTouchesHazard(
  path: Point[],
  hazards: Hazard[]
): boolean {
  if (hazards.length === 0 || path.length < 2) {
    return false;
  }

  // Check every point/segment except the final approach segment into the exit.
  for (let i = 0; i < path.length - 1; i++) {
    if (pointNearHazard(path[i], hazards)) {
      return true;
    }
    if (i > 0 && segmentNearHazard(path[i - 1], path[i], hazards)) {
      return true;
    }
  }

  return false;
}

/**
 * Minimum distance from any point along the path to the nearest hazard
 * center. Used to rank candidate paths by hazard exposure when none of them
 * can fully avoid the hazard (e.g. hazard sits right at the stairwell).
 * Higher is safer.
 */
function minDistanceToHazards(path: Point[], hazards: Hazard[]): number {
  if (hazards.length === 0) return Infinity;

  let minDist = Infinity;
  const SAMPLES_PER_SEGMENT = 12;

  for (let i = 0; i < path.length; i++) {
    for (const hazard of hazards) {
      minDist = Math.min(minDist, distance(path[i], hazard.position));
    }
    if (i > 0) {
      for (let s = 1; s < SAMPLES_PER_SEGMENT; s++) {
        const t = s / SAMPLES_PER_SEGMENT;
        const sample = {
          x: path[i - 1].x + (path[i].x - path[i - 1].x) * t,
          y: path[i - 1].y + (path[i].y - path[i - 1].y) * t,
        };
        for (const hazard of hazards) {
          minDist = Math.min(minDist, distance(sample, hazard.position));
        }
      }
    }
  }

  return minDist;
}

function isDoorAccessible(
  door: Door,
  occupant: Occupant
): boolean {
  if (occupant.profile === "wheelchair") {
    return door.accessible;
  }

  if (occupant.profile === "temporary_injury") {
    return door.accessible;
  }

  return true;
}

function chooseExit(
  occupant: Occupant,
  floor: FloorGeometry,
  hazards: Hazard[]
): ExitPoint | null {
  const accessibleExits = floor.exits.filter((exit) => {
    if (occupant.profile === "wheelchair" && !exit.accessible) {
      return false;
    }
    return true;
  });

  if (accessibleExits.length === 0) {
    return null;
  }

  const door = findDoor(occupant.roomId, floor, occupant);

  // Compute graph-based route cost for each exit
  const evaluated = accessibleExits.map((exit) => {
    const dummyDoor: Door = door || { position: occupant.position } as Door;
    const path = buildCorridorToExitPath(dummyDoor, exit, floor, hazards);

    if (!path) {
      return { exit, cost: Infinity, touchesHazard: true, pathLen: Infinity, hazardDist: 0 };
    }

    const touchesHazard = corridorTraversalTouchesHazard(path, hazards);
    const hazardDist = minDistanceToHazards(path, hazards);
    const rawPathLen = pathLength(path);

    // Graph-based cost = path length + hazard penalty
    let cost = rawPathLen;

    if (touchesHazard) {
      cost += HAZARD_PENALTY;
    } else if (hazards.length > 0) {
      cost -= hazardDist * 0.05;
    }

    // Ramp awareness: if path passes near a ramp, apply mobility bonus
    if (floor.ramps && floor.ramps.length > 0) {
      const ramp = floor.ramps[0];
      const pathNearRamp = path.some(
        (p) => distance(p, ramp.position) < 80
      );
      if (pathNearRamp) {
        const rampBonus = mobilityEdgeCost("ramp", occupant.profile);
        cost *= rampBonus;
      }
    }

    return { exit, cost, touchesHazard, pathLen: rawPathLen, hazardDist };
  });

  // Sort by total graph cost (lowest = best)
  evaluated.sort((a, b) => a.cost - b.cost);

  const best = evaluated[0];

  // Per-occupant debug logging
  console.log("[Routing] Occupant:", occupant.id);
  console.log("  Start:", occupant.roomId, "@", occupant.position);
  console.log("  Mobility:", occupant.profile);
  console.log("  Available exits:", accessibleExits.map((e) => e.id));
  for (const e of evaluated) {
    console.log(
      "  Route to", e.exit.id + ":",
      "cost", e.cost.toFixed(1),
      "| pathLen", e.pathLen === Infinity ? "\u221E" : e.pathLen.toFixed(1),
      "| touchesHazard", e.touchesHazard,
      "| hazardDist", e.hazardDist === Infinity ? "\u221E" : e.hazardDist.toFixed(1)
    );
  }
  console.log("  \u2192 Selected exit:", best.exit.id, "(cost:", best.cost.toFixed(1) + ")");

  return best.exit;
}

function findDoor(
  roomId: string,
  floor: FloorGeometry,
  occupant: Occupant
): Door | null {
  const roomDoors = floor.doors.filter((door) => door.connects.includes(roomId));
  if (roomDoors.length === 0) return null;

  const accessibleDoors = roomDoors.filter((door) => isDoorAccessible(door, occupant));
  const candidateDoors = accessibleDoors.length > 0 ? accessibleDoors : roomDoors;

  return [...candidateDoors].sort(
    (a, b) => distance(occupant.position, a.position) - distance(occupant.position, b.position)
  )[0];
}

function buildRoomToCorridorPath(
  occupant: Occupant,
  door: Door
): Point[] {
  return [
    occupant.position,
    door.position,
  ];
}

function buildCorridorToExitPath(
  door: Door,
  exit: ExitPoint,
  floor: FloorGeometry,
  hazards: Hazard[]
): Point[] | null {
  const isUpperFloor = (floor.floorLevel || 1) > 1;
  const corridorY = 330; // Centerline of main horizontal corridor (y = 280 to 380)

  const doorEntry = { x: door.position.x, y: corridorY };
  const exitJunction = { x: exit.position.x, y: corridorY };

  // If a ramp exists, route through it as intermediate waypoint
  let rampWaypoint: Point | null = null;
  if (floor.ramps && floor.ramps.length > 0) {
    const ramp = floor.ramps[0];
    if (!ramp.blocked) {
      rampWaypoint = ramp.position;
    }
  }

  const directPath: Point[] = [
    door.position,
    doorEntry,
  ];

  // Insert ramp waypoint if it lies between door and exit
  if (rampWaypoint) {
    const minX = Math.min(door.position.x, exit.position.x);
    const maxX = Math.max(door.position.x, exit.position.x);
    if (rampWaypoint.x >= minX - 50 && rampWaypoint.x <= maxX + 50) {
      directPath.push(rampWaypoint);
    }
  }

  directPath.push(exitJunction);

  if (isUpperFloor) {
    directPath.push(exit.position);
  }

  // Deduplicate adjacent points
  const cleanDirectPath = directPath.filter((p, i, arr) => {
    if (i === 0) return true;
    return p.x !== arr[i - 1].x || p.y !== arr[i - 1].y;
  });

  if (!routeTouchesHazard(cleanDirectPath, hazards)) {
    return cleanDirectPath;
  }

  const corridor = floor.rooms.find((room) => room.type === "corridor");
  if (!corridor) return null;

  const minX = Math.min(...corridor.polygon.map((point) => point.x));

  const candidatePaths: Point[][] = [
    cleanDirectPath,
    // Top corridor edge detour (y = 300)
    [
      door.position,
      { x: door.position.x, y: 300 },
      { x: exit.position.x, y: 300 },
      ...(isUpperFloor ? [exit.position] : []),
    ],
    // Bottom corridor edge detour (y = 360)
    [
      door.position,
      { x: door.position.x, y: 360 },
      { x: exit.position.x, y: 360 },
      ...(isUpperFloor ? [exit.position] : []),
    ],
    // West corridor detour (away from East side fire hazard)
    [
      door.position,
      { x: minX + 50, y: corridorY },
      { x: exit.position.x, y: corridorY },
      ...(isUpperFloor ? [exit.position] : []),
    ],
  ].map((pArr) =>
    pArr.filter((p, i, arr) => i === 0 || p.x !== arr[i - 1].x || p.y !== arr[i - 1].y)
  );

  const safePaths = candidatePaths.filter(
    (path) => !corridorTraversalTouchesHazard(path, hazards)
  );

  if (safePaths.length > 0) {
    return [...safePaths].sort((a, b) => pathLength(a) - pathLength(b))[0];
  }

  return [...candidatePaths].sort(
    (a, b) => minDistanceToHazards(b, hazards) - minDistanceToHazards(a, hazards)
  )[0];
}

export function calculateEvacuationRoute(
  occupant: Occupant,
  floor: FloorGeometry,
  groundFloor?: FloorGeometry
): RouteSegment | null {
  const hazards = floor.hazards ?? [];

  const door = findDoor(
    occupant.roomId,
    floor,
    occupant
  );

  if (!door) {
    return null;
  }

  const exit = chooseExit(
    occupant,
    floor,
    hazards
  );

  if (!exit) {
    return null;
  }

  const roomPath =
    buildRoomToCorridorPath(
      occupant,
      door
    );

  const corridorPath =
    buildCorridorToExitPath(
      door,
      exit,
      floor,
      hazards
    );

  if (!corridorPath) {
    return null;
  }

  const currentLevel = floor.floorLevel || 1;
  const path: (Point & { level?: number })[] = [
    ...roomPath.map((p) => ({ ...p, level: currentLevel })),
    ...corridorPath.slice(1).map((p) => ({ ...p, level: currentLevel })),
  ];

  // If on an upper floor, append physical staircase descent down to Ground Level!
  if (currentLevel > 1) {
    const stairCenter = exit.position; // Descent uses the chosen staircase (West vs East)
    // Descend through intermediate floor staircase landings down to Ground Level (Level 1)
    for (let lvl = currentLevel - 1; lvl >= 1; lvl--) {
      path.push({ ...stairCenter, level: lvl });
    }

    if (groundFloor && groundFloor.exits && groundFloor.exits.length > 0) {
      const nearestGroundExit = [...groundFloor.exits].sort(
        (a, b) => distance(stairCenter, a.position) - distance(stairCenter, b.position)
      )[0];

      // Step out of stair landing into ground corridor centerline
      path.push({ x: stairCenter.x, y: 330, level: 1 });
      // Terminate at the actual Ground Exit Gate
      path.push({ ...nearestGroundExit.position, level: 1 });
    } else {
      // BUILDING 2/3: Determine Ground Floor exit gate (West vs East) based on stair location & hazards
      const preferredExitX = stairCenter.x < 400 ? 100 : 900;

      // Select ground exit that avoids hazards if any
      let chosenExitX = preferredExitX;
      if (hazards.length > 0) {
        const westExitPos = { x: 100, y: 330 };
        const eastExitPos = { x: 900, y: 330 };
        const westNear = pointNearHazard(westExitPos, hazards);
        const eastNear = pointNearHazard(eastExitPos, hazards);
        if (westNear && !eastNear) chosenExitX = 900;
        else if (eastNear && !westNear) chosenExitX = 100;
      }

      const groundExitPos = { x: chosenExitX, y: 330 };

      // 1. Step out of ground floor stairwell landing into ground corridor centerline
      path.push({ x: stairCenter.x, y: 330, level: 1 });
      // 2. Follow ground corridor centerline to Ground Exit Gate (Terminates at Gate)
      path.push({ ...groundExitPos, level: 1 });
    }
  }

  // Deduplicate consecutive identical points
  const cleanPath = path.filter((p, i, arr) => {
    if (i === 0) return true;
    const prev = arr[i - 1];
    return p.x !== prev.x || p.y !== prev.y || p.level !== prev.level;
  });

  const distanceTravelled = pathLength(cleanPath);

  const speed =
    occupant.profile === "wheelchair"
      ? DEFAULT_SPEED * 0.7
      : occupant.profile === "elderly"
        ? DEFAULT_SPEED * 0.65
        : occupant.profile === "temporary_injury"
          ? DEFAULT_SPEED * 0.6
          : occupant.profile === "child"
            ? DEFAULT_SPEED * 0.8
            : DEFAULT_SPEED;

  const isHazardActive = hazards.length > 0;
  const routeConfidence = routeTouchesHazard(cleanPath, hazards) ? "medium" : "high";

  console.log(
    "[Routing] \u2192 Route assigned:",
    occupant.id,
    "\u2192 exit:", exit.id,
    "| points:", cleanPath.length,
    "| distance:", distanceTravelled.toFixed(1),
    "| ETA:", (distanceTravelled / speed).toFixed(1) + "s",
    "| confidence:", routeConfidence,
    "| rerouted:", isHazardActive
  );

  return {
    occupantId: occupant.id,
    path: cleanPath,
    eta: distanceTravelled / speed,
    exitId: exit.id,
    confidence: routeConfidence,
    basis: "static_fallback",
    isRerouted: isHazardActive,
  };
}

export function calculateAllEvacuationRoutes(
  occupants: Occupant[],
  floor: FloorGeometry,
  groundFloor?: FloorGeometry
): RouteSegment[] {
  return occupants
    .map((occupant) =>
      calculateEvacuationRoute(
        occupant,
        floor,
        groundFloor
      )
    )
    .filter(
      (
        route
      ): route is RouteSegment =>
        route !== null
    );
}