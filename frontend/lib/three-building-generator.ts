import * as THREE from "three";
import type { FloorGeometry, Room, Door, ExitPoint, Stairwell, Point } from "./schema";

export interface Building3DConfig {
  scale: number;
  wallHeight: number;
  wallThickness: number;
  slabThickness: number;
  centerOrigin: { x: number; y: number };
}

export const DEFAULT_3D_CONFIG: Building3DConfig = {
  scale: 0.05, // 1000 units -> 50 units in 3D
  wallHeight: 2.6,
  wallThickness: 0.35,
  slabThickness: 0.4,
  centerOrigin: { x: 500, y: 400 },
};

/**
 * Converts 2D SVG canvas coordinates to centered 3D world coordinates (X, Z plane)
 */
export function toWorldCoords(p: Point, config: Building3DConfig = DEFAULT_3D_CONFIG): THREE.Vector3 {
  const x = (p.x - config.centerOrigin.x) * config.scale;
  const z = (p.y - config.centerOrigin.y) * config.scale;
  return new THREE.Vector3(x, 0, z);
}

/**
 * Converts 3D world coordinates back to 2D SVG coordinates
 */
export function toSvgCoords(v: THREE.Vector3, config: Building3DConfig = DEFAULT_3D_CONFIG): Point {
  return {
    x: v.x / config.scale + config.centerOrigin.x,
    y: v.z / config.scale + config.centerOrigin.y,
  };
}

/**
 * Calculates bounds of floor geometry
 */
function getFloorBounds(geometry: FloorGeometry) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  if (geometry.buildingOutline && geometry.buildingOutline.length > 0) {
    geometry.buildingOutline.forEach((p) => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });
  } else if (geometry.rooms && geometry.rooms.length > 0) {
    geometry.rooms.forEach((r) => {
      r.polygon.forEach((p) => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
    });
  }

  if (!isFinite(minX)) {
    minX = 0; minY = 0; maxX = 1000; maxY = 800;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(400, maxX - minX),
    height: Math.max(300, maxY - minY),
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

/**
 * Creates a photorealistic digital illuminated EXIT sign texture
 */
let cachedExitTexture: THREE.CanvasTexture | null = null;

export function getDigitalExitSignTexture(): THREE.CanvasTexture {
  if (typeof document === "undefined") {
    return new THREE.CanvasTexture(null as unknown as HTMLCanvasElement);
  }
  if (cachedExitTexture) return cachedExitTexture;

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    const bgGradient = ctx.createLinearGradient(0, 0, 512, 256);
    bgGradient.addColorStop(0, "#064e3b");
    bgGradient.addColorStop(0.5, "#059669");
    bgGradient.addColorStop(1, "#047857");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 512, 256);

    ctx.fillStyle = "rgba(16, 185, 129, 0.18)";
    for (let x = 0; x < 512; x += 8) {
      ctx.fillRect(x, 0, 4, 256);
    }
    for (let y = 0; y < 256; y += 8) {
      ctx.fillRect(0, y, 512, 4);
    }

    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 12;
    ctx.strokeRect(14, 14, 512 - 28, 256 - 28);

    ctx.strokeStyle = "rgba(52, 211, 153, 0.6)";
    ctx.lineWidth = 6;
    ctx.strokeRect(26, 26, 512 - 52, 256 - 52);

    ctx.shadowColor = "#34d399";
    ctx.shadowBlur = 24;

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(105, 75, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#ffffff";

    ctx.beginPath();
    ctx.moveTo(105, 95);
    ctx.lineTo(95, 150);
    ctx.lineTo(65, 195);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(95, 150);
    ctx.lineTo(130, 190);
    ctx.lineTo(155, 220);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(105, 110);
    ctx.lineTo(70, 140);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(105, 110);
    ctx.lineTo(145, 125);
    ctx.lineTo(165, 100);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 10;
    ctx.strokeRect(40, 50, 60, 156);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 84px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("EXIT", 195, 128);

    ctx.beginPath();
    ctx.moveTo(420, 128);
    ctx.lineTo(465, 128);
    ctx.lineTo(445, 105);
    ctx.moveTo(465, 128);
    ctx.lineTo(445, 151);
    ctx.lineWidth = 14;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  cachedExitTexture = texture;
  return texture;
}

/**
 * Shared Architectural Materials
 */
export function createArchitecturalMaterials() {
  return {
    floorSlab: new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.8,
      metalness: 0.1,
    }),
    roomFloorOffice: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.05,
    }),
    roomFloorCorridor: new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.75,
      metalness: 0.1,
    }),
    roomFloorMeeting: new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.8,
      metalness: 0.05,
    }),
    roomFloorSelected: new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.35,
      roughness: 0.6,
      metalness: 0.2,
    }),
    wallSolid: new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      metalness: 0.2,
    }),
    wallGlass: new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      transmission: 0.85,
      opacity: 0.95,
      transparent: true,
      roughness: 0.1,
      ior: 1.5,
      thickness: 0.25,
      specularColor: new THREE.Color(0xffffff),
    }),
    wallTrim: new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.6,
    }),
    exitSignBody: new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.6,
    }),
    exitGlowGreen: new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    }),
    doorFrame: new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.5,
      metalness: 0.5,
    }),
    doorPanel: new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.4,
      transparent: true,
      opacity: 0.85,
    }),
    stairwellMaterial: new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.4,
    }),
    stairTreadMaterial: new THREE.MeshStandardMaterial({
      color: 0x059669,
      emissive: 0x059669,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.6,
    }),
  };
}

