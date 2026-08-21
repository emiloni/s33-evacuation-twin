import type {
  FloorGeometry,
  Occupant,
} from "./schema";

/* ========================================================= */
/* BUILDING 1: SINGLE FLOOR SCENARIO (UNCHANGED)             */
/* ========================================================= */

export const DEMO_FLOOR: FloorGeometry = {
  floorLevel: 1,

  buildingOutline: [
    { x: 70, y: 70 },
    { x: 930, y: 70 },
    { x: 930, y: 650 },
    { x: 70, y: 650 },
  ],

  rooms: [
    {
      id: "room-1",
      label: "Office A",
      type: "office",
      polygon: [
        { x: 100, y: 100 },
        { x: 350, y: 100 },
        { x: 350, y: 280 },
        { x: 100, y: 280 },
      ],
      confidence: "high",
    },
    {
      id: "corridor-1",
      label: "Main Corridor",
      type: "corridor",
      polygon: [
        { x: 100, y: 280 },
        { x: 900, y: 280 },
        { x: 900, y: 380 },
        { x: 100, y: 380 },
      ],
      confidence: "high",
    },
    {
      id: "room-2",
      label: "Meeting Room",
      type: "meeting_room",
      polygon: [
        { x: 500, y: 100 },
        { x: 750, y: 100 },
        { x: 750, y: 280 },
        { x: 500, y: 280 },
      ],
      confidence: "low",
    },
    {
      id: "room-3",
      label: "Office B",
      type: "office",
      polygon: [
        { x: 100, y: 380 },
        { x: 350, y: 380 },
        { x: 350, y: 600 },
        { x: 100, y: 600 },
      ],
      confidence: "high",
    },
  ],

  doors: [
    {
      id: "door-1",
      position: { x: 225, y: 280 },
      connects: ["room-1", "corridor-1"],
      accessible: true,
      confidence: "high",
      angle: 0,
    },
    {
      id: "door-2",
      position: { x: 625, y: 280 },
      connects: ["room-2", "corridor-1"],
      accessible: true,
      confidence: "medium",
      angle: 0,
    },
    {
      id: "door-3",
      position: { x: 225, y: 380 },
      connects: ["room-3", "corridor-1"],
      accessible: true,
      confidence: "high",
      angle: 0,
    },
  ],

  exits: [
    {
      id: "exit-1",
      position: { x: 900, y: 330 },
      accessible: true,
      direction: "right",
    },
    {
      id: "exit-2",
      position: { x: 100, y: 330 },
      accessible: true,
      direction: "left",
    },
  ],

  stairwells: [
    {
      id: "stairs-1",
      polygon: [
        { x: 810, y: 450 },
        { x: 890, y: 450 },
        { x: 890, y: 530 },
        { x: 810, y: 530 },
      ],
    },
  ],
connections: [],
  hazards: [],
};

export const DEMO_OCCUPANTS: Occupant[] = [
  {
    id: "occupant-001",
    roomId: "room-1",
    position: { x: 220, y: 180 },
    profile: "normal",
    floorLevel: 1,
  } as Occupant,
  {
    id: "occupant-002",
    roomId: "room-1",
    position: { x: 290, y: 220 },
    profile: "normal",
    floorLevel: 1,
  } as Occupant,
  {
    id: "occupant-003",
    roomId: "room-2",
    position: { x: 620, y: 180 },
    profile: "wheelchair",
    floorLevel: 1,
  } as Occupant,
  {
    id: "occupant-004",
    roomId: "room-2",
    position: { x: 690, y: 220 },
    profile: "elderly",
    floorLevel: 1,
  } as Occupant,
  {
    id: "occupant-005",
    roomId: "room-3",
    position: { x: 200, y: 480 },
    profile: "child",
    floorLevel: 1,
  } as Occupant,
  {
    id: "occupant-006",
    roomId: "room-3",
    position: { x: 290, y: 540 },
    profile: "temporary_injury",
    floorLevel: 1,
  } as Occupant,
];

