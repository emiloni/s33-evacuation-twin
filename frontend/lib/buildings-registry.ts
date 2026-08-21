import type { FloorGeometry, Occupant } from "./schema";
import {
  DEMO_FLOOR,
  DEMO_OCCUPANTS,
  BUILDING_2_FLOOR_1,
  BUILDING_2_FLOOR_2,
  BUILDING_2_FLOOR_3,
  BUILDING_2_OCCUPANTS_FL1,
  BUILDING_2_OCCUPANTS_FL2,
  BUILDING_2_OCCUPANTS_FL3,
  BUILDING_3_FLOOR_1,
  BUILDING_3_FLOOR_2,
  BUILDING_3_OCCUPANTS_FL1,
  BUILDING_3_OCCUPANTS_FL2,
} from "./demo-floor";

/**
 * Generic building model: any number of floors, each with its own occupants.
 * This is what lets the dashboard support an arbitrary N-floor building
 * (e.g. one detected from an uploaded architectural plan) using the exact
 * same evacuation/rendering pipeline as the hardcoded demo buildings,
 * instead of duplicating per-floor-number branching for every new building.
 */
export interface BuildingDefinition {
  id: number;
  name: string;
  /** Sorted ascending by floorLevel. */
  floors: FloorGeometry[];
  /** occupantsByFloor[floorLevel] -> occupants on that floor. */
  occupantsByFloor: Record<number, Occupant[]>;
  /** True for the dynamically uploaded/analyzed building (id 4). */
  isCustom?: boolean;
}

// BUILDING 1/2/3 ARE UNCHANGED — same underlying demo-floor.ts data,
// just re-shaped into the generic registry format.
export const DEMO_BUILDINGS: Record<number, BuildingDefinition> = {
  1: {
    id: 1,
    name: "BUILDING 1 (SINGLE FLOOR)",
    floors: [DEMO_FLOOR],
    occupantsByFloor: { 1: DEMO_OCCUPANTS },
  },
  2: {
    id: 2,
    name: "BUILDING 2 (VERTICAL 3-LEVEL)",
    floors: [BUILDING_2_FLOOR_1, BUILDING_2_FLOOR_2, BUILDING_2_FLOOR_3],
    occupantsByFloor: {
      1: BUILDING_2_OCCUPANTS_FL1,
      2: BUILDING_2_OCCUPANTS_FL2,
      3: BUILDING_2_OCCUPANTS_FL3,
    },
  },
  3: {
    id: 3,
    name: "BUILDING 3 (VERTICAL 2-LEVEL)",
    floors: [BUILDING_3_FLOOR_1, BUILDING_3_FLOOR_2],
    occupantsByFloor: {
      1: BUILDING_3_OCCUPANTS_FL1,
      2: BUILDING_3_OCCUPANTS_FL2,
    },
  },
};

export const CUSTOM_BUILDING_ID = 4;

/** Resolves a building by id, falling back to the custom uploaded building for id 4, then Building 1. */
export function getBuildingDefinition(
  id: number,
  customBuilding?: BuildingDefinition | null
): BuildingDefinition {
  if (id === CUSTOM_BUILDING_ID && customBuilding) {
    return customBuilding;
  }
  return DEMO_BUILDINGS[id] || DEMO_BUILDINGS[1];
}

export function getAllOccupantsForBuilding(building: BuildingDefinition): Occupant[] {
  return building.floors.flatMap((f) => building.occupantsByFloor[f.floorLevel] || []);
}