/**
 * Builds complete 3D Floor Geometry Mesh Group with Vertical Stack Support
 */
export function buildFloorGeometry3D(
  geometry: FloorGeometry,
  materials: ReturnType<typeof createArchitecturalMaterials>,
  config: Building3DConfig = DEFAULT_3D_CONFIG,
  selectedRoomId: string | null = null,
  allFloors?: FloorGeometry[]
): THREE.Group {
  const rootGroup = new THREE.Group();
  rootGroup.name = "FloorGeometryRoot";

  const isMultiFloor = Boolean(allFloors && allFloors.length > 1);
  const floorsToBuild: FloorGeometry[] = isMultiFloor && allFloors ? allFloors : [geometry];

  floorsToBuild.forEach((fl) => {
    const yOffset = (fl.floorLevel - 1) * 3.5;
    const isCurrentActiveFloor = fl.floorLevel === geometry.floorLevel;
    const floorGroup = buildSingleFloorLevel3D(
      fl,
      materials,
      config,
      selectedRoomId,
      isCurrentActiveFloor,
      isMultiFloor
    );
    floorGroup.position.y = yOffset;
    rootGroup.add(floorGroup);
  });

  // Render 3D vertical stairwell columns connecting levels for multi-floor buildings
  if (isMultiFloor && allFloors) {
    const maxLevel = Math.max(...allFloors.map((f) => f.floorLevel));
    const stairwellFloor = allFloors.find((f) => f.stairwells && f.stairwells.length > 0);
    const stairCenters = getStairwellCenters(stairwellFloor);
    stairCenters.forEach((stairCenter2D) => {
      const stairGroup = buildMultiLevelStaircase3D(materials, config, maxLevel, stairCenter2D);
      rootGroup.add(stairGroup);
    });
  }

  return rootGroup;
}

/**
 * Builds a single floor level at specified elevation
 */