/* ========================================================= */
/* BUILDING 2: VERTICAL 3-LEVEL TOWER SCENARIO               */
/* ========================================================= */

export const BUILDING_2_FLOOR_1: FloorGeometry = {
  floorLevel: 1,
  buildingOutline: [
    { x: 70, y: 70 },
    { x: 930, y: 70 },
    { x: 930, y: 650 },
    { x: 70, y: 650 },
  ],
  rooms: [
    {
      id: "room-b2-101",
      label: "Executive Suite (Ground)",
      type: "office",
      polygon: [
        { x: 100, y: 100 },
        { x: 380, y: 100 },
        { x: 380, y: 280 },
        { x: 100, y: 280 },
      ],
      confidence: "high",
    },
    {
      id: "corridor-b2-1",
      label: "Ground Egress Concourse",
      type: "corridor",
      polygon: [
        { x: 100, y: 280 },
        { x: 900, y: 280 },
        { x: 900, y: 380 },
        { x: 580, y: 380 },
        { x: 580, y: 430 },
        { x: 480, y: 430 },
        { x: 480, y: 380 },
        { x: 280, y: 380 },
        { x: 280, y: 430 },
        { x: 180, y: 430 },
        { x: 180, y: 380 },
        { x: 100, y: 380 },
      ],
      confidence: "high",
    },
    {
      id: "room-b2-102",
      label: "Conference Hall (Ground)",
      type: "meeting_room",
      polygon: [
        { x: 500, y: 100 },
        { x: 850, y: 100 },
        { x: 850, y: 280 },
        { x: 500, y: 280 },
      ],
      confidence: "high",
    },
    {
      id: "room-b2-103",
      label: "Operations Hub (Ground)",
      type: "office",
      polygon: [
        { x: 290, y: 380 },
        { x: 450, y: 380 },
        { x: 450, y: 600 },
        { x: 290, y: 600 },
      ],
      confidence: "high",
    },
  ],
  doors: [
    {
      id: "door-b2-101",
      position: { x: 240, y: 280 },
      connects: ["room-b2-101", "corridor-b2-1"],
      accessible: true,
      confidence: "high",
      angle: 0,
    },
    {
      id: "door-b2-102",
      position: { x: 675, y: 280 },
      connects: ["room-b2-102", "corridor-b2-1"],
      accessible: true,
      confidence: "high",
      angle: 0,
    },
    {
      id: "door-b2-103",
      position: { x: 370, y: 380 },
      connects: ["room-b2-103", "corridor-b2-1"],
      accessible: true,
      confidence: "high",
      angle: 0,
    },
  ],
  exits: [
    {
      id: "exit-b2-west",
      position: { x: 100, y: 330 },
      accessible: true,
      direction: "left",
    },
    {
      id: "exit-b2-east",
      position: { x: 900, y: 330 },
      accessible: true,
      direction: "right",
    },
  ],
  stairwells: [
    {
      id: "stairs-b2-ground-east",
      polygon: [
        { x: 480, y: 430 },
        { x: 580, y: 430 },
        { x: 580, y: 530 },
        { x: 480, y: 530 },
      ],
    },
    {
      id: "stairs-b2-ground-west",
      polygon: [
        { x: 180, y: 430 },
        { x: 280, y: 430 },
        { x: 280, y: 530 },
        { x: 180, y: 530 },
      ],
    },
  ],
  connections: [],
  hazards: [],
};

