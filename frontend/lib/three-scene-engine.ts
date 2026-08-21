import * as THREE from "three";
import type { FloorGeometry, Hazard, Occupant, RouteSegment, Room } from "./schema";
import {
  buildFloorGeometry3D,
  createArchitecturalMaterials,
  DEFAULT_3D_CONFIG,
  Building3DConfig,
} from "./three-building-generator";
import { HazardVisual3D } from "./three-hazard-system";
import { OccupantVisual3D } from "./three-occupant-system";
import { RouteVisual3D } from "./three-route-system";

export type CameraPreset = "isometric" | "topdown" | "perspective" | "orbit";

export interface SceneEngineCallbacks {
  onSelectRoom?: (room: Room | null) => void;
  onSelectOccupant?: (occupant: Occupant | null) => void;
  onSelectHazard?: (hazard: Hazard | null) => void;
  onFpsUpdate?: (fps: number) => void;
}

export class DigitalTwin3DScene {
  public container: HTMLElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  private materials: ReturnType<typeof createArchitecturalMaterials>;
  private config: Building3DConfig;
  private callbacks: SceneEngineCallbacks;

  // Visual Entity Layers
  private floorGroup: THREE.Group | null = null;
  private hazardsMap: Map<string, HazardVisual3D> = new Map();
  private occupantsMap: Map<string, OccupantVisual3D> = new Map();
  private routesMap: Map<string, RouteVisual3D> = new Map();
  private currentRoutesMap: Map<string, RouteSegment> = new Map();

  // Animation & Clock
  private clock: THREE.Clock;
  private animationFrameId: number | null = null;
  private isDestroyed = false;

  // Interaction & Camera Controls
  private targetLookAt = new THREE.Vector3(0, 0, 0);
  private currentLookAt = new THREE.Vector3(0, 0, 0);
  private targetCameraPos = new THREE.Vector3(0, 28, 30);
  private spherical = new THREE.Spherical(42, Math.PI / 3.2, Math.PI / 4.5);
  private targetSpherical = new THREE.Spherical(42, Math.PI / 3.2, Math.PI / 4.5);

  private isDragging = false;
  private isPanning = false;
  private mousePrevious = { x: 0, y: 0 };
  private raycaster = new THREE.Raycaster();
  private mouseNDC = new THREE.Vector2(-1000, -1000);

  // Selected Entities
  private selectedRoomId: string | null = null;
  private selectedOccupantId: string | null = null;

  constructor(
    container: HTMLElement,
    callbacks: SceneEngineCallbacks = {},
    config: Building3DConfig = DEFAULT_3D_CONFIG
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.config = config;
    this.clock = new THREE.Clock();

    // 1. Scene Setup (Pristine Architectural White Studio)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf8fafc);
    this.scene.fog = new THREE.FogExp2(0xf8fafc, 0.006);

    // 2. Camera
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 200);
    this.updateCameraFromSpherical();

    // 3. Renderer with High-End Tone Mapping & Soft Shadows
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    container.appendChild(this.renderer.domElement);

    // 4. Materials
    this.materials = createArchitecturalMaterials();

    // 5. Lighting Rig
    this.setupLighting();

    // 6. Event Listeners
    this.setupEvents();