function buildSingleFloorLevel3D(
  geometry: FloorGeometry,
  materials: ReturnType<typeof createArchitecturalMaterials>,
  config: Building3DConfig,
  selectedRoomId: string | null,
  isActiveFloor: boolean,
  isMultiFloor = false
): THREE.Group {
  const rootGroup = new THREE.Group();
  rootGroup.name = `FloorLevel_${geometry.floorLevel}`;

  const bounds = getFloorBounds(geometry);

  // 1. Foundation Slab
  const slabWidth = (bounds.width + 120) * config.scale;
  const slabHeight = (bounds.height + 120) * config.scale;
  const slabGeo = new THREE.BoxGeometry(slabWidth, config.slabThickness, slabHeight);

  // Architectural Ultra-Clear Glass Floor Slabs for Multi-Floor Buildings (prevents blocking lower floors)
  const slabMat = isMultiFloor
    ? new THREE.MeshPhysicalMaterial({
        color: 0xe2e8f0,
        transmission: 0.96,
        opacity: 0.18,
        transparent: true,
        roughness: 0.05,
        ior: 1.4,
        thickness: 0.1,
        depthWrite: false,
      })
    : materials.floorSlab;

  const slabMesh = new THREE.Mesh(slabGeo, slabMat);
  slabMesh.position.set(
    (bounds.centerX - config.centerOrigin.x) * config.scale,
    -config.slabThickness / 2,
    (bounds.centerY - config.centerOrigin.y) * config.scale
  );
  slabMesh.receiveShadow = true;
  rootGroup.add(slabMesh);

  // 2. Build Rooms
  const allCutoutPoints = [
    ...(geometry.doors || []),
    ...(geometry.exits || []).map((e) => ({
      id: e.id,
      position: e.position,
      connects: ["corridor-1", "exterior"] as [string, string],
      accessible: e.accessible,
    })),
  ];

  geometry.rooms.forEach((room) => {
    const isSelected = selectedRoomId === room.id;
    const roomGroup = buildRoom3D(room, materials, config, isSelected, allCutoutPoints, isActiveFloor);
    rootGroup.add(roomGroup);
  });

  // 3. Build Doors
  if (geometry.doors) {
    geometry.doors.forEach((door) => {
      const doorMesh = buildDoor3D(door, materials, config);
      rootGroup.add(doorMesh);
    });
  }

  // 4. Build Exit Portals
  if (geometry.exits) {
    geometry.exits.forEach((exit) => {
      const exitGroup = buildExit3D(exit, materials, config);
      rootGroup.add(exitGroup);
    });
  }

  return rootGroup;
}

const FALLBACK_STAIR_CENTER_2D = { x: 530, y: 430 };

/**
 * Derives plan-view centers for all stairwells present on the floor
 */
function getStairwellCenters(floor?: FloorGeometry): { x: number; y: number }[] {
  if (!floor?.stairwells || floor.stairwells.length === 0) {
    return [FALLBACK_STAIR_CENTER_2D];
  }
  return floor.stairwells.map((stairwell) => {
    const xs = stairwell.polygon.map((pt) => pt.x);
    const ys = stairwell.polygon.map((pt) => pt.y);
    return {
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: Math.min(...ys),
    };
  });
}

/**
 * Builds 3D Vertical Stairwell Column physically connecting stacked floor levels
 */
function buildMultiLevelStaircase3D(
  materials: ReturnType<typeof createArchitecturalMaterials>,
  config: Building3DConfig,
  maxLevel: number,
  stairCenter2D: { x: number; y: number } = FALLBACK_STAIR_CENTER_2D
): THREE.Group {
  const group = new THREE.Group();
  group.name = "VerticalStairwellColumn";

  const p = toWorldCoords(stairCenter2D, config);

  const width = 2.4;
  const depth = 2.4;
  const totalHeight = (maxLevel - 1) * 3.5 + config.wallHeight;

  // 1. Translucent 3D Vertical Glass Shaft Wall
  const shaftGeo = new THREE.BoxGeometry(width, totalHeight, depth);
  const shaftMat = new THREE.MeshPhysicalMaterial({
    color: 0x0284c7,
    transmission: 0.8,
    opacity: 0.5,
    transparent: true,
    roughness: 0.2,
    ior: 1.4,
  });
  const shaftMesh = new THREE.Mesh(shaftGeo, shaftMat);
  shaftMesh.position.set(p.x, totalHeight / 2, p.z);
  group.add(shaftMesh);

  // 2. Physical 3D Stair Risers climbing between each level
  const totalSteps = (maxLevel - 1) * 12;
  const stepHeight = totalHeight / totalSteps;
  const stepDepth = depth / 12;

  for (let i = 0; i < totalSteps; i++) {
    const stepGeo = new THREE.BoxGeometry(width * 0.85, 0.12, stepDepth * 0.9);
    const stepMesh = new THREE.Mesh(stepGeo, materials.stairTreadMaterial);
    const stepY = i * stepHeight + 0.06;
    const stepZ = p.z - depth / 2 + (i % 12) * stepDepth + stepDepth / 2;
    stepMesh.position.set(p.x, stepY, stepZ);
    group.add(stepMesh);
  }

  return group;
}

