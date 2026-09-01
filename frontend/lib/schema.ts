export type Point = {
  x: number;
  y: number;
};
export type RoutePoint = Point & {
  level?: number;
};

export type RoomType =
  | "office"
  | "corridor"
  | "lobby"
  | "meeting_room"
  | "break_room"
  | "other";

export type Confidence =
  | "high"
  | "medium"
  | "low";

export interface Room {
  id: string;
  label: string;
  type: RoomType;
  polygon: Point[];
  confidence?: Confidence;
}

export interface Door {
  id: string;
  position: Point;
  connects: [string, string];
  accessible: boolean;
  confidence?: Confidence;
  angle?: number;
}

export interface ExitPoint {
  id: string;
  position: Point;
  accessible: boolean;
  direction:
    | "up"
    | "down"
    | "left"
    | "right";
}

export interface Stairwell {
  id: string;
  polygon: Point[];
}

export interface FloorConnection {
  id: string;
  from: string;
  to: string;
  type:
    | "corridor"
    | "stairs"
    | "elevator";
  accessible: boolean;
}

export interface VerticalConnector {
  id: string;
  type: "stairs" | "elevator";
  connectsFloors: number[];
  positionByFloor: {
    floor: number;
    x: number;
    y: number;
  }[];
  accessibleDuringHazard: Record<
    string,
    boolean
  >;
}

export interface FloorGeometry {
  floorLevel: number;
  rooms: Room[];
  doors: Door[];
  exits: ExitPoint[];
  stairwells: Stairwell[];
  connections: FloorConnection[];
  buildingOutline?: Point[];
  hazards?: Hazard[];
  ramps?: Ramp[];
  elevators?: Elevator[];
}


export interface Ramp {
  id: string;
  floorLevel: number;
  position: Point;
  connects: [string, string];
  width: number;
  accessible: boolean;
  blocked: boolean;
}

export interface Elevator {
  id: string;
  connectsFloors: number[];
  positionByFloor: { floor: number; x: number; y: number }[];
  accessible: boolean;
  blocked: boolean;
  emergencyApproved: boolean;
}

export interface Building {
  floors: FloorGeometry[];
  connectors: VerticalConnector[];
}

export type MobilityProfile =
  | "normal"
  | "wheelchair"
  | "child"
  | "elderly"
  | "temporary_injury"
  | "first_responder";

export type HazardType =
  | "fire"
  | "flood"
  | "blocked_corridor"
  | "closed_exit";

export interface Occupant {
  id: string;
  roomId: string;
  position: Point;
  profile: MobilityProfile;
  floorLevel?: number;
}

export interface Hazard {
  id: string;
  type: HazardType;
  position: Point;
  severity:
    | "low"
    | "medium"
    | "high";
}

export interface RouteSegment {
  occupantId: string;
  path: RoutePoint[];
  eta: number;
  exitId: string;
  confidence: Confidence;
  basis:
    | "live_sensors"
    | "static_fallback";
  isRerouted?: boolean;
  blockedNodes?: string[];
}