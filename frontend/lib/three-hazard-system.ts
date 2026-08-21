import * as THREE from "three";
import type { Hazard } from "./schema";
import { toWorldCoords, Building3DConfig, DEFAULT_3D_CONFIG } from "./three-building-generator";

/**
 * Procedural Billboarded Fire Emoji 🔥 Generator
 */
let cachedFireEmojiTexture: THREE.CanvasTexture | null = null;

function getFireEmojiTexture(): THREE.CanvasTexture {
  if (typeof document === "undefined") return new THREE.CanvasTexture(null as unknown as HTMLCanvasElement);
  if (cachedFireEmojiTexture) return cachedFireEmojiTexture;

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    // Red/Orange glowing backdrop aura for maximum top-down & perspective visibility
    const radGrad = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
    radGrad.addColorStop(0, "rgba(239, 68, 68, 0.45)");
    radGrad.addColorStop(0.5, "rgba(249, 115, 22, 0.25)");
    radGrad.addColorStop(1, "rgba(239, 68, 68, 0)");
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, 256, 256);

    ctx.font = "bold 150px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🔥", 128, 128);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  cachedFireEmojiTexture = texture;
  return texture;
}

export class HazardVisual3D {
  public group: THREE.Group;
  private pointLight: THREE.PointLight;
  private dangerRingMesh: THREE.Mesh;
  private dangerCircleMesh: THREE.Mesh;
  private emojiSprite: THREE.Sprite;
  private radius: number;

  constructor(
    public hazard: Hazard,
    config: Building3DConfig = DEFAULT_3D_CONFIG
  ) {
    this.group = new THREE.Group();
    this.group.name = `hazard-3d-${hazard.id}`;
    this.group.userData = { type: "hazard", id: hazard.id, hazardType: hazard.type, severity: hazard.severity };

    const pos = toWorldCoords(hazard.position, config);
    const floorLevel = (hazard as any).floorLevel || 1;
    const yPos = (floorLevel - 1) * 3.5;
    this.group.position.set(pos.x, yPos, pos.z);

    this.radius = hazard.severity === "high" ? 4.8 : hazard.severity === "medium" ? 3.5 : 2.4;

    // 1. Soft Red Hazard Ambient Light Source
    this.pointLight = new THREE.PointLight(0xef4444, 6.0, this.radius * 2.5, 0.9);
    this.pointLight.position.set(0, 1.4, 0);
    this.group.add(this.pointLight);

    // 2. Light Translucent Red Circular Danger Zone Fill on Floor Surface
    const dangerCircleGeo = new THREE.CircleGeometry(this.radius, 48);
    dangerCircleGeo.rotateX(-Math.PI / 2);
    const dangerCircleMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    });
    this.dangerCircleMesh = new THREE.Mesh(dangerCircleGeo, dangerCircleMat);
    this.dangerCircleMesh.position.y = 0.05;
    this.dangerCircleMesh.renderOrder = 997;
    this.group.add(this.dangerCircleMesh);

    // 3. Pulsing Red Perimeter Danger Ring
    const dangerRingGeo = new THREE.RingGeometry(this.radius * 0.94, this.radius, 48);
    dangerRingGeo.rotateX(-Math.PI / 2);
    const dangerRingMat = new THREE.MeshBasicMaterial({
      color: 0xdc2626,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      depthTest: false,
    });
    this.dangerRingMesh = new THREE.Mesh(dangerRingGeo, dangerRingMat);
    this.dangerRingMesh.position.y = 0.06;
    this.dangerRingMesh.renderOrder = 997;
    this.group.add(this.dangerRingMesh);

    // 4. Clearly Visible 🔥 Fire Emoji Billboard Sprite (Large & Red-Orange Glowing)
    const fireTex = getFireEmojiTexture();
    const spriteMat = new THREE.SpriteMaterial({
      map: fireTex,
      transparent: true,
      depthTest: false,
    });
    this.emojiSprite = new THREE.Sprite(spriteMat);
    this.emojiSprite.scale.set(3.4, 3.4, 1);
    this.emojiSprite.position.set(0, 2.0, 0);
    this.emojiSprite.renderOrder = 1001;
    this.group.add(this.emojiSprite);
  }

  public update(delta: number, elapsed: number) {
    // Gentle pulse animation for the danger perimeter ring
    const pulse = 1.0 + Math.sin(elapsed * 4) * 0.05;
    this.dangerRingMesh.scale.set(pulse, pulse, pulse);

    // Gentle float bounce animation for the 🔥 Fire Emoji sprite
    this.emojiSprite.position.y = 2.0 + Math.sin(elapsed * 3) * 0.15;
  }

  public destroy() {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
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