function projectPointOnSegment(
  p: THREE.Vector3,
  a: THREE.Vector3,
  b: THREE.Vector3
): { dist: number; t: number } {
  const ab = new THREE.Vector3().subVectors(b, a);
  const lenSq = ab.lengthSq();
  if (lenSq === 0) return { dist: p.distanceTo(a), t: 0 };
  const ap = new THREE.Vector3().subVectors(p, a);
  const t = Math.max(0, Math.min(1, ap.dot(ab) / lenSq));
  const proj = a.clone().add(ab.multiplyScalar(t));
  return { dist: p.distanceTo(proj), t };
}

/**
 * Builds a 3D Room representation
 */
function buildRoom3D(
  room: Room,
  materials: ReturnType<typeof createArchitecturalMaterials>,
  config: Building3DConfig,
  isSelected: boolean = false,
  allDoors: Door[] = [],
  isActiveFloor: boolean = true
): THREE.Group {
  const group = new THREE.Group();
  group.name = `Room_${room.id}`;
  group.userData = { type: "room", roomData: room };

  const poly = room.polygon;
  if (!poly || poly.length < 3) return group;

  // 1. Room Floor Surface
  const shape = new THREE.Shape();
  const firstP = toWorldCoords(poly[0], config);
  shape.moveTo(firstP.x, -firstP.z);

  for (let i = 1; i < poly.length; i++) {
    const p = toWorldCoords(poly[i], config);
    shape.lineTo(p.x, -p.z);
  }
  shape.closePath();

  const floorGeo = new THREE.ShapeGeometry(shape);
  floorGeo.rotateX(Math.PI / 2);

  let floorMat = materials.roomFloorOffice;
  if (isSelected) floorMat = materials.roomFloorSelected;
  else if (room.type === "corridor") floorMat = materials.roomFloorCorridor;
  else if (room.type === "meeting_room") floorMat = materials.roomFloorMeeting;

  if (!isActiveFloor) {
    floorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.05,
    });
  }

  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.position.y = 0.02;
  floorMesh.receiveShadow = true;
  floorMesh.userData = { type: "room_floor", roomId: room.id, roomData: room };
  group.add(floorMesh);

  // 2. Extruded Walls
  const isCorridor = room.type === "corridor";
  let wallMat = isCorridor ? materials.wallGlass : materials.wallSolid;
  if (!isActiveFloor) {
    wallMat = isCorridor
      ? materials.wallGlass
      : new THREE.MeshStandardMaterial({
          color: 0x334155,
          roughness: 0.6,
          metalness: 0.2,
          transparent: true,
          opacity: 0.85,
        });
  }

  const wallH = isCorridor ? config.wallHeight * 0.75 : config.wallHeight;

  const doorWorldPositions = (allDoors || []).map((d) => toWorldCoords(d.position, config));

  for (let i = 0; i < poly.length; i++) {
    const p1 = toWorldCoords(poly[i], config);
    const p2 = toWorldCoords(poly[(i + 1) % poly.length], config);
    const segVec = new THREE.Vector3().subVectors(p2, p1);
    const segLen = segVec.length();

    if (segLen < 0.01) continue;

    let doorParam: number | null = null;
    for (const dPos of doorWorldPositions) {
      const proj = projectPointOnSegment(dPos, p1, p2);
      if (proj.dist < 1.4 && proj.t > 0.04 && proj.t < 0.96) {
        doorParam = proj.t;
        break;
      }
    }

    if (doorParam !== null) {
      const gapHalfWidth = 1.15;
      const gapParamHalf = gapHalfWidth / segLen;

      const t1 = Math.max(0, doorParam - gapParamHalf);
      const t2 = Math.min(1, doorParam + gapParamHalf);

      if (t1 > 0.05) {
        const wallP1 = p1;
        const wallP2 = p1.clone().lerp(p2, t1);
        const wallMesh = createWallSegment(wallP1, wallP2, wallH, config.wallThickness, wallMat);
        wallMesh.userData = { type: "wall", roomId: room.id };
        group.add(wallMesh);
      }

      if (t2 < 0.95) {
        const wallP1 = p1.clone().lerp(p2, t2);
        const wallP2 = p2;
        const wallMesh = createWallSegment(wallP1, wallP2, wallH, config.wallThickness, wallMat);
        wallMesh.userData = { type: "wall", roomId: room.id };
        group.add(wallMesh);
      }
    } else {
      const wallMesh = createWallSegment(p1, p2, wallH, config.wallThickness, wallMat);
      wallMesh.userData = { type: "wall", roomId: room.id };
      group.add(wallMesh);
    }
  }

  return group;
}

