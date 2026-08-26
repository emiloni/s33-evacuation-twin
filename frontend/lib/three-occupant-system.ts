import * as THREE from "three";
import type { Occupant, Point } from "./schema";
import { toWorldCoords, Building3DConfig, DEFAULT_3D_CONFIG } from "./three-building-generator";

export const PROFILE_COLORS: Record<string, { outfit: number; skin: number; accent: number }> = {
  normal: { outfit: 0x2563eb, skin: 0xf5d0c5, accent: 0x1d4ed8 },
  wheelchair: { outfit: 0x0284c7, skin: 0xf3c5b5, accent: 0x0369a1 },
  child: { outfit: 0xdb2777, skin: 0xfcd3bd, accent: 0xbe185d },
  elderly: { outfit: 0x7c3aed, skin: 0xe6bfae, accent: 0x6d28d9 },
  temporary_injury: { outfit: 0xd97706, skin: 0xf5cbb7, accent: 0xb45309 },
  first_responder: { outfit: 0xef4444, skin: 0xf5d0c5, accent: 0x10b981 },
};

export class OccupantVisual3D {
  public group: THREE.Group;
  private selectionRing: THREE.Mesh;
  private shadowMesh: THREE.Mesh;
  private initialPosition: THREE.Vector3;
  private targetPosition: THREE.Vector3;
  private currentPosition: THREE.Vector3;
  private isSelected = false;
  private isHovered = false;
  private avatarMesh: THREE.Group;
  private leftLeg: THREE.Group | null = null;
  private rightLeg: THREE.Group | null = null;
  private leftArm: THREE.Group | null = null;
  private rightArm: THREE.Group | null = null;
  private badgeSprite: THREE.Sprite | null = null;
  private timeOffset = Math.random() * 10;

  // Evacuation Spline Path Navigation
  private evacuationCurve: THREE.CatmullRomCurve3 | null = null;
  private evacuationProgress = 0;
  private isEvacuating = false;
  private evacuationSpeed = 4.2; // World units per second

