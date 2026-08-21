import * as THREE from "three";
import type { RouteSegment } from "./schema";
import { toWorldCoords, Building3DConfig, DEFAULT_3D_CONFIG } from "./three-building-generator";

export class RouteVisual3D {
  public group: THREE.Group;
  private curve: THREE.CatmullRomCurve3 | null = null;
  private tubeMesh: THREE.Mesh | null = null;
  private pulseParticles: THREE.Points | null = null;
  private particleCount = 22;
  private particleProgress: Float32Array;
  private particlePositions: Float32Array;
  private routeColor: number;

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

    // Dark, High-Contrast Saturated Colors for Top-Down & 3D Perspective Visibility
    this.routeColor = route.isRerouted
      ? 0x047857 // DARK HIGH-CONTRAST EMERALD GREEN (Safest Route)
      : route.confidence === "low"
      ? 0xdc2626 // RED: hazard vector
      : 0x1d4ed8; // DARK HIGH-CONTRAST ROYAL BLUE (Normal / Standby Route)

    this.particleProgress = new Float32Array(this.particleCount);
    this.particlePositions = new Float32Array(this.particleCount * 3);

    this.buildRouteGeometry(route, config);
  }

  private buildRouteGeometry(route: RouteSegment, config: Building3DConfig) {
    if (!route.path || route.path.length < 2) return;

    // Convert waypoints to 3D curve points elevated at exact physical floor height y = (level - 1) * 3.5 + 0.18
    const rawPoints: THREE.Vector3[] = route.path.map((p) => {
      const w = toWorldCoords(p, config);
      const level = (p as any).level || (route as any).floorLevel || 1;
      const yLevel = (level - 1) * 3.5 + 0.18;
      return new THREE.Vector3(w.x, yLevel, w.z);
    });

    // Subdivide sharp 90° corner points with corner anchors so CatmullRom splines never overshoot wall boundaries
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < rawPoints.length; i++) {
      points.push(rawPoints[i]);
      if (i > 0 && i < rawPoints.length - 1) {
        const prev = rawPoints[i - 1];
        const curr = rawPoints[i];
        const next = rawPoints[i + 1];

        const dirIn = new THREE.Vector3().subVectors(curr, prev);
        const dirOut = new THREE.Vector3().subVectors(next, curr);
        const lenIn = dirIn.length();
        const lenOut = dirOut.length();

        if (lenIn > 0.01 && lenOut > 0.01) {
          dirIn.normalize();
          dirOut.normalize();
          const dot = dirIn.dot(dirOut);

          if (dot < 0.95) {
            const anchorDist = Math.min(0.35, lenOut * 0.25);
            if (anchorDist > 0.05) {
              const anchor = curr.clone().addScaledVector(dirOut, anchorDist);
              points.push(anchor);
            }
          }
        }
      }
    }

    // Spline Curve with tight centripetal tension to prevent wall overshooting
    this.curve = new THREE.CatmullRomCurve3(points, false, "centripetal", 0.1);

    // 1. Primary Glowing 3D Tube Ribbon (Thick, highly visible 3D tube geometry)
    const tubeGeo = new THREE.TubeGeometry(this.curve, 64, 0.22, 10, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: this.routeColor,
      emissive: this.routeColor,
      emissiveIntensity: route.isRerouted ? 2.2 : 1.8,
      transparent: true,
      opacity: 0.99,
      roughness: 0.1,
      metalness: 0.1,
    });
    this.tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    this.tubeMesh.renderOrder = 999;
    this.group.add(this.tubeMesh);

    // 2. Wide High-Contrast Under-Glow Ribbon (prevents Z-fighting & boosts top-down contrast)
    const wideTubeGeo = new THREE.TubeGeometry(this.curve, 64, 0.44, 8, false);
    const wideTubeMat = new THREE.MeshBasicMaterial({
      color: this.routeColor,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      depthTest: false,
    });
    const wideTube = new THREE.Mesh(wideTubeGeo, wideTubeMat);
    wideTube.position.y = -0.04;
    wideTube.renderOrder = 998;
    this.group.add(wideTube);

    // 3. Flowing Directional White Arrow Pulse Particles
    const pGeo = new THREE.BufferGeometry();
    for (let i = 0; i < this.particleCount; i++) {
      this.particleProgress[i] = i / this.particleCount;
      const pt = this.curve.getPointAt(this.particleProgress[i]);
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

  public update(delta: number, elapsed: number) {
    if (!this.curve || !this.pulseParticles) return;

    const geo = this.pulseParticles.geometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const count = posAttr.count;

    for (let i = 0; i < count; i++) {
      const speed = 0.45;
      this.particleProgress[i] = (this.particleProgress[i] + delta * speed) % 1.0;
      const pt = this.curve.getPointAt(this.particleProgress[i]);
      posAttr.setXYZ(i, pt.x, pt.y, pt.z);
    }
    posAttr.needsUpdate = true;

    if (this.tubeMesh) {
      const mat = this.tubeMesh.material as THREE.MeshStandardMaterial;
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