function createWallSegment(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  height: number,
  thickness: number,
  material: THREE.Material
): THREE.Mesh {
  const dx = p2.x - p1.x;
  const dz = p2.z - p1.z;
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);

  const geo = new THREE.BoxGeometry(length, height, thickness);
  const mesh = new THREE.Mesh(geo, material);

  mesh.position.set((p1.x + p2.x) / 2, height / 2, (p1.z + p2.z) / 2);
  mesh.rotation.y = -angle;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

function buildDoor3D(
  door: Door,
  materials: ReturnType<typeof createArchitecturalMaterials>,
  config: Building3DConfig
): THREE.Group {
  const group = new THREE.Group();
  group.name = `Door_${door.id}`;
  group.userData = { type: "door", doorData: door };

  const p = toWorldCoords(door.position, config);
  group.position.set(p.x, 0, p.z);

  const width = Math.max(2.2, 42 * config.scale);
  const height = config.wallHeight * 0.88;
  const wallThick = config.wallThickness * 1.4;
  const jambWidth = 0.22;

  const leftJambGeo = new THREE.BoxGeometry(jambWidth, height, wallThick);
  const leftJamb = new THREE.Mesh(leftJambGeo, materials.doorFrame);
  leftJamb.position.set(-width / 2 + jambWidth / 2, height / 2, 0);
  leftJamb.castShadow = true;
  group.add(leftJamb);

  const rightJambGeo = new THREE.BoxGeometry(jambWidth, height, wallThick);
  const rightJamb = new THREE.Mesh(rightJambGeo, materials.doorFrame);
  rightJamb.position.set(width / 2 - jambWidth / 2, height / 2, 0);
  rightJamb.castShadow = true;
  group.add(rightJamb);

  const lintelGeo = new THREE.BoxGeometry(width, 0.24, wallThick);
  const lintel = new THREE.Mesh(lintelGeo, materials.doorFrame);
  lintel.position.set(0, height - 0.12, 0);
  lintel.castShadow = true;
  group.add(lintel);

  const singleLeafWidth = (width - jambWidth * 2) / 2;
  const leafHeight = height - 0.24;
  const leafGeo = new THREE.BoxGeometry(singleLeafWidth, leafHeight, 0.08);

  const leftHingeGroup = new THREE.Group();
  leftHingeGroup.position.set(-width / 2 + jambWidth, 0, 0);
  leftHingeGroup.rotation.y = -Math.PI * 0.45;

  const leftLeafMesh = new THREE.Mesh(leafGeo, materials.doorPanel);
  leftLeafMesh.position.set(singleLeafWidth / 2, leafHeight / 2, 0);
  leftLeafMesh.castShadow = true;
  leftHingeGroup.add(leftLeafMesh);
  group.add(leftHingeGroup);

  const rightHingeGroup = new THREE.Group();
  rightHingeGroup.position.set(width / 2 - jambWidth, 0, 0);
  rightHingeGroup.rotation.y = Math.PI * 0.45;

  const rightLeafMesh = new THREE.Mesh(leafGeo, materials.doorPanel);
  rightLeafMesh.position.set(-singleLeafWidth / 2, leafHeight / 2, 0);
  rightLeafMesh.castShadow = true;
  rightHingeGroup.add(rightLeafMesh);
  group.add(rightHingeGroup);

  const thresholdGeo = new THREE.PlaneGeometry(width * 0.95, wallThick * 1.8);
  thresholdGeo.rotateX(-Math.PI / 2);
  const thresholdMesh = new THREE.Mesh(thresholdGeo, materials.exitGlowGreen);
  thresholdMesh.position.set(0, 0.02, 0);
  group.add(thresholdMesh);

  if (door.angle) {
    group.rotation.y = THREE.MathUtils.degToRad(door.angle);
  }

  return group;
}

