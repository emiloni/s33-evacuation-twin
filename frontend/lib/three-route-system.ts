import * as THREE from "three";
import type { RouteSegment } from "./schema";
import { toWorldCoords, Building3DConfig, DEFAULT_3D_CONFIG } from "./three-building-generator";

/**
 * RouteVisual3D renders evacuation paths as straight tube segments
 * between graph nodes. No CatmullRom spline smoothing — the path
 * follows the exact graph topology to avoid crossing walls.
 */
export class RouteVisual3D {
  public group: THREE.Group;
  private pathPoints: THREE.Vector3[] = [];
  private totalLength = 0;
  private segmentLengths: number[] = [];
  private pulseParticles: THREE.Points | null = null;
  private particleCount = 22;
  private particleProgress: Float32Array;
  private particlePositions: Float32Array;
  private routeColor: number;
  private tubeMeshes: THREE.Mesh[] = [];
  private emissiveMaterials: THREE.MeshStandardMaterial[] = [];

  constructor(
    public route: RouteSegment,
    config: Building3DConfig = DEFAULT_3D_CONFIG
  ) {
    this.group = new THREE.Group();
    this.group.name = `route-3d-${route.occupantId}`;
    this.group.userData = {
      type: "route",
      occupantId: route.occupantId,
      exitId: route.exitId,
      eta: route.eta,
      confidence: route.confidence,
    };

    this.routeColor = route.isRerouted
      ? 0x047857 // Dark emerald green (safe reroute)
      : route.confidence === "low"
      ? 0xdc2626 // Red (hazard vector)
      : 0x1d4ed8; // Dark royal blue (normal route)

    this.particleProgress = new Float32Array(this.particleCount);
    this.particlePositions = new Float32Array(this.particleCount * 3);

    this.buildRouteGeometry(route, config);
  }

  private buildRouteGeometry(route: RouteSegment, config: Building3DConfig) {
    if (!route.path || route.path.length < 2) return;

    // Convert waypoints to 3D world coordinates at floor height
    this.pathPoints = route.path.map((p) => {
      const w = toWorldCoords(p, config);
      const level = (p as any).level || (route as any).floorLevel || 1;
      const yLevel = (level - 1) * 3.5 + 0.18;
      return new THREE.Vector3(w.x, yLevel, w.z);
    });

    // Calculate segment lengths for particle animation
    this.segmentLengths = [];
    this.totalLength = 0;
    for (let i = 0; i < this.pathPoints.length - 1; i++) {
      const len = this.pathPoints[i].distanceTo(this.pathPoints[i + 1]);
      this.segmentLengths.push(len);
      this.totalLength += len;
    }

    if (this.totalLength < 0.01) return;

    const TUBE_RADIUS = 0.18;
    const JOINT_RADIUS = 0.28;
    const Y_OFFSET = -0.04; // Under-glow offset

    // ── Build straight tube segments between consecutive graph nodes ──
    for (let i = 0; i < this.pathPoints.length - 1; i++) {
      const p1 = this.pathPoints[i];
      const p2 = this.pathPoints[i + 1];
      const segment = new THREE.Vector3().subVectors(p2, p1);
      const length = segment.length();
      if (length < 0.01) continue;

      // Tube along segment
      const direction = segment.clone().normalize();
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

      const tubeGeo = new THREE.CylinderGeometry(TUBE_RADIUS, TUBE_RADIUS, length, 8, 1, true);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: this.routeColor,
        emissive: this.routeColor,
        emissiveIntensity: route.isRerouted ? 2.2 : 1.8,
        transparent: true,
        opacity: 0.99,
        roughness: 0.1,
        metalness: 0.1,
      });
      this.emissiveMaterials.push(tubeMat);

      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      tubeMesh.position.copy(mid);
      tubeMesh.renderOrder = 999;

      // Orient cylinder to point from p1 to p2
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, direction);
      tubeMesh.quaternion.copy(quat);

      this.group.add(tubeMesh);
      this.tubeMeshes.push(tubeMesh);

      // Under-glow (wider, translucent)
      const glowGeo = new THREE.CylinderGeometry(TUBE_RADIUS * 2.4, TUBE_RADIUS * 2.4, length, 8, 1, true);
      const glowMat = new THREE.MeshBasicMaterial({
        color: this.routeColor,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
        depthTest: false,
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.position.copy(mid);
      glowMesh.position.y += Y_OFFSET;
      glowMesh.quaternion.copy(quat);
      glowMesh.renderOrder = 998;
      this.group.add(glowMesh);
    }

    // ── Joint spheres at each graph node (smooth turn transitions) ──
    const jointGeo = new THREE.SphereGeometry(JOINT_RADIUS, 12, 12);
    const jointMat = new THREE.MeshStandardMaterial({
      color: this.routeColor,
      emissive: this.routeColor,
      emissiveIntensity: route.isRerouted ? 2.2 : 1.8,
      transparent: true,
      opacity: 0.99,
      roughness: 0.1,
      metalness: 0.1,
    });

    for (const pt of this.pathPoints) {
      const joint = new THREE.Mesh(jointGeo, jointMat);
      joint.position.copy(pt);
      joint.renderOrder = 1000;
      this.group.add(joint);
    }

    // ── Flowing direction particles along the path ──
    const pGeo = new THREE.BufferGeometry();
    for (let i = 0; i < this.particleCount; i++) {
      this.particleProgress[i] = i / this.particleCount;
      const pt = this.getPointAlongPath(this.particleProgress[i]);
      this.particlePositions[i * 3] = pt.x;
      this.particlePositions[i * 3 + 1] = pt.y + 0.12;
      this.particlePositions[i * 3 + 2] = pt.z;
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(this.particlePositions, 3));

    const pMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.32,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });

    this.pulseParticles = new THREE.Points(pGeo, pMat);
    this.pulseParticles.renderOrder = 1000;
    this.group.add(this.pulseParticles);
  }

  /**
   * Get a point at normalized distance [0,1] along the polyline path.
   * Unlike CatmullRom, this walks along straight segments.
   */
  private getPointAlongPath(t: number): THREE.Vector3 {
    if (this.pathPoints.length < 2) return this.pathPoints[0]?.clone() || new THREE.Vector3();
    const targetDist = t * this.totalLength;
    let accumulated = 0;

    for (let i = 0; i < this.segmentLengths.length; i++) {
      const segLen = this.segmentLengths[i];
      if (accumulated + segLen >= targetDist) {
        const segT = segLen > 0.001 ? (targetDist - accumulated) / segLen : 0;
        return new THREE.Vector3().lerpVectors(this.pathPoints[i], this.pathPoints[i + 1], segT);
      }
      accumulated += segLen;
    }

    return this.pathPoints[this.pathPoints.length - 1].clone();
  }

  public update(delta: number, elapsed: number) {
    if (!this.pulseParticles || this.totalLength < 0.01) return;

    const geo = this.pulseParticles.geometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const count = posAttr.count;

    for (let i = 0; i < count; i++) {
      const speed = 0.45;
      this.particleProgress[i] = (this.particleProgress[i] + delta * speed) % 1.0;
      const pt = this.getPointAlongPath(this.particleProgress[i]);
      posAttr.setXYZ(i, pt.x, pt.y, pt.z);
    }
    posAttr.needsUpdate = true;

    // Pulse emissive intensity
    for (const mat of this.emissiveMaterials) {
      mat.emissiveIntensity = 1.6 + Math.sin(elapsed * 4.5) * 0.5;
    }
  }

  public destroy() {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else if (obj.material) {
          obj.material.dispose();
        }
      }
    });
  }
}