export const BUILDING_2_FLOOR_2: FloorGeometry = {
  floorLevel: 2,
  buildingOutline: [
    { x: 70, y: 70 },
    { x: 930, y: 70 },
    { x: 930, y: 650 },
    { x: 70, y: 650 },
  ],
  rooms: [
    {
      id: "room-b2-201",
      label: "Research Labs (FL 1)",
      type: "office",
      polygon: [
        { x: 100, y: 100 },
        { x: 380, y: 100 },
        { x: 380, y: 280 },
        { x: 100, y: 280 },
      ],
      confidence: "high",
    },
    {
      id: "corridor-b2-2",
      label: "First Floor Gallery",
      type: "corridor",
      polygon: [
        { x: 100, y: 280 },
        { x: 900, y: 280 },
        { x: 900, y: 380 },
        { x: 580, y: 380 },
        { x: 580, y: 430 },
        { x: 480, y: 430 },
        { x: 480, y: 380 },
        { x: 280, y: 380 },
        { x: 280, y: 430 },
        { x: 180, y: 430 },
        { x: 180, y: 380 },
        { x: 100, y: 380 },
      ],
      confidence: "high",
    },
    {
      id: "room-b2-202",
      label: "Engineering Suite (FL 1)",
      type: "meeting_room",
      polygon: [
        { x: 500, y: 100 },
        { x: 850, y: 100 },
        { x: 850, y: 280 },
        { x: 500, y: 280 },
      ],
      confidence: "high",
    },
    {
      id: "room-b2-203",
      label: "Server Control (FL 1)",
      type: "office",
      polygon: [
        { x: 290, y: 380 },
        { x: 450, y: 380 },
        { x: 450, y: 600 },
        { x: 290, y: 600 },
      ],
      confidence: "high",
    },
  ],
  doors: [
    {
      id: "door-b2-201",
      position: { x: 240, y: 280 },
      connects: ["room-b2-201", "corridor-b2-2"],
      accessible: true,
      confidence: "high",
      angle: 0,
    },
    {
      id: "door-b2-202",
      position: { x: 675, y: 280 },
      connects: ["room-b2-202", "corridor-b2-2"],
      accessible: true,
      confidence: "high",
      angle: 0,
    },
    {
      id: "door-b2-203",
      position: { x: 370, y: 380 },
      connects: ["room-b2-203", "corridor-b2-2"],
      accessible: true,
      confidence: "high",
      angle: 0,
    },
  ],
  exits: [
    {
      id: "exit-b2-staircase-fl1-east",
      position: { x: 530, y: 430 },
      accessible: true,
      direction: "down",
    },
    {
      id: "exit-b2-staircase-fl1-west",
      position: { x: 230, y: 430 },
      accessible: true,
      direction: "down",
    },
  ],
  stairwells: [
    {
      id: "stairs-b2-fl2-east",
      polygon: [
        { x: 480, y: 430 },
        { x: 580, y: 430 },
        { x: 580, y: 530 },
        { x: 480, y: 530 },
      ],
    },
    {
      id: "stairs-b2-fl2-west",
      polygon: [
        { x: 180, y: 430 },
        { x: 280, y: 430 },
        { x: 280, y: 530 },
        { x: 180, y: 530 },
      ],
    },
  ],
  connections: [],
  hazards: [],
};