  constructor(
    public occupant: Occupant,
    config: Building3DConfig = DEFAULT_3D_CONFIG
  ) {
    this.group = new THREE.Group();
    this.group.name = `occupant-3d-${occupant.id}`;
    this.group.userData = {
      type: "occupant",
      id: occupant.id,
      profile: occupant.profile,
      roomId: occupant.roomId,
    };

    const pos = toWorldCoords(occupant.position, config);
    const floorLevel = (occupant as any).floorLevel || 1;
    const yPos = (floorLevel - 1) * 3.5;
    this.initialPosition = new THREE.Vector3(pos.x, yPos, pos.z);
    this.currentPosition = this.initialPosition.clone();
    this.targetPosition = this.initialPosition.clone();
    this.group.position.copy(this.currentPosition);

    const colors = PROFILE_COLORS[occupant.profile] || PROFILE_COLORS.normal;

    // 1. Soft Realistic Contact Shadow on Floor
    const shadowGeo = new THREE.PlaneGeometry(0.8, 0.8);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.28,
    });
    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.position.y = 0.01;
    this.group.add(this.shadowMesh);

    // 2. High-Tech Tactical Status Ring
    const ringGeo = new THREE.RingGeometry(0.42, 0.52, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: colors.accent,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    });
    this.selectionRing = new THREE.Mesh(ringGeo, ringMat);
    this.selectionRing.position.y = 0.02;
    this.group.add(this.selectionRing);

    // 3. Realistic 3D Human Figure
    this.avatarMesh = this.buildHumanFigure(occupant.profile, colors);
    this.group.add(this.avatarMesh);

    // 4. Floating Identity & Mobility Tag
    this.badgeSprite = this.createBadgeSprite(occupant);
    if (this.badgeSprite) {
      this.badgeSprite.position.set(0, 2.15, 0);
      this.group.add(this.badgeSprite);
    }
  }

  /**
   * Builds realistic anatomical human figure
   */
  private buildHumanFigure(
    profile: Occupant["profile"],
    colors: { outfit: number; skin: number; accent: number }
  ): THREE.Group {
    const avatar = new THREE.Group();

    // Shared Materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: colors.skin,
      roughness: 0.65,
      metalness: 0.05,
    });

    const clothMat = new THREE.MeshStandardMaterial({
      color: colors.outfit,
      roughness: 0.7,
      metalness: 0.1,
    });

    const pantsMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
      metalness: 0.1,
    });

    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.5,
      metalness: 0.2,
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: profile === "elderly" ? 0xe2e8f0 : 0x1e293b,
      roughness: 0.9,
    });

    if (profile === "wheelchair") {
      // ===== REALISTIC WHEELCHAIR USER =====
      const chairGroup = new THREE.Group();

      const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
      const chromeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });

      // Dual Big Wheels
      const wheelGeo = new THREE.TorusGeometry(0.38, 0.035, 12, 32);
      const leftWheel = new THREE.Mesh(wheelGeo, chromeMat);
      leftWheel.rotation.y = Math.PI / 2;
      leftWheel.position.set(-0.32, 0.38, 0);
      chairGroup.add(leftWheel);

      const rightWheel = new THREE.Mesh(wheelGeo, chromeMat);
      rightWheel.rotation.y = Math.PI / 2;
      rightWheel.position.set(0.32, 0.38, 0);
      chairGroup.add(rightWheel);

      // Seat & Cushion
      const seatGeo = new THREE.BoxGeometry(0.52, 0.08, 0.48);
      const seat = new THREE.Mesh(seatGeo, clothMat);
      seat.position.set(0, 0.42, 0.02);
      chairGroup.add(seat);

      // Backrest
      const backGeo = new THREE.BoxGeometry(0.5, 0.48, 0.06);
      const back = new THREE.Mesh(backGeo, clothMat);
      back.position.set(0, 0.72, -0.22);
      chairGroup.add(back);

      // Footrest
      const footrestGeo = new THREE.BoxGeometry(0.44, 0.04, 0.22);
      const footrest = new THREE.Mesh(footrestGeo, frameMat);
      footrest.position.set(0, 0.14, 0.28);
      chairGroup.add(footrest);

      // Seated Torso
      const torsoGeo = new THREE.BoxGeometry(0.38, 0.52, 0.24);
      const torso = new THREE.Mesh(torsoGeo, clothMat);
      torso.position.set(0, 0.74, -0.05);
      chairGroup.add(torso);

      // Head & Hair
      const headGeo = new THREE.SphereGeometry(0.15, 24, 24);
      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.set(0, 1.15, -0.05);
      chairGroup.add(head);

      const hairGeo = new THREE.SphereGeometry(0.155, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.set(0, 1.16, -0.05);
      chairGroup.add(hair);

      // Seated Legs
      const thighsGeo = new THREE.BoxGeometry(0.34, 0.16, 0.38);
      const thighs = new THREE.Mesh(thighsGeo, pantsMat);
      thighs.position.set(0, 0.48, 0.16);
      chairGroup.add(thighs);

      const shinsGeo = new THREE.BoxGeometry(0.34, 0.32, 0.16);
      const shins = new THREE.Mesh(shinsGeo, pantsMat);
      shins.position.set(0, 0.28, 0.3);
      chairGroup.add(shins);

      // Hands on Lap
      const armGeo = new THREE.BoxGeometry(0.09, 0.32, 0.09);
      const leftArm = new THREE.Mesh(armGeo, clothMat);
      leftArm.position.set(-0.24, 0.62, 0.05);
      leftArm.rotation.x = 0.4;
      chairGroup.add(leftArm);

      const rightArm = new THREE.Mesh(armGeo, clothMat);
      rightArm.position.set(0.24, 0.62, 0.05);
      rightArm.rotation.x = 0.4;
      chairGroup.add(rightArm);

      avatar.add(chairGroup);
      return avatar;
    }

    // ===== STANDING / WALKING NATURAL HUMAN FIGURE =====
    const scale = profile === "child" ? 0.72 : 1.0;
    avatar.scale.set(scale, scale, scale);

    // 1. Torso & Upper Body
    const chestGeo = new THREE.BoxGeometry(0.38, 0.48, 0.22);
    const chest = new THREE.Mesh(chestGeo, clothMat);
    chest.position.set(0, 1.05, 0);
    chest.castShadow = true;
    avatar.add(chest);

    // 2. Neck & Head
    const neckGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.1, 16);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.set(0, 1.32, 0);
    avatar.add(neck);

    const headGeo = new THREE.SphereGeometry(0.14, 24, 24);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, 1.45, 0);
    head.castShadow = true;
    avatar.add(head);

    let hair: THREE.Mesh | null = null;

    if (profile === "first_responder") {
      // Tactical White Safety Helmet with Emergency Red Cross Emblem
      const helmetGeo = new THREE.SphereGeometry(0.165, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.6);
      const helmetMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.3 });
      const helmet = new THREE.Mesh(helmetGeo, helmetMat);
      helmet.position.set(0, 1.48, 0);
      avatar.add(helmet);

      // Red Cross Badge on Helmet Front
      const crossHorizGeo = new THREE.BoxGeometry(0.08, 0.025, 0.02);
      const crossVertGeo = new THREE.BoxGeometry(0.025, 0.08, 0.02);
      const redMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const c1 = new THREE.Mesh(crossHorizGeo, redMat);
      c1.position.set(0, 1.54, 0.16);
      avatar.add(c1);
      const c2 = new THREE.Mesh(crossVertGeo, redMat);
      c2.position.set(0, 1.54, 0.16);
      avatar.add(c2);
    } else {
      // Hair Cap
      const hairGeo = new THREE.SphereGeometry(0.146, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
      hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.set(0, 1.46, 0);
      avatar.add(hair);
    }

    // 3. Arms
    const armGeo = new THREE.BoxGeometry(0.1, 0.42, 0.1);

    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.25, 1.25, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, clothMat);
    leftArmMesh.position.set(0, -0.18, 0);
    leftArmGroup.add(leftArmMesh);

    const handGeo = new THREE.SphereGeometry(0.05, 12, 12);
    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.set(0, -0.4, 0);
    leftArmGroup.add(leftHand);
    avatar.add(leftArmGroup);
    this.leftArm = leftArmGroup;

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.25, 1.25, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, clothMat);
    rightArmMesh.position.set(0, -0.18, 0);
    rightArmGroup.add(rightArmMesh);

    const rightHand = new THREE.Mesh(handGeo, skinMat);
    rightHand.position.set(0, -0.4, 0);
    rightArmGroup.add(rightHand);
    avatar.add(rightArmGroup);
    this.rightArm = rightArmGroup;

    // 4. Pelvis & Legs
    const pelvisGeo = new THREE.BoxGeometry(0.34, 0.14, 0.2);
    const pelvis = new THREE.Mesh(pelvisGeo, pantsMat);
    pelvis.position.set(0, 0.76, 0);
    avatar.add(pelvis);

    const legGeo = new THREE.BoxGeometry(0.13, 0.65, 0.14);
    const shoeGeo = new THREE.BoxGeometry(0.14, 0.08, 0.22);

    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.11, 0.7, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, pantsMat);
    leftLegMesh.position.set(0, -0.32, 0);
    leftLegGroup.add(leftLegMesh);

    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(0, -0.66, 0.04);
    leftLegGroup.add(leftShoe);
    avatar.add(leftLegGroup);
    this.leftLeg = leftLegGroup;

    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.11, 0.7, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, pantsMat);
    rightLegMesh.position.set(0, -0.32, 0);
    rightLegGroup.add(rightLegMesh);

    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoe.position.set(0, -0.66, 0.04);
    rightLegGroup.add(rightShoe);
    avatar.add(rightLegGroup);
    this.rightLeg = rightLegGroup;

    // 5. Special Accessories
    if (profile === "elderly") {
      chest.rotation.x = 0.12;
      head.position.z += 0.06;
      if (hair) hair.position.z += 0.06;

      const caneGroup = new THREE.Group();
      const caneWoodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.4 });
      const shaftGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.95, 12);
      const shaft = new THREE.Mesh(shaftGeo, caneWoodMat);
      shaft.position.set(0.28, 0.46, 0.22);
      shaft.rotation.x = 0.1;
      caneGroup.add(shaft);

      const handleGeo = new THREE.TorusGeometry(0.06, 0.02, 8, 16, Math.PI);
      const handle = new THREE.Mesh(handleGeo, caneWoodMat);
      handle.position.set(0.28, 0.93, 0.18);
      handle.rotation.y = Math.PI / 2;
      caneGroup.add(handle);

      avatar.add(caneGroup);
    } else if (profile === "temporary_injury") {
      const crutchMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });
      const crutchShaftGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.15, 12);
      const crutchShaft = new THREE.Mesh(crutchShaftGeo, crutchMat);
      crutchShaft.position.set(-0.28, 0.58, 0.08);
      avatar.add(crutchShaft);

      const cuffGeo = new THREE.TorusGeometry(0.07, 0.02, 8, 16, Math.PI);
      const cuff = new THREE.Mesh(cuffGeo, crutchMat);
      cuff.position.set(-0.28, 1.05, 0.08);
      avatar.add(cuff);

      const castGeo = new THREE.BoxGeometry(0.16, 0.38, 0.18);
      const castMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
      const castMesh = new THREE.Mesh(castGeo, castMat);
      castMesh.position.set(0, -0.45, 0);
      leftLegGroup.add(castMesh);
    }

    return avatar;
  }

  /**
   * Creates a billboard badge showing the occupant's status
   */
  private createBadgeSprite(occupant: Occupant): THREE.Sprite | null {
    if (typeof document === "undefined") return null;

    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 80;
    const ctx = canvas.getContext("2d");

    if (!ctx) return null;

    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 3;
    
    const r = 18;
    ctx.beginPath();
    ctx.roundRect(8, 8, 240, 64, r);
    ctx.fill();
    ctx.stroke();

    let icon = "👤";
    if (occupant.profile === "wheelchair") icon = "♿";
    if (occupant.profile === "elderly") icon = "👴";
    if (occupant.profile === "child") icon = "👶";
    if (occupant.profile === "temporary_injury") icon = "🩹";
    if (occupant.profile === "first_responder") icon = "🚨";

    ctx.font = "bold 28px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = occupant.profile === "first_responder" ? "#10B981" : "#ffffff";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const labelText = occupant.profile === "first_responder" ? "RESCUE UNIT" : occupant.id.toUpperCase();
    ctx.fillText(`${icon} ${labelText}`, 18, 40);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });

    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.4, 0.44, 1);
    return sprite;
  }

  private laneOffset = 0;
  private startDelay = 0;
  private hasBeenRescued = false;

  /**
   * Starts physical evacuation along the calculated 3D spline route with anti-overlapping lane offsets
   */
  public startEvacuation(path: Point[], config: Building3DConfig, index = 0) {
    if (!path || path.length < 2) return;

    const points3D = path.map((p) => {
      const v = toWorldCoords(p, config);
      const level = (p as any).level || 1;
      const yLevel = (level - 1) * 3.5;
      return new THREE.Vector3(v.x, yLevel, v.z);
    });

    this.evacuationCurve = new THREE.CatmullRomCurve3(points3D, false, "centripetal", 0.2);

    // Stagger start times so occupants queue single-file without overlapping
    this.startDelay = index * 0.08;
    this.evacuationProgress = -this.startDelay;

    // Perpendicular lane offset (-0.35, 0, or +0.35 world units) to prevent corridor overlapping
    this.laneOffset = ((index % 3) - 1) * 0.35;
    this.isEvacuating = true;

    // Natural, swift evacuation running speeds
    if (this.occupant.profile === "wheelchair") this.evacuationSpeed = 18.0;
    else if (this.occupant.profile === "child") this.evacuationSpeed = 16.0;
    else if (this.occupant.profile === "elderly") this.evacuationSpeed = 14.0;
    else if (this.occupant.profile === "temporary_injury") this.evacuationSpeed = 12.0;
    else if (this.occupant.profile === "first_responder") this.evacuationSpeed = 24.0;
    else this.evacuationSpeed = 22.0; // Normal adult brisk run
  }

  /**
   * Resets occupant to initial starting position when simulation stops
   */
  public updateOccupantData(occupant: Occupant, config: Building3DConfig) {
    this.occupant = occupant;
    const pos = toWorldCoords(occupant.position, config);
    const floorLevel = (occupant as any).floorLevel || 1;
    const yPos = (floorLevel - 1) * 3.5;
    this.initialPosition.set(pos.x, yPos, pos.z);
    if (!this.isEvacuating) {
      this.group.position.copy(this.initialPosition);
    }
  }

  public stopEvacuation() {
    this.isEvacuating = false;
    this.evacuationCurve = null;
    this.evacuationProgress = 0;
    this.hasBeenRescued = false;
    this.group.scale.set(1, 1, 1);
    this.group.position.copy(this.initialPosition);
    this.group.rotation.set(0, 0, 0);
  }

  public setSelected(selected: boolean) {
    this.isSelected = selected;
    const mat = this.selectionRing.material as THREE.MeshBasicMaterial;
    mat.opacity = selected ? 0.95 : this.isHovered ? 0.75 : 0.65;
    this.selectionRing.scale.set(
      selected ? 1.35 : 1.0,
      selected ? 1.35 : 1.0,
      selected ? 1.35 : 1.0
    );
  }

  public setHovered(hovered: boolean) {
    this.isHovered = hovered;
    const mat = this.selectionRing.material as THREE.MeshBasicMaterial;
    mat.opacity = this.isSelected ? 0.95 : hovered ? 0.75 : 0.65;
  }

  public update(delta: number, elapsed: number) {
    // ── EVACUATION LOCOMOTION ──
    if (this.isEvacuating && this.evacuationCurve) {
      this.evacuationProgress += delta * this.evacuationSpeed;

      const totalLength = this.evacuationCurve.getLength();
      const normalizedProgress = Math.min(this.evacuationProgress / totalLength, 1.0);

      if (normalizedProgress >= 1.0) {
        // Reached exit — hide the occupant
        this.group.visible = false;
        return;
      }

      const point = this.evacuationCurve.getPointAt(normalizedProgress);
      const tangent = this.evacuationCurve.getTangentAt(normalizedProgress);

      // Apply lane offset perpendicular to movement direction
      const lateral = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const offset = lateral.multiplyScalar(this.laneOffset);

      this.group.position.set(point.x + offset.x, point.y, point.z + offset.z);

      // Face movement direction
      this.group.rotation.y = Math.atan2(tangent.x, tangent.z);

      // ── RUNNING ANIMATION ──
      const runCycle = Math.sin(elapsed * 12 + this.timeOffset) * 0.5;
      if (this.leftLeg && this.rightLeg) {
        this.leftLeg.rotation.x = runCycle * 0.7;
        this.rightLeg.rotation.x = -runCycle * 0.7;
      }
      if (this.leftArm && this.rightArm) {
        this.leftArm.rotation.x = -runCycle * 0.5;
        this.rightArm.rotation.x = runCycle * 0.5;
      }
      this.avatarMesh.position.y = Math.abs(runCycle) * 0.04;

      return;
    }

    // ── IDLE STATE ──
    this.group.position.copy(this.initialPosition);
    this.group.visible = true;

    // Gentle realistic idle stance
    const breath = Math.sin((elapsed + this.timeOffset) * 2.5) * 0.02;
    this.avatarMesh.position.y = breath;

    if (this.leftLeg && this.rightLeg) {
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
    }
    if (this.leftArm && this.rightArm) {
      this.leftArm.rotation.x = 0;
      this.rightArm.rotation.x = 0;
    }

    if (this.isSelected) {
      const pulse = 1.0 + Math.sin(elapsed * 5) * 0.08;
      this.selectionRing.scale.set(pulse * 1.3, pulse * 1.3, pulse * 1.3);
    } else {
      this.selectionRing.scale.set(1.2, 1.2, 1.2);
    }
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