    // 7. Start Loop
    this.animate();
  }

  private setupLighting() {
    // Ambient Soft Studio Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    this.scene.add(ambientLight);

    // Directional Architectural Key Light
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.4);
    sunLight.position.set(30, 50, 35);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 120;
    sunLight.shadow.camera.left = -35;
    sunLight.shadow.camera.right = 35;
    sunLight.shadow.camera.top = 35;
    sunLight.shadow.camera.bottom = -35;
    sunLight.shadow.bias = -0.0003;
    this.scene.add(sunLight);

    // Soft Blue Fill Accent Light
    const rimLight = new THREE.DirectionalLight(0xbae6fd, 0.8);
    rimLight.position.set(-30, 25, -25);
    this.scene.add(rimLight);

    // Subtle Ground Bounce Light
    const floorGlow = new THREE.DirectionalLight(0xe2e8f0, 0.6);
    floorGlow.position.set(0, -10, 0);
    this.scene.add(floorGlow);
  }

  private setupEvents() {
    const el = this.renderer.domElement;

    el.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mouseup", this.onMouseUp);
    el.addEventListener("wheel", this.onWheel, { passive: false });
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("resize", this.onResize);
  }

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.isDragging = true;
      this.isPanning = false;
    } else if (e.button === 2) {
      this.isDragging = false;
      this.isPanning = true;
    }
    this.mousePrevious = { x: e.clientX, y: e.clientY };
  };

  private onMouseMove = (e: MouseEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const dx = e.clientX - this.mousePrevious.x;
    const dy = e.clientY - this.mousePrevious.y;

    if (this.isDragging) {
      // Orbit rotation
      this.targetSpherical.theta -= dx * 0.006;
      this.targetSpherical.phi = Math.max(
        0.15,
        Math.min(Math.PI / 2 - 0.05, this.targetSpherical.phi - dy * 0.006)
      );
    } else if (this.isPanning) {
      // Pan target in ground plane
      const panSpeed = this.targetSpherical.radius * 0.0012;
      const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        this.spherical.theta
      );
      const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        this.spherical.theta
      );

      this.targetLookAt.addScaledVector(right, -dx * panSpeed);
      this.targetLookAt.addScaledVector(forward, dy * panSpeed);
    }

    this.mousePrevious = { x: e.clientX, y: e.clientY };
  };

  private onMouseUp = (e: MouseEvent) => {
    if (this.isDragging || this.isPanning) {
      const moved =
        Math.hypot(e.clientX - this.mousePrevious.x, e.clientY - this.mousePrevious.y) > 4;
      if (!moved && e.button === 0) {
        this.handleClickRaycast();
      }
    }
    this.isDragging = false;
    this.isPanning = false;
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    this.targetSpherical.radius = Math.max(
      12,
      Math.min(85, this.targetSpherical.radius * zoomFactor)
    );
  };

  private onResize = () => {
    if (!this.container || this.isDestroyed) return;
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private handleClickRaycast() {
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length === 0) {
      this.callbacks.onSelectRoom?.(null);
      this.callbacks.onSelectOccupant?.(null);
      return;
    }

    // Traverse upwards to find interactive groups
    for (const hit of intersects) {
      let current: THREE.Object3D | null = hit.object;
      while (current && current !== this.scene) {
        if (current.userData?.type === "occupant") {
          const occupantId = current.userData.id;
          this.selectedOccupantId = occupantId;
          const occVis = this.occupantsMap.get(occupantId);
          if (occVis) {
            this.callbacks.onSelectOccupant?.(occVis.occupant);
            return;
          }
        }
        if (current.userData?.type === "room") {
          const roomId = current.userData.id;
          this.selectedRoomId = roomId;
          this.callbacks.onSelectRoom?.(current.userData as unknown as Room);
          return;
        }
        current = current.parent;
      }
    }
  }

  public setCameraPreset(preset: CameraPreset) {
    if (preset === "isometric") {
      this.targetSpherical.radius = 44;
      this.targetSpherical.phi = Math.PI / 3.4;
      this.targetSpherical.theta = Math.PI / 4.2;
      this.targetLookAt.set(0, 0, 0);
    } else if (preset === "topdown") {
      this.targetSpherical.radius = 38;
      this.targetSpherical.phi = 0.08; // almost straight down
      this.targetSpherical.theta = 0;
      this.targetLookAt.set(0, 0, 0);
    } else if (preset === "perspective") {
      this.targetSpherical.radius = 28;
      this.targetSpherical.phi = Math.PI / 2.6;
      this.targetSpherical.theta = Math.PI / 6;
      this.targetLookAt.set(0, 1.0, 0);
    } else if (preset === "orbit") {
      this.targetSpherical.radius = 42;
      this.targetSpherical.phi = Math.PI / 3.2;
      this.targetSpherical.theta = this.spherical.theta + Math.PI / 2;
    }
  }

  public resetView() {
    this.setCameraPreset("isometric");
  }

  public zoomIn() {
    this.targetSpherical.radius = Math.max(12, this.targetSpherical.radius * 0.8);
  }

  public zoomOut() {
    this.targetSpherical.radius = Math.min(85, this.targetSpherical.radius * 1.25);
  }

  /**
   * Synchronizes Floor Geometry
   */
  public updateFloorGeometry(
    geometry: FloorGeometry,
    selectedRoomId: string | null = null,
    allFloors?: FloorGeometry[]
  ) {
    this.selectedRoomId = selectedRoomId;
    if (this.floorGroup) {
      this.scene.remove(this.floorGroup);
    }
    this.floorGroup = buildFloorGeometry3D(
      geometry,
      this.materials,
      this.config,
      selectedRoomId,
      allFloors
    );
    this.scene.add(this.floorGroup);

    // Update hazards if attached to floor
    if (geometry.hazards) {
      this.updateHazards(geometry.hazards);
    }
  }

  /**
   * Synchronizes Hazards
   */
  public updateHazards(hazards: Hazard[]) {
    // Remove hazards no longer present
    const incomingIds = new Set(hazards.map((h) => h.id));
    for (const [id, visual] of this.hazardsMap.entries()) {
      if (!incomingIds.has(id)) {
        this.scene.remove(visual.group);
        this.hazardsMap.delete(id);
      }
    }

    // Add / Update
    hazards.forEach((hazard) => {
      if (!this.hazardsMap.has(hazard.id)) {
        const visual = new HazardVisual3D(hazard, this.config);
        this.scene.add(visual.group);
        this.hazardsMap.set(hazard.id, visual);
      }
    });
  }

  /**
   * Synchronizes Occupants & Triggers Running Locomotion
   */
  public updateOccupants(occupants: Occupant[], selectedOccupantId: string | null = null) {
    this.selectedOccupantId = selectedOccupantId;
    const incomingIds = new Set(occupants.map((o) => o.id));

    for (const [id, visual] of this.occupantsMap.entries()) {
      if (!incomingIds.has(id)) {
        this.scene.remove(visual.group);
        this.occupantsMap.delete(id);
      }
    }

    occupants.forEach((occupant, index) => {
      let visual = this.occupantsMap.get(occupant.id);
      if (!visual) {
        visual = new OccupantVisual3D(occupant, this.config);
        this.scene.add(visual.group);
        this.occupantsMap.set(occupant.id, visual);
      } else {
        visual.updateOccupantData(occupant, this.config);
      }
      visual.setSelected(selectedOccupantId === occupant.id);

      // GUARANTEE LOCOMOTION & ANTI-OVERLAPPING: Start evacuation with index offset!
      const activeRoute = this.currentRoutesMap.get(occupant.id);
      if (activeRoute && activeRoute.path && activeRoute.path.length > 1) {
        visual.startEvacuation(activeRoute.path, this.config, index);
      }
    });
  }

  /**
   * Synchronizes Evacuation Routes & Triggers Occupant Running Locomotion
   */
  public updateRoutes(routes: RouteSegment[]) {
    // Clear old routes
    for (const visual of this.routesMap.values()) {
      this.scene.remove(visual.group);
    }
    this.routesMap.clear();
    this.currentRoutesMap.clear();

    if (routes && routes.length > 0) {
      routes.forEach((route, index) => {
        this.currentRoutesMap.set(route.occupantId, route);
        const visual = new RouteVisual3D(route, this.config);
        this.scene.add(visual.group);
        this.routesMap.set(route.occupantId, visual);

        // Instruct 3D person/wheelchair to physically run outward to their exit!
        const occupantVisual = this.occupantsMap.get(route.occupantId);
        if (occupantVisual) {
          occupantVisual.startEvacuation(route.path, this.config, index);
        }
      });
    } else {
      // Simulation stopped: Return all occupants safely to initial positions
      for (const occupantVisual of this.occupantsMap.values()) {
        occupantVisual.stopEvacuation();
      }
    }
  }

  private updateCameraFromSpherical() {
    this.spherical.radius = THREE.MathUtils.lerp(
      this.spherical.radius,
      this.targetSpherical.radius,
      0.08
    );
    this.spherical.phi = THREE.MathUtils.lerp(
      this.spherical.phi,
      this.targetSpherical.phi,
      0.08
    );
    this.spherical.theta = THREE.MathUtils.lerp(
      this.spherical.theta,
      this.targetSpherical.theta,
      0.08
    );
    this.currentLookAt.lerp(this.targetLookAt, 0.08);

    this.targetCameraPos.setFromSpherical(this.spherical).add(this.currentLookAt);
    this.camera.position.copy(this.targetCameraPos);
    this.camera.lookAt(this.currentLookAt);
  }

  private animate = () => {
    if (this.isDestroyed) return;
    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    // Smooth Camera
    this.updateCameraFromSpherical();

    // Update Hazards (lights, pulse, embers)
    for (const hazard of this.hazardsMap.values()) {
      hazard.update(delta, elapsed);
    }

    // Update Occupants (locomotion, idle breath, selection ring)
    for (const occupant of this.occupantsMap.values()) {
      occupant.update(delta, elapsed);
    }

    // Update Routes (flowing particles)
    for (const route of this.routesMap.values()) {
      route.update(delta, elapsed);
    }

    this.renderer.render(this.scene, this.camera);
  };

  public destroy() {
    this.isDestroyed = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mouseup", this.onMouseUp);

    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