export const BUILDING_2_FLOOR_3: FloorGeometry = {
  floorLevel: 3,
  buildingOutline: [
    { x: 70, y: 70 },
    { x: 930, y: 70 },
    { x: 930, y: 650 },
    { x: 70, y: 650 },
  ],
  rooms: [
    {
      id: "room-b2-301",
      label: "Executive Penthouse (FL 2)",
      type: "office",
      polygon: [
        { x: 100, y: 100 },
        { x: 380, y: 100 },
        { x: 380, y: 280 },
        { x: 100, y: 280 },
      ],
      confidence: "high",
    },
    {
      id: "corridor-b2-3",
      label: "Second Floor Gallery",
      type: "corridor",
      polygon: [
        { x: 100, y: 280 },
        { x: 900, y: 280 },
        { x: 900, y: 380 },
        { x: 580, y: 380 },
        { x: 580, y: 430 },
        { x: 480, y: 430 },
        { x: 480, y: 380 },
        { x: 280, y: 380 },
        { x: 280, y: 430 },
        { x: 180, y: 430 },
        { x: 180, y: 380 },
        { x: 100, y: 380 },
      ],
      confidence: "high",
    },
    {
      id: "room-b2-302",
      label: "Sky Lounge (FL 2)",
      type: "meeting_room",
      polygon: [
        { x: 500, y: 100 },
        { x: 850, y: 100 },
        { x: 850, y: 280 },
        { x: 500, y: 280 },
      ],
      confidence: "high",
    },
    {
      id: "room-b2-303",
      label: "Data Archival (FL 2)",
      type: "office",
      polygon: [
        { x: 290, y: 380 },
        { x: 450, y: 380 },
        { x: 450, y: 600 },
        { x: 290, y: 600 },
      ],
      confidence: "high",
    },
  ],
  doors: [
    {
      id: "door-b2-301",
      position: { x: 240, y: 280 },
      connects: ["room-b2-301", "corridor-b2-3"],
      accessible: true,
      confidence: "high",
      angle: 0,
    },
    {
      id: "door-b2-302",
      position: { x: 675, y: 280 },
      connects: ["room-b2-302", "corridor-b2-3"],
      accessible: true,
      confidence: "high",
      angle: 0,
    },
    {
      id: "door-b2-303",
      position: { x: 370, y: 380 },
      connects: ["room-b2-303", "corridor-b2-3"],
      accessible: true,
      confidence: "high",
      angle: 0,
    },
  ],
  exits: [
    {
      id: "exit-b2-staircase-fl2-east",
      position: { x: 530, y: 430 },
      accessible: true,
      direction: "down",
    },
    {
      id: "exit-b2-staircase-fl2-west",
      position: { x: 230, y: 430 },
      accessible: true,
      direction: "down",
    },
  ],
  stairwells: [
    {
      id: "stairs-b2-fl3-east",
      polygon: [
        { x: 480, y: 430 },
        { x: 580, y: 430 },
        { x: 580, y: 530 },
        { x: 480, y: 530 },
      ],
    },
    {
      id: "stairs-b2-fl3-west",
      polygon: [
        { x: 180, y: 430 },
        { x: 280, y: 430 },
        { x: 280, y: 530 },
        { x: 180, y: 530 },
      ],
    },
  ],
  connections: [],
  hazards: [],
};

// BUILDING 2 OCCUPANTS PER FLOOR
export const BUILDING_2_OCCUPANTS_FL1: Occupant[] = [
  {
    id: "occ-b2-101",
    roomId: "room-b2-101",
    position: { x: 220, y: 180 },
    profile: "normal",
    floorLevel: 1,
  } as Occupant,
  {
    id: "occ-b2-102",
    roomId: "room-b2-102",
    position: { x: 675, y: 180 },
    profile: "wheelchair",
    floorLevel: 1,
  } as Occupant,
  {
    id: "occ-b2-103",
    roomId: "room-b2-103",
    position: { x: 350, y: 480 },
    profile: "elderly",
    floorLevel: 1,
  } as Occupant,
];

export const BUILDING_2_OCCUPANTS_FL2: Occupant[] = [
  {
    id: "occ-b2-201",
    roomId: "room-b2-201",
    position: { x: 220, y: 180 },
    profile: "normal",
    floorLevel: 2,
  } as Occupant,
  {
    id: "occ-b2-202",
    roomId: "room-b2-202",
    position: { x: 675, y: 180 },
    profile: "child",
    floorLevel: 2,
  } as Occupant,
  {
    id: "occ-b2-203",
    roomId: "room-b2-203",
    position: { x: 350, y: 480 },
    profile: "temporary_injury",
    floorLevel: 2,
  } as Occupant,
];

export const BUILDING_2_OCCUPANTS_FL3: Occupant[] = [
  {
    id: "occ-b2-301",
    roomId: "room-b2-301",
    position: { x: 220, y: 180 },
    profile: "normal",
    floorLevel: 3,
  } as Occupant,
  {
    id: "occ-b2-302",
    roomId: "room-b2-302",
    position: { x: 675, y: 180 },
    profile: "wheelchair",
    floorLevel: 3,
  } as Occupant,
  {
    id: "occ-b2-303",
    roomId: "room-b2-303",
    position: { x: 350, y: 480 },
    profile: "elderly",
    floorLevel: 3,
  } as Occupant,
];