function buildExit3D(
  exit: ExitPoint,
  materials: ReturnType<typeof createArchitecturalMaterials>,
  config: Building3DConfig
): THREE.Group {
  const group = new THREE.Group();
  group.name = `Exit_${exit.id}`;
  group.userData = { type: "exit", exitData: exit };

  const p = toWorldCoords(exit.position, config);
  group.position.set(p.x, 0, p.z);

  const width = Math.max(2.4, 46 * config.scale);
  const height = config.wallHeight * 0.92;
  const wallThick = config.wallThickness * 1.5;
  const jambWidth = 0.24;

  const leftJambGeo = new THREE.BoxGeometry(jambWidth, height, wallThick);
  const leftJamb = new THREE.Mesh(leftJambGeo, materials.doorFrame);
  leftJamb.position.set(-width / 2 + jambWidth / 2, height / 2, 0);
  leftJamb.castShadow = true;
  group.add(leftJamb);

  const rightJambGeo = new THREE.BoxGeometry(jambWidth, height, wallThick);
  const rightJamb = new THREE.Mesh(rightJambGeo, materials.doorFrame);
  rightJamb.position.set(width / 2 - jambWidth / 2, height / 2, 0);
  rightJamb.castShadow = true;
  group.add(rightJamb);

  const lintelGeo = new THREE.BoxGeometry(width, 0.26, wallThick);
  const lintel = new THREE.Mesh(lintelGeo, materials.doorFrame);
  lintel.position.set(0, height - 0.13, 0);
  lintel.castShadow = true;
  group.add(lintel);

  const singleLeafWidth = (width - jambWidth * 2) / 2;
  const leafHeight = height - 0.26;
  const leafGeo = new THREE.BoxGeometry(singleLeafWidth, leafHeight, 0.08);

  const leftHinge = new THREE.Group();
  leftHinge.position.set(-width / 2 + jambWidth, 0, 0);
  leftHinge.rotation.y = -Math.PI * 0.45;
  const leftLeaf = new THREE.Mesh(leafGeo, materials.doorPanel);
  leftLeaf.position.set(singleLeafWidth / 2, leafHeight / 2, 0);
  leftLeaf.castShadow = true;
  leftHinge.add(leftLeaf);
  group.add(leftHinge);

  const rightHinge = new THREE.Group();
  rightHinge.position.set(width / 2 - jambWidth, 0, 0);
  rightHinge.rotation.y = Math.PI * 0.45;
  const rightLeaf = new THREE.Mesh(leafGeo, materials.doorPanel);
  rightLeaf.position.set(-singleLeafWidth / 2, leafHeight / 2, 0);
  rightLeaf.castShadow = true;
  rightHinge.add(rightLeaf);
  group.add(rightHinge);

  const exitTexture = getDigitalExitSignTexture();
  const exitMat = new THREE.MeshStandardMaterial({
    map: exitTexture,
    emissiveMap: exitTexture,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 1.0,
    roughness: 0.2,
  });

  const signGeo = new THREE.BoxGeometry(2.0, 0.85, 0.32);
  const signMesh = new THREE.Mesh(signGeo, materials.exitSignBody);
  signMesh.position.set(0, height + 0.45, 0);
  group.add(signMesh);

  const faceGeo = new THREE.PlaneGeometry(1.9, 0.78);
  const faceFront = new THREE.Mesh(faceGeo, exitMat);
  faceFront.position.set(0, height + 0.45, 0.17);
  group.add(faceFront);

  const faceBack = new THREE.Mesh(faceGeo, exitMat);
  faceBack.position.set(0, height + 0.45, -0.17);
  faceBack.rotation.y = Math.PI;
  group.add(faceBack);

  const ringGeo = new THREE.RingGeometry(0.8, 1.35, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMesh = new THREE.Mesh(ringGeo, materials.exitGlowGreen);
  ringMesh.position.set(0, 0.03, 0);
  group.add(ringMesh);

  if (exit.direction === "left") group.rotation.y = Math.PI / 2;
  else if (exit.direction === "right") group.rotation.y = -Math.PI / 2;
  else if (exit.direction === "up") group.rotation.y = Math.PI;

  return group;
}