/* ========================================================= */
/* BUILDING 3: TWO-FLOOR SCENARIO                             */
/* Level 1: Ground Floor                                     */
/* Level 2: First Floor (Above Ground Floor)                 */
/* ========================================================= */

export const BUILDING_3_FLOOR_1: FloorGeometry = {
  floorLevel: 1,
  buildingOutline: [
    { x: 70, y: 70 },
    { x: 930, y: 70 },
    { x: 930, y: 650 },
    { x: 70, y: 650 },
  ],
  rooms: [
    {
      id: "room-b3-101",
      label: "Innovation Lab (Ground)",
      type: "office",
      polygon: [
        { x: 100, y: 100 },
        { x: 380, y: 100 },
        { x: 380, y: 280 },
        { x: 100, y: 280 },
      ],
      confidence: "high",
    },
    {
      id: "corridor-b3-1",
      label: "Ground Main Concourse",
      type: "corridor",
      polygon: [
        { x: 100, y: 280 },
        { x: 900, y: 280 },
        { x: 900, y: 380 },
        { x: 580, y: 380 },
        { x: 580, y: 430 },
        { x: 480, y: 430 },
        { x: 480, y: 380 },
        { x: 280, y: 380 },
        { x: 280, y: 430 },
        { x: 180, y: 430 },
        { x: 180, y: 380 },
        { x: 100, y: 380 },
      ],
      confidence: "high",
    },
    {
      id: "room-b3-102",
      label: "Media Studio (Ground)",
      type: "meeting_room",
      polygon: [
        { x: 500, y: 100 },
        { x: 850, y: 100 },
        { x: 850, y: 280 },
        { x: 500, y: 280 },
      ],
      confidence: "high",
    },
    {
      id: "room-b3-103",
      label: "Logistics Center (Ground)",
      type: "office",
      polygon: [
        { x: 290, y: 380 },
        { x: 450, y: 380 },
        { x: 450, y: 600 },
        { x: 290, y: 600 },
      ],
      confidence: "high",
    },
  ],
  doors: [
    {
      id: "door-b3-101",
      position: { x: 240, y: 280 },
      connects: ["room-b3-101", "corridor-b3-1"],
      accessible: true,
      confidence: "high",
      angle: 0,
    },
    {
      id: "door-b3-102",
      position: { x: 675, y: 280 },
      connects: ["room-b3-102", "corridor-b3-1"],
      accessible: true,
      confidence: "high",
      angle: 0,
    },
    {
      id: "door-b3-103",
      position: { x: 370, y: 380 },
      connects: ["room-b3-103", "corridor-b3-1"],
      accessible: true,
      confidence: "high",
      angle: 0,
    },
  ],
  exits: [
    {
      id: "exit-b3-west",
      position: { x: 100, y: 330 },
      accessible: true,
      direction: "left",
    },
    {
      id: "exit-b3-east",
      position: { x: 900, y: 330 },
      accessible: true,
      direction: "right",
    },
  ],
  stairwells: [
    {
      id: "stairs-b3-ground-east",
      polygon: [
        { x: 480, y: 430 },
        { x: 580, y: 430 },
        { x: 580, y: 530 },
        { x: 480, y: 530 },
      ],
    },
    {
      id: "stairs-b3-ground-west",
      polygon: [
        { x: 180, y: 430 },
        { x: 280, y: 430 },
        { x: 280, y: 530 },
        { x: 180, y: 530 },
      ],
    },
  ],
  connections: [],
  hazards: [],
};

export const BUILDING_3_FLOOR_2: FloorGeometry = {
  floorLevel: 2,
  buildingOutline: [
    { x: 70, y: 70 },
    { x: 930, y: 70 },
    { x: 930, y: 650 },
    { x: 70, y: 650 },
  ],
  rooms: [
    {
      id: "room-b3-201",
      label: "Design Studio (FL 1)",
      type: "office",
      polygon: [
        { x: 100, y: 100 },
        { x: 380, y: 100 },
        { x: 380, y: 280 },
        { x: 100, y: 280 },
      ],
      confidence: "high",
    },
    {
      id: "corridor-b3-2",
      label: "First Floor Mezzanine",
      type: "corridor",
      polygon: [
        { x: 100, y: 280 },
        { x: 900, y: 280 },
        { x: 900, y: 380 },
        { x: 580, y: 380 },
        { x: 580, y: 430 },
        { x: 480, y: 430 },
        { x: 480, y: 380 },
        { x: 280, y: 380 },
        { x: 280, y: 430 },
        { x: 180, y: 430 },
        { x: 180, y: 380 },
        { x: 100, y: 380 },
      ],
      confidence: "high",
    },
    {
      id: "room-b3-202",
      label: "Executive Boardroom (FL 1)",
      type: "meeting_room",
      polygon: [
        { x: 500, y: 100 },
        { x: 850, y: 100 },
        { x: 850, y: 280 },
        { x: 500, y: 280 },
      ],
      confidence: "high",
    },
    {
      id: "room-b3-203",
      label: "Finance Suite (FL 1)",
      type: "office",
      polygon: [
        { x: 290, y: 380 },
        { x: 450, y: 380 },
        { x: 450, y: 600 },
        { x: 290, y: 600 },
      ],
      confidence: "high",
    },
  ],
  doors: [
    {
      id: "door-b3-201",
      position: { x: 240, y: 280 },
      connects: ["room-b3-201", "corridor-b3-2"],
      accessible: true,
      confidence: "high",
      angle: 0,
    },
    {
      id: "door-b3-202",
      position: { x: 675, y: 280 },
      connects: ["room-b3-202", "corridor-b3-2"],
      accessible: true,
      confidence: "high",
      angle: 0,
    },
    {
      id: "door-b3-203",
      position: { x: 370, y: 380 },
      connects: ["room-b3-203", "corridor-b3-2"],
      accessible: true,
      confidence: "high",
      angle: 0,
    },
  ],
  exits: [
    {
      id: "exit-b3-staircase-fl1-east",
      position: { x: 530, y: 430 },
      accessible: true,
      direction: "down",
    },
    {
      id: "exit-b3-staircase-fl1-west",
      position: { x: 230, y: 430 },
      accessible: true,
      direction: "down",
    },
  ],
  stairwells: [
    {
      id: "stairs-b3-fl2-east",
      polygon: [
        { x: 480, y: 430 },
        { x: 580, y: 430 },
        { x: 580, y: 530 },
        { x: 480, y: 530 },
      ],
    },
    {
      id: "stairs-b3-fl2-west",
      polygon: [
        { x: 180, y: 430 },
        { x: 280, y: 430 },
        { x: 280, y: 530 },
        { x: 180, y: 530 },
      ],
    },
  ],
  connections: [],
  hazards: [],
};

export const BUILDING_3_OCCUPANTS_FL1: Occupant[] = [
  {
    id: "occ-b3-101",
    roomId: "room-b3-101",
    position: { x: 220, y: 180 },
    profile: "normal",
    floorLevel: 1,
  } as Occupant,
  {
    id: "occ-b3-102",
    roomId: "room-b3-102",
    position: { x: 675, y: 180 },
    profile: "elderly",
    floorLevel: 1,
  } as Occupant,
  {
    id: "occ-b3-103",
    roomId: "room-b3-103",
    position: { x: 350, y: 480 },
    profile: "wheelchair",
    floorLevel: 1,
  } as Occupant,
];

export const BUILDING_3_OCCUPANTS_FL2: Occupant[] = [
  {
    id: "occ-b3-201",
    roomId: "room-b3-201",
    position: { x: 220, y: 180 },
    profile: "normal",
    floorLevel: 2,
  } as Occupant,
  {
    id: "occ-b3-202",
    roomId: "room-b3-202",
    position: { x: 675, y: 180 },
    profile: "child",
    floorLevel: 2,
  } as Occupant,
  {
    id: "occ-b3-203",
    roomId: "room-b3-203",
    position: { x: 350, y: 480 },
    profile: "temporary_injury",
    floorLevel: 2,
  } as Occupant,
];