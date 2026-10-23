/**
 * Unified Character Setup Script & PBR Shader Pipeline Manager
 *
 * Supports 4 Game Entities:
 *  1. Knight (Heavy plate armor, steel metalness 0.85, roughness 0.25, micro-scratch normal maps, Sword & Shield)
 *  2. Mage (Mystical fabric roughness 0.7, pulsating rune glow maps, floating arcane crystal, Archmage Staff)
 *  3. Assassin (Dark matte pebbled leather roughness 0.5, subtle specularity, Dual Daggers & Composite Bow switching)
 *  4. Village NPC (Matte rustic cloth roughness 0.88 with diffuse weave & AO crevice maps, Handheld Brass Lantern)
 *
 * Features:
 *  - Shared PBR Shader Pipeline with custom Fresnel rim-lighting, global ambient adjustment, and real-time shadows
 *  - Procedural Canvas PBR Texture Generators (Scratch Normal Map, Runes Emissive Map, Leather Texture, Cloth AO Map)
 *  - Modular Bone Socket Rigging System (hand_r, hand_l, back_r, back_l, hip_r, hip_l, head)
 *  - Smooth Weapon Switching & Procedural Animation Rigging (idle, walk, attack, cast)
 */

import * as THREE from 'three';
import { createKnightGLBMesh, getUseCustomKnightGLB } from './assetLoader';

// ============================================================================
// 1. TYPES & DATA CONTRACTS
// ============================================================================

export type EntityType = 'knight' | 'mage' | 'assassin' | 'npc';

export type WeaponSlot =
  | 'hand_r'
  | 'hand_l'
  | 'back_r'
  | 'back_l'
  | 'hip_r'
  | 'hip_l'
  | 'head_socket';

export type AssassinWeaponMode = 'dual_daggers' | 'bow';

export interface CharacterBoneHierarchy {
  root: THREE.Group;
  pelvis: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  armR: THREE.Group;
  forearmR: THREE.Group;
  handR: THREE.Group;
  armL: THREE.Group;
  forearmL: THREE.Group;
  handL: THREE.Group;
  legR: THREE.Group;
  footR: THREE.Group;
  legL: THREE.Group;
  footL: THREE.Group;
  cape?: THREE.Mesh;
}

export interface CharacterSockets {
  hand_r: THREE.Group;
  hand_l: THREE.Group;
  back_r: THREE.Group;
  back_l: THREE.Group;
  hip_r: THREE.Group;
  hip_l: THREE.Group;
  head_socket: THREE.Group;
}

export interface EquipmentItem {
  id: string;
  name: string;
  slot: WeaponSlot;
  mesh: THREE.Group;
  light?: THREE.Light;
}

export interface CharacterSetupOptions {
  position?: THREE.Vector3 | [number, number, number];
  rotationY?: number;
  scale?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  enableRimLight?: boolean;
  rimColor?: THREE.ColorRepresentation;
  rimPower?: number;
  rimIntensity?: number;
  useGLB?: boolean;
}

export interface UnifiedCharacter {
  root: THREE.Group;
  entityType: EntityType;
  bones: CharacterBoneHierarchy;
  sockets: CharacterSockets;
  materials: Record<string, THREE.Material>;
  equipment: Map<string, EquipmentItem>;
  assassinMode?: AssassinWeaponMode;
  animTime: number;
  walkCycle: number;
  isMoving: boolean;
  isAttacking: boolean;
  attackTimer: number;

  // Public API Methods
  equip(item: EquipmentItem, slot?: WeaponSlot): void;
  unequip(slot: WeaponSlot): EquipmentItem | undefined;
  switchAssassinWeaponMode(mode?: AssassinWeaponMode): void;
  setMoving(moving: boolean): void;
  triggerAttack(): void;
  update(delta: number): void;
  dispose(): void;
}

// ============================================================================
// 2. PROCEDURAL PBR TEXTURE GENERATORS
// ============================================================================

/**
 * Generates a seamless procedural tangent-space normal map containing
 * realistic fine scratches, brushed directional micro-grooves, and armor dents.
 */
export function generateArmorScratchNormalMap(width = 512, height = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Flat tangent normal is (128, 128, 255) -> (0, 0, 1) in normalized coords
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, width, height);

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Add subtle surface noise
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 14;
    data[i] = Math.max(0, Math.min(255, 128 + noise));
    data[i + 1] = Math.max(0, Math.min(255, 128 + noise));
    data[i + 2] = 255;
  }

  // Draw sharp metallic scratch lines across multiple random vectors
  const numScratches = 160;
  for (let s = 0; s < numScratches; s++) {
    const x0 = Math.random() * width;
    const y0 = Math.random() * height;
    const angle = Math.random() * Math.PI;
    const length = 12 + Math.random() * 45;
    const x1 = x0 + Math.cos(angle) * length;
    const y1 = y0 + Math.sin(angle) * length;

    // Normal scratch profile: one edge elevated, one edge depressed
    const steps = Math.floor(length * 1.5);
    for (let st = 0; st < steps; st++) {
      const t = st / steps;
      const px = Math.floor(x0 + (x1 - x0) * t);
      const py = Math.floor(y0 + (y1 - y0) * t);

      if (px >= 1 && px < width - 1 && py >= 1 && py < height - 1) {
        const nx = -Math.sin(angle);
        const ny = Math.cos(angle);

        // Scratch groove center
        const idx = (py * width + px) * 4;
        data[idx] = Math.max(0, Math.min(255, 128 + nx * 75));
        data[idx + 1] = Math.max(0, Math.min(255, 128 + ny * 75));
        data[idx + 2] = 210;

        // Bevel highlight edge
        const bpx = Math.floor(px + nx * 1.2);
        const bpy = Math.floor(py + ny * 1.2);
        if (bpx >= 0 && bpx < width && bpy >= 0 && bpy < height) {
          const bIdx = (bpy * width + bpx) * 4;
          data[bIdx] = Math.max(0, Math.min(255, 128 - nx * 50));
          data[bIdx + 1] = Math.max(0, Math.min(255, 128 - ny * 50));
          data[bIdx + 2] = 245;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

/**
 * Generates an emissive glow map featuring celestial and arcane rune glyphs,
 * constellation lines, and border tracery for Mage robes and crystals.
 */
export function generateRobeRunesEmissiveMap(width = 512, height = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Black background (0 emissive)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#c084fc';
  ctx.fillStyle = '#e879f9';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur = 12;

  // Border runic ribbons
  ctx.beginPath();
  ctx.moveTo(20, 20);
  ctx.lineTo(width - 20, 20);
  ctx.moveTo(20, height - 20);
  ctx.lineTo(width - 20, height - 20);
  ctx.stroke();

  // Draw ancient geometric rune shapes
  const runeCenters = [
    [width * 0.25, height * 0.3],
    [width * 0.75, height * 0.3],
    [width * 0.5, height * 0.5],
    [width * 0.25, height * 0.7],
    [width * 0.75, height * 0.7],
  ];

  runeCenters.forEach(([cx, cy], index) => {
    ctx.save();
    ctx.translate(cx, cy);

    // Inner circle
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.stroke();

    // Runic geometry: interlocking triangle or diamond
    ctx.beginPath();
    if (index % 2 === 0) {
      for (let i = 0; i < 3; i++) {
        const rad = (i * 2 * Math.PI) / 3 - Math.PI / 2;
        const rx = Math.cos(rad) * 36;
        const ry = Math.sin(rad) * 36;
        if (i === 0) ctx.moveTo(rx, ry);
        else ctx.lineTo(rx, ry);
      }
      ctx.closePath();
    } else {
      ctx.rect(-20, -20, 40, 40);
    }
    ctx.stroke();

    // Arcane center dot
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Generates dark pebbled leather texture with micro-grain specular variance
 * and fine organic texture for the Assassin's armor.
 */
export function generateLeatherTexture(width = 512, height = 512): {
  diffuse: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
} {
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = width;
  diffCanvas.height = height;
  const dCtx = diffCanvas.getContext('2d')!;

  const normCanvas = document.createElement('canvas');
  normCanvas.width = width;
  normCanvas.height = height;
  const nCtx = normCanvas.getContext('2d')!;

  dCtx.fillStyle = '#18181b';
  dCtx.fillRect(0, 0, width, height);

  nCtx.fillStyle = 'rgb(128, 128, 255)';
  nCtx.fillRect(0, 0, width, height);

  const dImg = dCtx.getImageData(0, 0, width, height);
  const nImg = nCtx.getImageData(0, 0, width, height);

  // Micro-pebble cellular leather grain
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      const pX = (x % 16) - 8;
      const pY = (y % 16) - 8;
      const cellDist = Math.sqrt(pX * pX + pY * pY);
      const grain = Math.sin(cellDist * 0.8) * 12 + (Math.random() - 0.5) * 8;

      // Dark matte leather diffuse
      const baseCol = 24 + grain * 0.4;
      dImg.data[idx] = Math.max(12, Math.min(38, baseCol));
      dImg.data[idx + 1] = Math.max(12, Math.min(42, baseCol * 1.05));
      dImg.data[idx + 2] = Math.max(16, Math.min(48, baseCol * 1.15));

      // Gentle pebbled normal bump
      const bumpX = (pX / 8) * 35;
      const bumpY = (pY / 8) * 35;
      nImg.data[idx] = Math.max(0, Math.min(255, 128 + bumpX));
      nImg.data[idx + 1] = Math.max(0, Math.min(255, 128 + bumpY));
      nImg.data[idx + 2] = 235;
    }
  }

  dCtx.putImageData(dImg, 0, 0);
  nCtx.putImageData(nImg, 0, 0);

  const diffTex = new THREE.CanvasTexture(diffCanvas);
  diffTex.wrapS = THREE.RepeatWrapping;
  diffTex.wrapT = THREE.RepeatWrapping;
  diffTex.repeat.set(4, 4);

  const normTex = new THREE.CanvasTexture(normCanvas);
  normTex.wrapS = THREE.RepeatWrapping;
  normTex.wrapT = THREE.RepeatWrapping;
  normTex.repeat.set(4, 4);

  return { diffuse: diffTex, normal: normTex };
}

/**
 * Generates rustic woven cloth diffuse texture with built-in Ambient Occlusion (AO)
 * shading in creases and folds for Village NPC garments.
 */
export function generateClothAOTexture(width = 512, height = 512): {
  diffuse: THREE.CanvasTexture;
  ao: THREE.CanvasTexture;
} {
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = width;
  diffCanvas.height = height;
  const dCtx = diffCanvas.getContext('2d')!;

  const aoCanvas = document.createElement('canvas');
  aoCanvas.width = width;
  aoCanvas.height = height;
  const aCtx = aoCanvas.getContext('2d')!;

  dCtx.fillStyle = '#854d0e'; // Warm rustic tan
  dCtx.fillRect(0, 0, width, height);

  aCtx.fillStyle = '#ffffff';
  aCtx.fillRect(0, 0, width, height);

  const dImg = dCtx.getImageData(0, 0, width, height);
  const aImg = aCtx.getImageData(0, 0, width, height);

  // Organic cross-weave threads & vertical fold AO shading
  for (let y = 0; y < height; y++) {
    const foldShadow = 0.85 + Math.sin(y * 0.08) * 0.15;

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Cross-stitch weave pattern
      const weave = (x % 4 === 0 || y % 4 === 0 ? 0.88 : 1.05) + (Math.random() - 0.5) * 0.08;
      const combinedShade = weave * foldShadow;

      // Warm earth cloth
      dImg.data[idx] = Math.max(0, Math.min(255, 140 * combinedShade));
      dImg.data[idx + 1] = Math.max(0, Math.min(255, 100 * combinedShade));
      dImg.data[idx + 2] = Math.max(0, Math.min(255, 65 * combinedShade));

      // Ambient Occlusion channel (White = unoccluded, darker in folds)
      const aoVal = Math.floor(Math.max(120, Math.min(255, 255 * foldShadow)));
      aImg.data[idx] = aoVal;
      aImg.data[idx + 1] = aoVal;
      aImg.data[idx + 2] = aoVal;
    }
  }

  dCtx.putImageData(dImg, 0, 0);
  aCtx.putImageData(aImg, 0, 0);

  const diffTex = new THREE.CanvasTexture(diffCanvas);
  diffTex.wrapS = THREE.RepeatWrapping;
  diffTex.wrapT = THREE.RepeatWrapping;
  diffTex.repeat.set(3, 3);

  const aoTex = new THREE.CanvasTexture(aoCanvas);
  aoTex.wrapS = THREE.RepeatWrapping;
  aoTex.wrapT = THREE.RepeatWrapping;

  return { diffuse: diffTex, ao: aoTex };
}

// ============================================================================
// 3. SHARED PBR SHADER PIPELINE & MANAGER
// ============================================================================

/**
 * CharacterShaderManager
 * Enforces visual consistency across all characters with:
 *  - Shared Cook-Torrance / Standard PBR material system
 *  - Dynamic Fresnel rim-lighting (custom GLSL injection)
 *  - Global ambient lighting & directional shadow reception
 *  - Time-based uniform animations (pulsing rune glow, shimmer)
 */
export class CharacterShaderManager {
  private static instance: CharacterShaderManager;

  // Shared shader uniforms
  public uniforms = {
    uTime: { value: 0 },
    uRimColor: { value: new THREE.Color(0x93c5fd) }, // Gentle celestial blue rim highlight
    uRimPower: { value: 2.8 },
    uRimIntensity: { value: 1.15 },
    uAmbientFactor: { value: 0.18 },
  };

  // Cached PBR Textures
  public scratchNormalMap: THREE.CanvasTexture;
  public robeRunesMap: THREE.CanvasTexture;
  public leatherTextures: { diffuse: THREE.CanvasTexture; normal: THREE.CanvasTexture };
  public clothTextures: { diffuse: THREE.CanvasTexture; ao: THREE.CanvasTexture };

  // Material Registry
  private materialRegistry: Map<string, THREE.MeshStandardMaterial> = new Map();

  private constructor() {
    this.scratchNormalMap = generateArmorScratchNormalMap(512, 512);
    this.robeRunesMap = generateRobeRunesEmissiveMap(512, 512);
    this.leatherTextures = generateLeatherTexture(512, 512);
    this.clothTextures = generateClothAOTexture(512, 512);
  }

  public static getInstance(): CharacterShaderManager {
    if (!CharacterShaderManager.instance) {
      CharacterShaderManager.instance = new CharacterShaderManager();
    }
    return CharacterShaderManager.instance;
  }

  /**
   * Applies the shared custom rim-lighting shader logic to any MeshStandardMaterial
   * using Three.js onBeforeCompile without breaking native shadows, lights, or PBR.
   */
  public applySharedRimShader(
    material: THREE.MeshStandardMaterial,
    options?: {
      rimColor?: THREE.ColorRepresentation;
      rimPower?: number;
      rimIntensity?: number;
      pulseRune?: boolean;
    }
  ): THREE.MeshStandardMaterial {
    const customRimColor = options?.rimColor
      ? new THREE.Color(options.rimColor)
      : this.uniforms.uRimColor.value;
    const customRimPower = options?.rimPower ?? this.uniforms.uRimPower.value;
    const customRimIntensity = options?.rimIntensity ?? this.uniforms.uRimIntensity.value;
    const pulseRune = options?.pulseRune ?? false;

    material.onBeforeCompile = (shader) => {
      // Pass shared and instance uniforms
      shader.uniforms.uTime = this.uniforms.uTime;
      shader.uniforms.uRimColor = { value: customRimColor };
      shader.uniforms.uRimPower = { value: customRimPower };
      shader.uniforms.uRimIntensity = { value: customRimIntensity };
      shader.uniforms.uAmbientFactor = this.uniforms.uAmbientFactor;

      // 1. Vertex Shader: Pass world normal and view direction
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `
        #include <common>
        varying vec3 vCustomWorldNormal;
        varying vec3 vCustomViewDir;
        `
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `
        #include <worldpos_vertex>
        vCustomWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        vCustomViewDir = normalize(cameraPosition - (modelMatrix * vec4(transformed, 1.0)).xyz);
        `
      );

      // 2. Fragment Shader: Calculate Fresnel Rim Light & Animated Pulse
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `
        #include <common>
        uniform float uTime;
        uniform vec3 uRimColor;
        uniform float uRimPower;
        uniform float uRimIntensity;
        uniform float uAmbientFactor;
        varying vec3 vCustomWorldNormal;
        varying vec3 vCustomViewDir;
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
        #include <dithering_fragment>

        // Calculate smooth Fresnel rim lighting
        float rimFactor = 1.0 - max(dot(normalize(vCustomViewDir), normalize(vCustomWorldNormal)), 0.0);
        float rimLight = pow(rimFactor, uRimPower) * uRimIntensity;

        ${
          pulseRune
            ? `
        // Pulsate magical emissive rune highlights with time
        float runePulse = 0.85 + 0.35 * sin(uTime * 3.2);
        gl_FragColor.rgb *= runePulse;
        `
            : ''
        }

        // Blend rim highlight into outgoing PBR fragment color
        gl_FragColor.rgb += uRimColor * rimLight * 0.45;
        `
      );
    };

    material.needsUpdate = true;
    return material;
  }

  // --------------------------------------------------------------------------
  // ENTITY MATERIAL FACTORIES
  // --------------------------------------------------------------------------

  /**
   * Knight Material Set:
   *  - Polished steel: metalness 0.85, roughness 0.25, normal maps for armor scratches
   *  - Royal gold accents: metalness 0.90, roughness 0.20
   */
  public getKnightMaterials(): {
    plateArmor: THREE.MeshStandardMaterial;
    goldTrim: THREE.MeshStandardMaterial;
    chainmail: THREE.MeshStandardMaterial;
    cape: THREE.MeshStandardMaterial;
    leatherStrap: THREE.MeshStandardMaterial;
  } {
    const plateArmor = new THREE.MeshStandardMaterial({
      color: 0xd1d5db, // Brilliant tempered steel
      metalness: 0.85,
      roughness: 0.25,
      normalMap: this.scratchNormalMap,
      normalScale: new THREE.Vector2(0.35, 0.35),
    });
    this.applySharedRimShader(plateArmor, {
      rimColor: 0x93c5fd, // Cool steel rim
      rimPower: 2.8,
      rimIntensity: 1.25,
    });

    const goldTrim = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.2,
    });
    this.applySharedRimShader(goldTrim, { rimColor: 0xfef08a, rimIntensity: 1.4 });

    const chainmail = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.75,
      roughness: 0.4,
    });

    const cape = new THREE.MeshStandardMaterial({
      color: 0xb91c1c, // Imperial crimson
      roughness: 0.75,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    this.applySharedRimShader(cape, { rimColor: 0xfca5a5, rimIntensity: 0.9 });

    const leatherStrap = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.6,
      metalness: 0.1,
    });

    return { plateArmor, goldTrim, chainmail, cape, leatherStrap };
  }

  /**
   * Mage Material Set:
   *  - Fabric robe: roughness 0.70, metalness 0.05
   *  - Robe runes: emissive glow maps, pulsating arcane energy
   *  - Staff crystal: high refraction, roughness 0.08, intense cyan glow
   */
  public getMageMaterials(): {
    robeFabric: THREE.MeshStandardMaterial;
    robeRunes: THREE.MeshStandardMaterial;
    staffWood: THREE.MeshStandardMaterial;
    staffCrystal: THREE.MeshStandardMaterial;
    goldOrnaments: THREE.MeshStandardMaterial;
  } {
    const robeFabric = new THREE.MeshStandardMaterial({
      color: 0x312e81, // Deep cosmic indigo
      roughness: 0.7,
      metalness: 0.05,
    });
    this.applySharedRimShader(robeFabric, {
      rimColor: 0xa855f7, // Arcane violet rim
      rimPower: 2.5,
      rimIntensity: 1.3,
    });

    const robeRunes = new THREE.MeshStandardMaterial({
      color: 0x4f46e5,
      roughness: 0.7,
      metalness: 0.05,
      emissive: new THREE.Color(0x9333ea),
      emissiveIntensity: 1.6,
      emissiveMap: this.robeRunesMap,
    });
    this.applySharedRimShader(robeRunes, {
      rimColor: 0xd8b4fe,
      rimIntensity: 1.5,
      pulseRune: true,
    });

    const staffWood = new THREE.MeshStandardMaterial({
      color: 0x3f2e21,
      roughness: 0.85,
      metalness: 0.0,
    });

    const staffCrystal = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: new THREE.Color(0x06b6d4),
      emissiveIntensity: 2.8,
      roughness: 0.08,
      metalness: 0.2,
      transparent: true,
      opacity: 0.92,
    });
    this.applySharedRimShader(staffCrystal, {
      rimColor: 0x67e8f9,
      rimPower: 1.8,
      rimIntensity: 2.2,
      pulseRune: true,
    });

    const goldOrnaments = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.88,
      roughness: 0.22,
    });

    return { robeFabric, robeRunes, staffWood, staffCrystal, goldOrnaments };
  }

  /**
   * Assassin Material Set:
   *  - Leather cuirass: roughness 0.50, subtle specularity, dark matte finish
   *  - Shrouded hood/cowl: charcoal roughness 0.65
   *  - Dagger steel: smoked obsidian steel, metalness 0.95, roughness 0.15, poisoned edge
   */
  public getAssassinMaterials(): {
    cuirassLeather: THREE.MeshStandardMaterial;
    matteCowl: THREE.MeshStandardMaterial;
    smokedSteel: THREE.MeshStandardMaterial;
    poisonEdge: THREE.MeshStandardMaterial;
    bowWood: THREE.MeshStandardMaterial;
  } {
    const cuirassLeather = new THREE.MeshStandardMaterial({
      color: 0x27272a, // Deep obsidian black matte
      roughness: 0.5,
      metalness: 0.14,
      normalMap: this.leatherTextures.normal,
      normalScale: new THREE.Vector2(0.3, 0.3),
    });
    this.applySharedRimShader(cuirassLeather, {
      rimColor: 0x10b981, // Subtle emerald shadow rim
      rimPower: 3.4,
      rimIntensity: 1.1,
    });

    const matteCowl = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.65,
      metalness: 0.02,
    });
    this.applySharedRimShader(matteCowl, {
      rimColor: 0x34d399,
      rimPower: 3.2,
      rimIntensity: 0.9,
    });

    const smokedSteel = new THREE.MeshStandardMaterial({
      color: 0x3f3f46,
      metalness: 0.95,
      roughness: 0.15,
    });
    this.applySharedRimShader(smokedSteel, { rimColor: 0x6ee7b7, rimIntensity: 1.3 });

    const poisonEdge = new THREE.MeshStandardMaterial({
      color: 0x059669,
      emissive: new THREE.Color(0x10b981),
      emissiveIntensity: 1.4,
      metalness: 0.6,
      roughness: 0.2,
    });

    const bowWood = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 0.55,
      metalness: 0.08,
    });

    return { cuirassLeather, matteCowl, smokedSteel, poisonEdge, bowWood };
  }

  /**
   * Village NPC Material Set:
   *  - Matte rustic cloth: roughness 0.88, diffuse weave + ambient occlusion maps
   *  - Worn leather apron/boots: roughness 0.65, metalness 0.08
   *  - Brass lantern: metalness 0.80, roughness 0.30, glowing amber core
   */
  public getNPCMaterials(): {
    tunicCloth: THREE.MeshStandardMaterial;
    wornLeather: THREE.MeshStandardMaterial;
    skin: THREE.MeshStandardMaterial;
    brassLantern: THREE.MeshStandardMaterial;
    lanternGlass: THREE.MeshStandardMaterial;
  } {
    const tunicCloth = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Rustic earth ochre
      roughness: 0.88,
      metalness: 0.0,
      map: this.clothTextures.diffuse,
      aoMap: this.clothTextures.ao,
      aoMapIntensity: 0.85,
    });
    this.applySharedRimShader(tunicCloth, {
      rimColor: 0xfde68a, // Warm morning sunlight rim
      rimPower: 3.0,
      rimIntensity: 0.85,
    });

    const wornLeather = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.65,
      metalness: 0.08,
    });

    const skin = new THREE.MeshStandardMaterial({
      color: 0xffd180,
      roughness: 0.6,
      metalness: 0.0,
    });

    const brassLantern = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      metalness: 0.8,
      roughness: 0.3,
    });

    const lanternGlass = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: new THREE.Color(0xf59e0b),
      emissiveIntensity: 3.2,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.88,
    });

    return { tunicCloth, wornLeather, skin, brassLantern, lanternGlass };
  }

  /**
   * Updates global shader uniforms (e.g., time elapsed for pulsing runes, rim modulation).
   */
  public update(delta: number): void {
    this.uniforms.uTime.value += delta;
  }
}

// ============================================================================
// 4. MODULAR EQUIPMENT SYSTEM
// ============================================================================

export class CharacterEquipmentFactory {
  private static shaderManager = CharacterShaderManager.getInstance();

  /**
   * Knight's Broadsword:
   * Steel fuller blade, engraved gilded crossguard, leather-wrapped grip, weighted pommel.
   */
  public static createKnightSword(): EquipmentItem {
    const group = new THREE.Group();
    const mats = this.shaderManager.getKnightMaterials();

    // Blade with central fuller groove
    const bladeGeo = new THREE.BoxGeometry(0.12, 1.25, 0.035);
    const blade = new THREE.Mesh(bladeGeo, mats.plateArmor);
    blade.position.y = 0.65;
    blade.castShadow = true;

    // Crossguard
    const guardGeo = new THREE.BoxGeometry(0.42, 0.06, 0.09);
    const guard = new THREE.Mesh(guardGeo, mats.goldTrim);
    guard.position.y = 0.06;
    guard.castShadow = true;

    // Grip
    const gripGeo = new THREE.CylinderGeometry(0.032, 0.035, 0.28, 8);
    const grip = new THREE.Mesh(gripGeo, mats.leatherStrap);
    grip.position.y = -0.11;

    // Pommel
    const pommelGeo = new THREE.DodecahedronGeometry(0.055);
    const pommel = new THREE.Mesh(pommelGeo, mats.goldTrim);
    pommel.position.y = -0.27;

    group.add(blade, guard, grip, pommel);
    group.rotation.x = Math.PI / 2; // Default aligned with grip forward

    return { id: 'knight_sword', name: 'Imperial Broadsword', slot: 'hand_r', mesh: group };
  }

  /**
   * Knight's Sculpted Kite Shield:
   * Curved anatomical convex plate, flared upper corner wings, reinforced steel rim with studs,
   * golden embossed heraldic lion crest, and interior arm grips.
   */
  public static createKnightShield(): EquipmentItem {
    const group = new THREE.Group();
    const mats = this.shaderManager.getKnightMaterials();

    // Sculpted curved shield face with flared upper wings
    const shieldGeo = new THREE.BoxGeometry(0.74, 1.12, 0.09);
    const shield = new THREE.Mesh(shieldGeo, mats.cape);
    shield.castShadow = true;

    // Heavy flanged steel rim with beveled perimeter
    const rimGeo = new THREE.BoxGeometry(0.8, 1.18, 0.06);
    const rim = new THREE.Mesh(rimGeo, mats.plateArmor);
    rim.position.z = -0.025;

    // Golden embossed heraldic lion crest on shield face
    const crestGroup = new THREE.Group();
    crestGroup.position.z = 0.065;
    // Lion head boss
    const lionHead = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12), mats.goldTrim);
    lionHead.position.y = 0.15;
    // Lion mane & crown
    const lionMane = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.16, 6), mats.goldTrim);
    lionMane.rotation.x = Math.PI / 2;
    lionMane.position.y = 0.22;
    // Lower heraldic chevron
    const chevron = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.04), mats.goldTrim);
    chevron.position.y = -0.15;
    chevron.rotation.z = 0.25;
    const chevron2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.04), mats.goldTrim);
    chevron2.position.y = -0.15;
    chevron2.rotation.z = -0.25;
    crestGroup.add(lionHead, lionMane, chevron, chevron2);

    // Shield studs along the rim
    for (let i = 0; i < 8; i++) {
      const stud = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), mats.goldTrim);
      const angle = (i / 8) * Math.PI * 2;
      stud.position.set(Math.cos(angle) * 0.35, Math.sin(angle) * 0.52, 0.045);
      group.add(stud);
    }

    group.add(shield, rim, crestGroup);
    group.position.set(0.12, 0, 0);

    return { id: 'knight_shield', name: 'Royal Heraldic Kite Shield', slot: 'hand_l', mesh: group };
  }

  /**
   * Mage's Twisted Root Archmage Staff:
   * Gnarled organic spiraling branches wrapping around the shaft, blooming into wooden root claws
   * cradling a large, raw, faceted asymmetrical uncut glowing cyan crystal with orbiting mana sparks.
   */
  public static createMageStaff(): EquipmentItem {
    const group = new THREE.Group();
    const mats = this.shaderManager.getMageMaterials();

    // Central wood staff core
    const shaftGeo = new THREE.CylinderGeometry(0.032, 0.045, 1.9, 8);
    const shaft = new THREE.Mesh(shaftGeo, mats.staffWood);
    shaft.position.y = 0.35;
    shaft.castShadow = true;
    group.add(shaft);

    // Gnarled spiraling root vine meshes braiding around the staff shaft
    for (let i = 0; i < 18; i++) {
      const t = i / 18;
      const angle = t * Math.PI * 5.0;
      const rootRamp = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.02, 0.16, 5),
        mats.staffWood
      );
      const rY = -0.4 + t * 1.6;
      rootRamp.position.set(Math.cos(angle) * 0.048, rY, Math.sin(angle) * 0.048);
      rootRamp.rotation.y = angle;
      rootRamp.rotation.z = 0.28;
      group.add(rootRamp);
    }

    // Root Wood Claw Prongs at staff head holding the crystal
    const clawAngles = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];
    clawAngles.forEach((cAngle, idx) => {
      // Main root claw finger
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.42, 5), mats.staffWood);
      claw.position.set(Math.cos(cAngle) * 0.13, 1.42, Math.sin(cAngle) * 0.13);
      claw.rotation.x = Math.sin(cAngle) * 0.35;
      claw.rotation.z = -Math.cos(cAngle) * 0.35;

      // Golden binding rune ring on claw base
      const goldRing = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.015, 6, 8), mats.goldOrnaments);
      goldRing.position.set(Math.cos(cAngle) * 0.1, 1.28, Math.sin(cAngle) * 0.1);
      group.add(claw, goldRing);
    });

    // Raw Asymmetrical Uncut Mana Crystal
    // Irregular faceted dodecahedron scaled asymmetrically (1.1, 1.65, 0.92) with rough natural facets
    const crystalGeo = new THREE.DodecahedronGeometry(0.18, 0);
    crystalGeo.scale(1.1, 1.65, 0.92);
    const crystal = new THREE.Mesh(crystalGeo, mats.staffCrystal);
    crystal.position.y = 1.44;
    crystal.rotation.set(0.2, 0.4, -0.15);
    crystal.name = 'floating_crystal';

    // Orbiting Arcane Rune Ring
    const orbitRingGeo = new THREE.TorusGeometry(0.26, 0.012, 6, 24);
    const orbitRing = new THREE.Mesh(
      orbitRingGeo,
      new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0xc084fc,
        emissiveIntensity: 2.2,
      })
    );
    orbitRing.position.y = 1.44;
    orbitRing.rotation.x = Math.PI / 3;
    orbitRing.name = 'orbiting_mana_ring';

    // Staff light glow
    const light = new THREE.PointLight(0x06b6d4, 2.0, 5.0);
    light.position.y = 1.44;

    group.add(crystal, orbitRing, light);

    return { id: 'mage_staff', name: 'Gnarled Root Archmage Staff', slot: 'hand_r', mesh: group, light };
  }

  /**
   * Assassin's Dual Curved Talon Daggers:
   * Curved obsidian blade with recurved wicked profile, poisoned emerald fuller groove,
   * finger-ring pommel for agile reverse ice-pick combat.
   */
  public static createAssassinDagger(isRightHand = true): EquipmentItem {
    const group = new THREE.Group();
    const mats = this.shaderManager.getAssassinMaterials();

    // Curved Talon Blade (Faceted swept razor profile)
    const bladeGeo = new THREE.BoxGeometry(0.065, 0.54, 0.022);
    const blade = new THREE.Mesh(bladeGeo, mats.smokedSteel);
    blade.position.set(0.04, 0.28, 0);
    blade.rotation.z = -0.18; // Agile curve
    blade.castShadow = true;

    // Wicked curved tip
    const tipGeo = new THREE.ConeGeometry(0.038, 0.16, 4);
    const tip = new THREE.Mesh(tipGeo, mats.smokedSteel);
    tip.position.set(0.09, 0.54, 0);
    tip.rotation.z = -0.45;

    // Poisoned emerald fuller line
    const poisonGroove = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.48, 0.026), mats.poisonEdge);
    poisonGroove.position.set(0.04, 0.28, 0);
    poisonGroove.rotation.z = -0.18;

    // Sculpted stealth crossguard
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.035, 0.06), mats.cuirassLeather);
    guard.position.y = 0.03;

    // Leather-wrapped grip
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, 0.2, 6), mats.cuirassLeather);
    grip.position.y = -0.08;

    // Tactical finger-ring pommel
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.014, 6, 14), mats.smokedSteel);
    ring.position.y = -0.2;

    group.add(blade, tip, poisonGroove, guard, grip, ring);
    group.rotation.x = Math.PI; // Reverse assassin grip (ice-pick style)

    const slot: WeaponSlot = isRightHand ? 'hand_r' : 'hand_l';
    const id = isRightHand ? 'assassin_dagger_r' : 'assassin_dagger_l';

    return { id, name: isRightHand ? 'Curved Talon Dagger (R)' : 'Curved Talon Dagger (L)', slot, mesh: group };
  }

  /**
   * Assassin's Sharp Recurve Composite Bow:
   * Aggressive recurved blackwood limbs, bone siyahs with string notches,
   * wrapped leather riser grip, and taut high-tensile bowstring.
   */
  public static createAssassinBow(): EquipmentItem {
    const group = new THREE.Group();
    const mats = this.shaderManager.getAssassinMaterials();

    // Upper recurved limb
    const upperLimb = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.034, 0.62, 6), mats.bowWood);
    upperLimb.position.set(0.12, 0.32, 0);
    upperLimb.rotation.z = -0.38;

    // Upper sharp forward recurve tip (siyah)
    const upperSiyah = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.22, 4), mats.smokedSteel);
    upperSiyah.position.set(0.22, 0.65, 0);
    upperSiyah.rotation.z = 0.45;

    // Lower recurved limb
    const lowerLimb = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.022, 0.62, 6), mats.bowWood);
    lowerLimb.position.set(0.12, -0.32, 0);
    lowerLimb.rotation.z = 0.38;

    // Lower sharp forward recurve tip (siyah)
    const lowerSiyah = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.22, 4), mats.smokedSteel);
    lowerSiyah.position.set(0.22, -0.65, 0);
    lowerSiyah.rotation.z = -0.45;

    // Center leather riser grip with arrow rest notch
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.24, 0.065), mats.cuirassLeather);

    // Taut Bowstring connecting the siyah tips
    const stringMat = new THREE.LineBasicMaterial({ color: 0x94a3b8 });
    const stringGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.24, 0.74, 0),
      new THREE.Vector3(0.02, 0.0, 0),
      new THREE.Vector3(0.24, -0.74, 0),
    ]);
    const bowstring = new THREE.Line(stringGeo, stringMat);

    group.add(upperLimb, upperSiyah, lowerLimb, lowerSiyah, grip, bowstring);

    return { id: 'assassin_bow', name: 'Sharp Recurve Shadow Bow', slot: 'hand_l', mesh: group };
  }

  /**
   * Village NPC's Hanging Handcrafted Wooden Lantern:
   * Hexagonal dark rustic timber frame, corner struts, peaked timber roof with chimney,
   * warm glowing glass core with internal candle flame, and swinging hanging suspension hook.
   */
  public static createNPCLantern(): EquipmentItem {
    const group = new THREE.Group();
    const mats = this.shaderManager.getNPCMaterials();

    // Dark rustic timber material
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x451a03, // Rustic dark oak timber
      roughness: 0.85,
      metalness: 0.05,
    });

    // Hexagonal wooden base
    const baseGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.09, 6);
    const base = new THREE.Mesh(baseGeo, woodMat);
    base.position.y = -0.16;
    base.castShadow = true;

    // Peaked hexagonal timber shingled roof
    const roofGeo = new THREE.ConeGeometry(0.18, 0.15, 6);
    const roof = new THREE.Mesh(roofGeo, woodMat);
    roof.position.y = 0.24;

    // Brass smoke chimney cap
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.08, 6), mats.brassLantern);
    chimney.position.y = 0.33;

    // Glowing Amber Glass Core
    const glassGeo = new THREE.CylinderGeometry(0.11, 0.12, 0.28, 6);
    const glass = new THREE.Mesh(glassGeo, mats.lanternGlass);
    glass.position.y = 0.04;

    // Six rustic vertical wooden corner struts
    for (let i = 0; i < 6; i++) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.28, 0.022), woodMat);
      const angle = (i * Math.PI) / 3;
      strut.position.set(Math.cos(angle) * 0.115, 0.04, Math.sin(angle) * 0.115);
      strut.rotation.y = angle;
      group.add(strut);
    }

    // Interior warm flickering candle
    const candle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.035, 0.12, 6),
      new THREE.MeshLambertMaterial({ color: 0xfef3c7 })
    );
    candle.position.y = -0.05;
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.02, 0.06, 6),
      new THREE.MeshBasicMaterial({ color: 0xffedd5 })
    );
    flame.position.y = 0.03;
    group.add(candle, flame);

    // Curved hanging suspension handle
    const handleGeo = new THREE.TorusGeometry(0.13, 0.016, 6, 14, Math.PI);
    const handle = new THREE.Mesh(handleGeo, mats.brassLantern);
    handle.position.y = 0.42;
    handle.name = 'lantern_handle';

    // Warm amber dynamic lantern point light
    const lanternLight = new THREE.PointLight(0xf59e0b, 2.2, 6.0);
    lanternLight.position.y = 0.05;
    lanternLight.castShadow = false;

    group.add(base, roof, chimney, glass, handle, lanternLight);

    return { id: 'npc_lantern', name: 'Hanging Wooden Lantern', slot: 'hand_l', mesh: group, light: lanternLight };
  }

  /**
   * Village NPC Potion Belt & Baldric Accessory:
   * Leather waist belt and shoulder sash hung with multiple colored glass potion bottles
   * of varied sizes (round health flask, slender mana vial, teardrop stamina draught with cork stoppers).
   */
  public static createNPCPotionBelt(): THREE.Group {
    const group = new THREE.Group();
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.7, metalness: 0.1 });
    const corkMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.9, metalness: 0.0 });

    const potionConfigs = [
      { color: 0xef4444, shape: 'round', x: 0.24, y: 0.04, z: 0.18, scale: 0.08 }, // Ruby health flask
      { color: 0x3b82f6, shape: 'vial', x: 0.14, y: 0.05, z: 0.22, scale: 0.07 }, // Sapphire mana vial
      { color: 0x10b981, shape: 'round', x: -0.16, y: 0.04, z: 0.22, scale: 0.075 }, // Emerald stamina
      { color: 0xf59e0b, shape: 'vial', x: -0.26, y: 0.05, z: 0.18, scale: 0.085 }, // Amber elixir
      { color: 0xa855f7, shape: 'round', x: -0.32, y: 0.02, z: 0.08, scale: 0.09 }, // Purple draught
    ];

    potionConfigs.forEach((cfg) => {
      const bottleGroup = new THREE.Group();
      bottleGroup.position.set(cfg.x, cfg.y, cfg.z);

      const glassMat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        emissive: cfg.color,
        emissiveIntensity: 0.85,
        transparent: true,
        opacity: 0.88,
        roughness: 0.12,
        metalness: 0.1,
      });

      // Bottle body
      if (cfg.shape === 'round') {
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(cfg.scale, 8, 8), glassMat);
        bottleGroup.add(sphere);
      } else {
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(cfg.scale * 0.7, cfg.scale * 0.8, cfg.scale * 2.0, 8), glassMat);
        bottleGroup.add(cyl);
      }

      // Bottle neck & cork
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(cfg.scale * 0.35, cfg.scale * 0.35, cfg.scale * 0.5, 6), glassMat);
      neck.position.y = cfg.scale * 0.9;
      const cork = new THREE.Mesh(new THREE.CylinderGeometry(cfg.scale * 0.38, cfg.scale * 0.3, cfg.scale * 0.4, 6), corkMat);
      cork.position.y = cfg.scale * 1.25;

      // Leather holster strap loop
      const strap = new THREE.Mesh(new THREE.TorusGeometry(cfg.scale * 0.6, 0.014, 4, 8), leatherMat);
      strap.rotation.x = Math.PI / 2;
      strap.position.y = cfg.scale * 0.3;

      bottleGroup.add(neck, cork, strap);
      group.add(bottleGroup);
    });

    return group;
  }
}

// ============================================================================
// 5. UNIFIED CHARACTER RIG & FACTORY
// ============================================================================

export function createUnifiedCharacter(
  entityType: EntityType,
  options: CharacterSetupOptions = {}
): UnifiedCharacter {
  const shaderMgr = CharacterShaderManager.getInstance();

  const root = new THREE.Group();
  root.name = `character_${entityType}`;

  if (options.position) {
    if (Array.isArray(options.position)) {
      root.position.set(...options.position);
    } else {
      root.position.copy(options.position);
    }
  }
  if (options.rotationY !== undefined) {
    root.rotation.y = options.rotationY;
  }
  if (options.scale !== undefined) {
    root.scale.setScalar(options.scale);
  }

  // --------------------------------------------------------------------------
  // BONE RIG HIERARCHY
  // --------------------------------------------------------------------------
  const pelvis = new THREE.Group();
  pelvis.name = 'bone_pelvis';
  pelvis.position.y = 1.0;
  root.add(pelvis);

  // Jika entityType adalah knight dan mode GLB aktif, lampirkan model 3D baru (knight3D_test.glb)
  const isGLBActive = options.useGLB ?? (entityType === 'knight' && getUseCustomKnightGLB());
  if (entityType === 'knight' && isGLBActive) {
    const glbKnightContainer = createKnightGLBMesh({
      scale: 2.15,
      castShadow: options.castShadow ?? true,
      receiveShadow: options.receiveShadow ?? true,
    });
    root.add(glbKnightContainer);
    // Sembunyikan geometri prosedural lama jika GLB aktif, namun pertahankan node bone untuk socket
    pelvis.visible = false;
  }

  const torso = new THREE.Group();
  torso.name = 'bone_torso';
  torso.position.y = 0.35;
  pelvis.add(torso);

  const head = new THREE.Group();
  head.name = 'bone_head';
  head.position.y = 0.65;
  torso.add(head);

  // Right Arm Chain
  const armR = new THREE.Group();
  armR.name = 'bone_arm_r';
  armR.position.set(0.48, 0.5, 0);
  torso.add(armR);

  const forearmR = new THREE.Group();
  forearmR.name = 'bone_forearm_r';
  forearmR.position.y = -0.32;
  armR.add(forearmR);

  const handR = new THREE.Group();
  handR.name = 'bone_hand_r';
  handR.position.y = -0.3;
  forearmR.add(handR);

  // Left Arm Chain
  const armL = new THREE.Group();
  armL.name = 'bone_arm_l';
  armL.position.set(-0.48, 0.5, 0);
  torso.add(armL);

  const forearmL = new THREE.Group();
  forearmL.name = 'bone_forearm_l';
  forearmL.position.y = -0.32;
  armL.add(forearmL);

  const handL = new THREE.Group();
  handL.name = 'bone_hand_l';
  handL.position.y = -0.3;
  forearmL.add(handL);

  // Legs Chain
  const legR = new THREE.Group();
  legR.name = 'bone_leg_r';
  legR.position.set(0.22, 0, 0);
  pelvis.add(legR);

  const footR = new THREE.Group();
  footR.name = 'bone_foot_r';
  footR.position.y = -0.85;
  legR.add(footR);

  const legL = new THREE.Group();
  legL.name = 'bone_leg_l';
  legL.position.set(-0.22, 0, 0);
  pelvis.add(legL);

  const footL = new THREE.Group();
  footL.name = 'bone_foot_l';
  footL.position.y = -0.85;
  legL.add(footL);

  // --------------------------------------------------------------------------
  // EQUIPMENT SOCKETS
  // --------------------------------------------------------------------------
  const socketHandR = new THREE.Group();
  socketHandR.name = 'socket_hand_r';
  handR.add(socketHandR);

  const socketHandL = new THREE.Group();
  socketHandL.name = 'socket_hand_l';
  handL.add(socketHandL);

  const socketBackR = new THREE.Group();
  socketBackR.name = 'socket_back_r';
  socketBackR.position.set(0.18, 0.35, -0.22);
  socketBackR.rotation.y = Math.PI;
  torso.add(socketBackR);

  const socketBackL = new THREE.Group();
  socketBackL.name = 'socket_back_l';
  socketBackL.position.set(-0.18, 0.35, -0.22);
  socketBackL.rotation.y = Math.PI;
  torso.add(socketBackL);

  const socketHipR = new THREE.Group();
  socketHipR.name = 'socket_hip_r';
  socketHipR.position.set(0.35, 0.05, 0);
  pelvis.add(socketHipR);

  const socketHipL = new THREE.Group();
  socketHipL.name = 'socket_hip_l';
  socketHipL.position.set(-0.35, 0.05, 0);
  pelvis.add(socketHipL);

  const socketHead = new THREE.Group();
  socketHead.name = 'socket_head';
  socketHead.position.set(0, 0.28, 0);
  head.add(socketHead);

  const sockets: CharacterSockets = {
    hand_r: socketHandR,
    hand_l: socketHandL,
    back_r: socketBackR,
    back_l: socketBackL,
    hip_r: socketHipR,
    hip_l: socketHipL,
    head_socket: socketHead,
  };

  const bones: CharacterBoneHierarchy = {
    root,
    pelvis,
    torso,
    head,
    armR,
    forearmR,
    handR,
    armL,
    forearmL,
    handL,
    legR,
    footR,
    legL,
    footL,
  };

  // --------------------------------------------------------------------------
  // ANATOMICAL MESHES & UNIQUE MATERIALS BY ENTITY
  // --------------------------------------------------------------------------
  let materials: Record<string, THREE.Material> = {};
  const equipment = new Map<string, EquipmentItem>();

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xffd180,
    roughness: 0.6,
    metalness: 0.0,
  });

  if (entityType === 'knight') {
    const kMats = shaderMgr.getKnightMaterials();
    materials = kMats;

    // 1. Anatomical Sculpted Steel Cuirass (Gagah berlekuk anatomis)
    const cuirassGroup = new THREE.Group();
    cuirassGroup.position.y = 0.25;

    // Muscular chest pectoral plates with beveled relief
    const pecGeo = new THREE.BoxGeometry(0.68, 0.38, 0.44);
    const pecs = new THREE.Mesh(pecGeo, kMats.plateArmor);
    pecs.position.y = 0.14;
    pecs.castShadow = true;

    // Abdominal contoured armor plates tapering to waist
    const absGeo = new THREE.BoxGeometry(0.58, 0.32, 0.4);
    const abs = new THREE.Mesh(absGeo, kMats.plateArmor);
    abs.position.y = -0.16;
    abs.castShadow = true;

    // Gilded breastplate eagle scrollwork & center sternum ridge
    const sternumRidge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.46), kMats.goldTrim);
    sternumRidge.position.set(0, 0.08, 0.01);
    const chestCrest = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.36, 4), kMats.goldTrim);
    chestCrest.rotation.z = Math.PI;
    chestCrest.position.set(0, 0.12, 0.23);

    // Flanged faulds / hip armor skirts
    const fauldL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.42), kMats.plateArmor);
    fauldL.position.set(-0.24, -0.32, 0);
    fauldL.rotation.z = 0.15;
    const fauldR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.42), kMats.plateArmor);
    fauldR.position.set(0.24, -0.32, 0);
    fauldR.rotation.z = -0.15;

    cuirassGroup.add(pecs, abs, sternumRidge, chestCrest, fauldL, fauldR);
    torso.add(cuirassGroup);

    // 2. Pauldrons: Tegas, Besar & Bertingkat (Flanged Multi-tiered Shoulder Guards)
    [-1, 1].forEach((side) => {
      const pauldronGroup = new THREE.Group();
      pauldronGroup.position.set(side * 0.06, 0.12, 0);

      // Tier 1: Main angular wing plate
      const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.44), kMats.plateArmor);
      p1.rotation.z = side * -0.25;
      p1.rotation.y = side * 0.1;
      p1.castShadow = true;

      // Tier 2: Upward angular spire blade
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.38, 4), kMats.goldTrim);
      spire.position.set(side * 0.08, 0.24, 0);
      spire.rotation.z = side * -0.35;

      // Tier 3: Lower articulated arm guard lamina
      const lamina = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.38), kMats.plateArmor);
      lamina.position.set(0, -0.22, 0);

      // Gold bevel trims
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.06, 0.46), kMats.goldTrim);
      trim.rotation.z = side * -0.25;

      pauldronGroup.add(p1, spire, lamina, trim);
      if (side === 1) armR.add(pauldronGroup);
      else armL.add(pauldronGroup);
    });

    // Articulated Vambraces & Gauntlets
    forearmR.add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, 0.26), kMats.plateArmor));
    forearmL.add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, 0.26), kMats.plateArmor));

    // 3. Great Helm dengan Siluet Tajam (Sharp Aggressive Visor Helmet)
    const helmGroup = new THREE.Group();
    helmGroup.position.y = 0.24;

    // Faceted skull cap
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.48, 0.46), kMats.plateArmor);
    // Swept combat crest fin
    const crestFin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 0.54), kMats.goldTrim);
    crestFin.position.set(0, 0.26, -0.04);
    crestFin.rotation.x = -0.25;

    // Sharp wedge-shaped visor with razor eye-slit
    const visorWedge = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.42, 4), kMats.plateArmor);
    visorWedge.rotation.x = Math.PI / 2;
    visorWedge.rotation.y = Math.PI / 4;
    visorWedge.position.set(0, 0.02, 0.22);

    const eyeSlit = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.038, 0.52), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
    eyeSlit.position.set(0, 0.06, 0);

    // Pointed cheek guards
    const cheekL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.36), kMats.plateArmor);
    cheekL.position.set(-0.22, -0.12, 0.06);
    const cheekR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.36), kMats.plateArmor);
    cheekR.position.set(0.22, -0.12, 0.06);

    helmGroup.add(skull, crestFin, visorWedge, eyeSlit, cheekL, cheekR);
    head.add(helmGroup);

    // Plated Greaves & Pointed Sabatons (Legs & Boots)
    const legGeo = new THREE.BoxGeometry(0.25, 0.76, 0.28);
    const bootGeo = new THREE.BoxGeometry(0.28, 0.22, 0.44); // Pointed sabaton

    const plateLegR = new THREE.Mesh(legGeo, kMats.plateArmor);
    plateLegR.position.y = -0.42;
    legR.add(plateLegR);

    const bootR = new THREE.Mesh(bootGeo, kMats.plateArmor);
    bootR.position.set(0, 0.1, 0.08);
    footR.add(bootR);

    const plateLegL = new THREE.Mesh(legGeo, kMats.plateArmor);
    plateLegL.position.y = -0.42;
    legL.add(plateLegL);

    const bootL = new THREE.Mesh(bootGeo, kMats.plateArmor);
    bootL.position.set(0, 0.1, 0.08);
    footL.add(bootL);

    // 4. Jubah Bertingkat Berkibar Dinamis (Tiered Double Cape)
    const capeGroup = new THREE.Group();
    capeGroup.position.set(0, 0.52, -0.26);

    // Outer royal crimson velvet layer
    const outerCape = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 1.35, 6, 8), kMats.cape);
    outerCape.rotation.x = 0.14;
    outerCape.castShadow = true;

    // Inner gold trim lining layer
    const innerCape = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 1.25), kMats.goldTrim);
    innerCape.position.set(0, -0.05, 0.02);
    innerCape.rotation.x = 0.14;

    capeGroup.add(outerCape, innerCape);
    torso.add(capeGroup);
    bones.cape = outerCape;
  } else if (entityType === 'mage') {
    const mMats = shaderMgr.getMageMaterials();
    materials = mMats;

    // 1. Jubah Berlayar (Layered Robes with Dramatic Folds)
    // Inner dark midnight silk vest
    const innerVest = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.65, 0.36), mMats.robeFabric);
    innerVest.position.y = 0.25;
    innerVest.castShadow = true;
    torso.add(innerVest);

    // Front cascading ceremonial tabard with pulsating runic glyphs
    const tabardGeo = new THREE.BoxGeometry(0.36, 0.95, 0.39);
    const tabard = new THREE.Mesh(tabardGeo, mMats.robeRunes);
    tabard.position.set(0, 0.12, 0.02);
    torso.add(tabard);

    // 2. Kerah Tinggi yang Elegan (Elegant Arched High Collar rising behind neck)
    const collarGroup = new THREE.Group();
    collarGroup.position.set(0, 0.58, -0.05);

    // High standing rear fan collar
    const collarRear = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.28, 0.42, 8, 1, true, -Math.PI * 0.7, Math.PI * 1.4), mMats.robeFabric);
    collarRear.rotation.y = Math.PI / 2;
    collarRear.rotation.x = 0.2;

    // Golden embroidered trim on high collar rim
    const collarTrim = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.024, 6, 16, Math.PI * 1.4), mMats.goldOrnaments);
    collarTrim.rotation.y = Math.PI / 2;
    collarTrim.position.y = 0.21;
    collarTrim.rotation.x = 0.2;

    collarGroup.add(collarRear, collarTrim);
    torso.add(collarGroup);

    // Dramatic Flared Bell Sleeves with inner glow
    [-1, 1].forEach((side) => {
      const sleeveGroup = new THREE.Group();
      sleeveGroup.position.y = -0.18;

      const upperSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.35, 8), mMats.robeFabric);
      const flaredCuff = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.42, 8, 1, true), mMats.robeRunes);
      flaredCuff.position.y = -0.22;
      flaredCuff.rotation.x = Math.PI;

      sleeveGroup.add(upperSleeve, flaredCuff);
      if (side === 1) armR.add(sleeveGroup);
      else armL.add(sleeveGroup);
    });

    // Mage Head with Arcane Hood & Golden Circlet
    const headSphere = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), skinMat);
    headSphere.position.y = 0.22;
    const hoodCowl = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.65, 8), mMats.robeFabric);
    hoodCowl.position.set(0, 0.32, -0.06);
    hoodCowl.rotation.x = -0.15;

    const circlet = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.028, 6, 16), mMats.goldOrnaments);
    circlet.rotation.x = Math.PI / 2;
    circlet.position.y = 0.28;
    head.add(headSphere, hoodCowl, circlet);

    // Multi-tiered Cascading Robe Skirt (Dramatic Cloth Folds)
    const skirtGroup = new THREE.Group();
    skirtGroup.position.y = -0.45;

    // Upper hip tunic fold
    const upperFold = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.55, 8), mMats.robeRunes);
    upperFold.position.y = 0.18;

    // Full cascading skirt
    const mainSkirt = new THREE.Mesh(new THREE.ConeGeometry(0.58, 1.25, 10), mMats.robeFabric);
    mainSkirt.position.y = -0.18;

    // Gold hem ribbon
    const hemTrim = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.024, 6, 20), mMats.goldOrnaments);
    hemTrim.rotation.x = Math.PI / 2;
    hemTrim.position.y = -0.78;

    skirtGroup.add(upperFold, mainSkirt, hemTrim);
    pelvis.add(skirtGroup);
  } else if (entityType === 'assassin') {
    const aMats = shaderMgr.getAssassinMaterials();
    materials = aMats;

    // 1. Bentuk Tubuh Ramping & Atletis (Athletic Tapered Torso)
    const vestGroup = new THREE.Group();
    vestGroup.position.y = 0.25;

    // Tapered athletic leather cuirass
    const cuirass = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.64, 0.34), aMats.cuirassLeather);
    cuirass.castShadow = true;

    // 2. Sabuk Kulit Bersilang & Kantong Perlengkapan (Crossed Bandoliers & Pouches)
    const bandolier1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.74, 0.36), aMats.cuirassLeather);
    bandolier1.rotation.z = -0.52;
    const bandolier2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.74, 0.36), aMats.cuirassLeather);
    bandolier2.rotation.z = 0.52;

    // Utility gear pouches on belt
    const pouchL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.18, 0.12), aMats.cuirassLeather);
    pouchL.position.set(-0.32, -0.22, 0.08);
    const pouchR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.18, 0.12), aMats.cuirassLeather);
    pouchR.position.set(0.32, -0.22, 0.08);

    // Throwing knife handles strapped on chest
    for (let i = 0; i < 3; i++) {
      const knifeHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.12, 6), aMats.smokedSteel);
      knifeHandle.rotation.z = Math.PI / 2;
      knifeHandle.position.set(0.12, -0.05 + i * 0.12, 0.19);
      vestGroup.add(knifeHandle);
    }

    vestGroup.add(cuirass, bandolier1, bandolier2, pouchL, pouchR);
    torso.add(vestGroup);

    // 3. Tudung (Hood) & Syal Asimetris (Deep Shadow Hood & Flowing Scarf)
    // Deep peaked shadow cowl hood
    const hoodGroup = new THREE.Group();
    const deepHood = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.6, 6), aMats.matteCowl);
    deepHood.position.set(0, 0.28, -0.05);
    deepHood.rotation.x = -0.25;

    // Shadow face mask with subtle emerald eyes
    const mask = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.28), aMats.matteCowl);
    mask.position.set(0, 0.15, 0.06);

    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.018, 0.02), aMats.poisonEdge);
    eyeL.position.set(-0.08, 0.22, 0.21);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.018, 0.02), aMats.poisonEdge);
    eyeR.position.set(0.08, 0.22, 0.21);

    hoodGroup.add(deepHood, mask, eyeL, eyeR);
    head.add(hoodGroup);

    // Asymmetrical draping emerald silk scarf flowing across right shoulder
    const scarfGroup = new THREE.Group();
    scarfGroup.position.set(0, 0.52, 0);

    // Neck wrap collar
    const scarfWrap = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.08, 6, 12), aMats.poisonEdge);
    scarfWrap.rotation.x = Math.PI / 2;

    // Long trailing scarf tail cascading over one shoulder
    const trailingScarf = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.95, 3, 6), aMats.poisonEdge);
    trailingScarf.position.set(0.22, -0.35, -0.22);
    trailingScarf.rotation.x = 0.22;
    trailingScarf.rotation.z = -0.15;
    scarfGroup.add(scarfWrap, trailingScarf);
    torso.add(scarfGroup);

    // Agile articulated leather bracers
    forearmR.add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.32, 6), aMats.cuirassLeather));
    forearmL.add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.32, 6), aMats.cuirassLeather));

    // Sleek Tassets & Light Agile Boots
    const legGeo = new THREE.BoxGeometry(0.19, 0.76, 0.21);
    const bootGeo = new THREE.BoxGeometry(0.21, 0.18, 0.32);

    const legMeshR = new THREE.Mesh(legGeo, aMats.cuirassLeather);
    legMeshR.position.y = -0.42;
    legR.add(legMeshR);
    const bootR = new THREE.Mesh(bootGeo, aMats.cuirassLeather);
    bootR.position.set(0, 0.1, 0.06);
    footR.add(bootR);

    const legMeshL = new THREE.Mesh(legGeo, aMats.cuirassLeather);
    legMeshL.position.y = -0.42;
    legL.add(legMeshL);
    const bootL = new THREE.Mesh(bootGeo, aMats.cuirassLeather);
    bootL.position.set(0, 0.1, 0.06);
    footL.add(bootL);
  } else if (entityType === 'npc') {
    const npcMats = shaderMgr.getNPCMaterials();
    materials = npcMats;

    // 1. Postur Tubuh Membungkuk Ramah (Friendly Hunched Villager Posture)
    pelvis.rotation.x = 0.08; // Subtle welcoming forward tilt
    head.rotation.x = -0.06; // Head lifted pleasantly to greet the player

    // 2. Pakaian Kain dengan Lipatan Alami (Natural Draped Linen Peasant Tunic)
    const tunicGroup = new THREE.Group();
    tunicGroup.position.y = 0.25;

    // Rustic cloth tunic with organic folds
    const tunic = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.68, 0.42), npcMats.tunicCloth);
    tunic.castShadow = true;

    // Craftsman work apron with seams
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.58, 0.08), npcMats.wornLeather);
    apron.position.set(0, 0.08, 0.22);

    // Rolled linen elbow cuffs
    const cuffR = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 6, 8), npcMats.tunicCloth);
    cuffR.position.set(0.02, 0.02, 0);
    forearmR.add(cuffR);
    const cuffL = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 6, 8), npcMats.tunicCloth);
    cuffL.position.set(-0.02, 0.02, 0);
    forearmL.add(cuffL);

    // 3. Sabuk Berisi Botol Ramuan Berbagai Ukuran (Potion Belt & Glass Vials)
    const potionBelt = CharacterEquipmentFactory.createNPCPotionBelt();
    tunicGroup.add(tunic, apron, potionBelt);
    torso.add(tunicGroup);

    // Friendly Village Head with knitted woolen cap
    const headGroup = new THREE.Group();
    headGroup.position.y = 0.22;
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), npcMats.skin);
    const rusticCap = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.18, 8), npcMats.wornLeather);
    rusticCap.position.set(0, 0.22, -0.04);
    rusticCap.rotation.x = -0.2;
    headGroup.add(headMesh, rusticCap);
    head.add(headGroup);

    // Rustic Fabric Trousers & Soft Walking Boots
    const legGeo = new THREE.BoxGeometry(0.23, 0.75, 0.25);
    const bootGeo = new THREE.BoxGeometry(0.25, 0.18, 0.34);

    const legMeshR = new THREE.Mesh(legGeo, npcMats.tunicCloth);
    legMeshR.position.y = -0.42;
    legR.add(legMeshR);
    const bootR = new THREE.Mesh(bootGeo, npcMats.wornLeather);
    bootR.position.set(0, 0.1, 0.05);
    footR.add(bootR);

    const legMeshL = new THREE.Mesh(legGeo, npcMats.tunicCloth);
    legMeshL.position.y = -0.42;
    legL.add(legMeshL);
    const bootL = new THREE.Mesh(bootGeo, npcMats.wornLeather);
    bootL.position.set(0, 0.1, 0.05);
    footL.add(bootL);
  }

  // Shadow flags
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = options.castShadow ?? true;
      child.receiveShadow = options.receiveShadow ?? true;
    }
  });

  // --------------------------------------------------------------------------
  // ATTACH DEFAULT MODULAR EQUIPMENT
  // --------------------------------------------------------------------------
  const character: UnifiedCharacter = {
    root,
    entityType,
    bones,
    sockets,
    materials,
    equipment,
    assassinMode: entityType === 'assassin' ? 'dual_daggers' : undefined,
    animTime: 0,
    walkCycle: 0,
    isMoving: false,
    isAttacking: false,
    attackTimer: 0,

    equip(item: EquipmentItem, targetSlot?: WeaponSlot) {
      const slot = targetSlot || item.slot;
      const socket = sockets[slot];
      if (!socket) return;

      // Remove existing item in socket if present
      for (let i = socket.children.length - 1; i >= 0; i--) {
        socket.remove(socket.children[i]);
      }

      socket.add(item.mesh);
      equipment.set(item.id, item);
    },

    unequip(slot: WeaponSlot) {
      const socket = sockets[slot];
      if (!socket || socket.children.length === 0) return undefined;

      let foundItem: EquipmentItem | undefined;
      for (const [key, item] of equipment.entries()) {
        if (item.slot === slot) {
          foundItem = item;
          equipment.delete(key);
          break;
        }
      }

      for (let i = socket.children.length - 1; i >= 0; i--) {
        socket.remove(socket.children[i]);
      }
      return foundItem;
    },

    switchAssassinWeaponMode(mode?: AssassinWeaponMode) {
      if (entityType !== 'assassin') return;
      const targetMode = mode || (this.assassinMode === 'dual_daggers' ? 'bow' : 'dual_daggers');
      this.assassinMode = targetMode;

      // Clear weapon sockets
      ['hand_r', 'hand_l', 'back_r', 'back_l', 'hip_r', 'hip_l'].forEach((s) => {
        const sock = sockets[s as WeaponSlot];
        while (sock.children.length > 0) sock.remove(sock.children[0]);
      });

      if (targetMode === 'dual_daggers') {
        const daggerR = CharacterEquipmentFactory.createAssassinDagger(true);
        const daggerL = CharacterEquipmentFactory.createAssassinDagger(false);
        const bow = CharacterEquipmentFactory.createAssassinBow();

        // Daggers active in hands
        sockets.hand_r.add(daggerR.mesh);
        sockets.hand_l.add(daggerL.mesh);
        // Bow stowed on back
        bow.mesh.rotation.z = Math.PI / 4;
        sockets.back_l.add(bow.mesh);

        equipment.set(daggerR.id, daggerR);
        equipment.set(daggerL.id, daggerL);
        equipment.set(bow.id, bow);
      } else {
        const daggerR = CharacterEquipmentFactory.createAssassinDagger(true);
        const daggerL = CharacterEquipmentFactory.createAssassinDagger(false);
        const bow = CharacterEquipmentFactory.createAssassinBow();

        // Bow active in left hand
        sockets.hand_l.add(bow.mesh);
        // Daggers stowed at hips
        daggerR.mesh.rotation.set(0, 0, Math.PI / 6);
        daggerL.mesh.rotation.set(0, 0, -Math.PI / 6);
        sockets.hip_r.add(daggerR.mesh);
        sockets.hip_l.add(daggerL.mesh);

        equipment.set(daggerR.id, daggerR);
        equipment.set(daggerL.id, daggerL);
        equipment.set(bow.id, bow);
      }
    },

    setMoving(moving: boolean) {
      this.isMoving = moving;
    },

    triggerAttack() {
      if (!this.isAttacking) {
        this.isAttacking = true;
        this.attackTimer = 0;
      }
    },

    update(delta: number) {
      this.animTime += delta;

      // 1. Procedural Walk Cycle & Rigging
      if (this.isMoving) {
        this.walkCycle += delta * 8.5;
        const sinW = Math.sin(this.walkCycle);
        const cosW = Math.cos(this.walkCycle);

        // Natural opposing limb swing
        bones.legR.rotation.x = sinW * 0.65;
        bones.legL.rotation.x = -sinW * 0.65;

        // Feet slight lift
        bones.footR.rotation.x = Math.max(0, -sinW * 0.3);
        bones.footL.rotation.x = Math.max(0, sinW * 0.3);

        // Arms counter-swing (unless attacking)
        if (!this.isAttacking) {
          bones.armR.rotation.x = -sinW * 0.45;
          bones.armL.rotation.x = sinW * 0.45;
          bones.armR.rotation.z = 0.08;
          bones.armL.rotation.z = -0.08;
        }

        // Torso pelvic bounce & subtle twist
        bones.pelvis.position.y = 1.0 + Math.abs(cosW) * 0.06;
        bones.torso.rotation.y = sinW * 0.08;
        bones.head.rotation.y = -sinW * 0.05;

        // Cape / Scarf aerodynamic flutter
        if (bones.cape) {
          bones.cape.rotation.x = 0.15 + Math.abs(sinW) * 0.35;
        }
      } else {
        // Subtle idle breathing
        const breath = Math.sin(this.animTime * 2.2);
        bones.pelvis.position.y = 1.0 + breath * 0.015;
        bones.torso.rotation.x = breath * 0.02;

        if (!this.isAttacking) {
          bones.legR.rotation.x = 0;
          bones.legL.rotation.x = 0;
          bones.footR.rotation.x = 0;
          bones.footL.rotation.x = 0;

          // Entity-specific idle poses
          if (entityType === 'knight') {
            bones.armR.rotation.set(-0.25, 0, 0.1);
            bones.armL.rotation.set(-0.35, 0.2, -0.15); // Shield held forward
          } else if (entityType === 'mage') {
            bones.armR.rotation.set(-0.3, 0, 0.12);
            bones.armL.rotation.set(breath * 0.05, 0, -0.1);
          } else if (entityType === 'assassin') {
            bones.armR.rotation.set(-0.2, 0.15, 0.15);
            bones.armL.rotation.set(-0.2, -0.15, -0.15);
          } else if (entityType === 'npc') {
            bones.armL.rotation.set(-0.4, 0, -0.15); // Holding lantern up
            bones.armR.rotation.set(0, 0, 0.05);
          }
        }

        if (bones.cape) {
          bones.cape.rotation.x = 0.12 + Math.sin(this.animTime * 1.5) * 0.05;
        }
      }

      // 2. Attack Animation Rigging
      if (this.isAttacking) {
        this.attackTimer += delta * 4.5;
        if (this.attackTimer < Math.PI) {
          const strike = Math.sin(this.attackTimer);
          if (entityType === 'knight') {
            // High-power sword slash
            bones.armR.rotation.x = -1.2 + strike * 1.9;
            bones.armR.rotation.y = strike * 0.6;
            bones.torso.rotation.y = -strike * 0.4;
          } else if (entityType === 'mage') {
            // Arcane staff slam / channeling
            bones.armR.rotation.x = -1.4 + strike * 1.6;
            bones.torso.rotation.x = -strike * 0.2;
          } else if (entityType === 'assassin') {
            // Cross-slash strike
            bones.armR.rotation.x = -0.8 + strike * 1.5;
            bones.armL.rotation.x = -0.8 + strike * 1.5;
          }
        } else {
          this.isAttacking = false;
          this.attackTimer = 0;
        }
      }

      // 3. Item-Specific Realtime Animations
      // Floating Mage Crystal rotation & levitation
      const crystal = root.getObjectByName('floating_crystal');
      if (crystal) {
        crystal.rotation.y += delta * 2.5;
        crystal.rotation.x = Math.sin(this.animTime * 3.0) * 0.2;
        crystal.position.y = 1.38 + Math.sin(this.animTime * 4.0) * 0.04;
      }

      // Lantern subtle pendulum sway
      const lanternHandle = root.getObjectByName('lantern_handle');
      if (lanternHandle) {
        const sway = Math.sin(this.animTime * 2.8) * 0.12;
        sockets.hand_l.rotation.z = sway;
      }
    },

    dispose() {
      root.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    },
  };

  // Attach default equipment loadout based on entity requirements
  if (entityType === 'knight') {
    const sword = CharacterEquipmentFactory.createKnightSword();
    const shield = CharacterEquipmentFactory.createKnightShield();
    character.equip(sword);
    character.equip(shield);
  } else if (entityType === 'mage') {
    const staff = CharacterEquipmentFactory.createMageStaff();
    character.equip(staff);
  } else if (entityType === 'assassin') {
    character.switchAssassinWeaponMode('dual_daggers');
  } else if (entityType === 'npc') {
    const lantern = CharacterEquipmentFactory.createNPCLantern();
    character.equip(lantern);
  }

  return character;
}

// ----------------------------------------------------------------------------
// SPECIFIC CONVENIENCE CONSTRUCTORS
// ----------------------------------------------------------------------------

export function createKnightCharacter(options?: CharacterSetupOptions): UnifiedCharacter {
  return createUnifiedCharacter('knight', options);
}

export function createMageCharacter(options?: CharacterSetupOptions): UnifiedCharacter {
  return createUnifiedCharacter('mage', options);
}

export function createAssassinCharacter(options?: CharacterSetupOptions): UnifiedCharacter {
  return createUnifiedCharacter('assassin', options);
}

export function createVillageNPCCharacter(options?: CharacterSetupOptions): UnifiedCharacter {
  return createUnifiedCharacter('npc', options);
}

// ============================================================================
// 6. 4-CHARACTER LINEUP SHOWCASE (SIDE-BY-SIDE PRESENTATION)
// ============================================================================

export interface CharacterLineupShowcase {
  group: THREE.Group;
  characters: {
    knight: UnifiedCharacter;
    mage: UnifiedCharacter;
    assassin: UnifiedCharacter;
    npc: UnifiedCharacter;
  };
  pedestals: THREE.Group;
  setAllMoving: (moving: boolean) => void;
  triggerAllAttacks: () => void;
  switchAssassinWeapon: (mode?: AssassinWeaponMode) => void;
  update: (delta: number) => void;
  dispose: () => void;
}

/**
 * Creates an ornate 4-character lineup group displaying:
 *  - Knight (Ksatria) with heavy plate armor, anatomical cuirass, sharp helmet, broadsword & shield
 *  - Mage (Penyihir) with layered indigo robes, high collar, gnarled root staff & raw crystal
 *  - Assassin (Asasin) with athletic build, deep hood, asymmetric scarf, dual daggers & recurve bow
 *  - Village NPC (NPC Desa) with hunched friendly posture, natural linen folds, potion belt & lantern
 *
 * All four characters stand side-by-side with uniform scale, consistent Stylized Fantasy aesthetic,
 * shared PBR shader pipeline, and individualized runic pedestals.
 */
export function createCharacterLineupShowcase(options?: {
  spacing?: number;
  includePedestals?: boolean;
  scale?: number;
}): CharacterLineupShowcase {
  const group = new THREE.Group();
  group.name = 'character_lineup_showcase';

  const spacing = options?.spacing ?? 2.3;
  const includePedestals = options?.includePedestals ?? true;
  const charScale = options?.scale ?? 1.0;

  // Relative X positions for the 4 characters standing side-by-side:
  // Knight (-1.5 * spacing), Mage (-0.5 * spacing), Assassin (0.5 * spacing), NPC (1.5 * spacing)
  const posXKnight = -1.5 * spacing;
  const posXMage = -0.5 * spacing;
  const posXAssassin = 0.5 * spacing;
  const posXNPC = 1.5 * spacing;

  const knight = createKnightCharacter({ scale: charScale });
  knight.root.position.set(posXKnight, 0, 0);

  const mage = createMageCharacter({ scale: charScale });
  mage.root.position.set(posXMage, 0, 0);

  const assassin = createAssassinCharacter({ scale: charScale });
  assassin.root.position.set(posXAssassin, 0, 0);

  const npc = createVillageNPCCharacter({ scale: charScale });
  npc.root.position.set(posXNPC, 0, 0);

  group.add(knight.root, mage.root, assassin.root, npc.root);

  // Pedestals Group
  const pedestals = new THREE.Group();
  pedestals.name = 'lineup_pedestals';

  if (includePedestals) {
    const pedestalConfigs = [
      { x: posXKnight, color: 0x3b82f6, trim: 0xf59e0b, label: 'KSATRIA' },
      { x: posXMage, color: 0x9333ea, trim: 0x06b6d4, label: 'PENYIHIR' },
      { x: posXAssassin, color: 0x10b981, trim: 0x34d399, label: 'ASASIN' },
      { x: posXNPC, color: 0xd97706, trim: 0xfde68a, label: 'NPC DESA' },
    ];

    pedestalConfigs.forEach((cfg) => {
      const pGroup = new THREE.Group();
      pGroup.position.set(cfg.x, 0, 0);

      // Carved stone octagonal base
      const stoneMat = new THREE.MeshStandardMaterial({
        color: 0x292524,
        roughness: 0.8,
        metalness: 0.1,
      });
      const baseGeo = new THREE.CylinderGeometry(1.05, 1.15, 0.22, 8);
      const baseMesh = new THREE.Mesh(baseGeo, stoneMat);
      baseMesh.position.y = -0.11;
      baseMesh.receiveShadow = true;

      // Stylized gold/metallic rim trim
      const trimMat = new THREE.MeshStandardMaterial({
        color: cfg.trim,
        roughness: 0.25,
        metalness: 0.85,
      });
      const trimGeo = new THREE.TorusGeometry(1.06, 0.03, 6, 8);
      trimGeo.rotateX(Math.PI / 2);
      const trimMesh = new THREE.Mesh(trimGeo, trimMat);
      trimMesh.position.y = -0.01;

      // Inner glowing runic emblem disc
      const runeMat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        emissive: new THREE.Color(cfg.color),
        emissiveIntensity: 0.8,
        roughness: 0.3,
        metalness: 0.2,
      });
      const discGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.02, 16);
      const discMesh = new THREE.Mesh(discGeo, runeMat);
      discMesh.position.y = 0.005;

      pGroup.add(baseMesh, trimMesh, discMesh);
      pedestals.add(pGroup);
    });

    group.add(pedestals);
  }

  const characters = { knight, mage, assassin, npc };

  return {
    group,
    characters,
    pedestals,

    setAllMoving(moving: boolean) {
      knight.setMoving(moving);
      mage.setMoving(moving);
      assassin.setMoving(moving);
      npc.setMoving(moving);
    },

    triggerAllAttacks() {
      knight.triggerAttack();
      mage.triggerAttack();
      assassin.triggerAttack();
    },

    switchAssassinWeapon(mode?: AssassinWeaponMode) {
      assassin.switchAssassinWeaponMode(mode);
    },

    update(delta: number) {
      CharacterShaderManager.getInstance().update(delta);
      knight.update(delta);
      mage.update(delta);
      assassin.update(delta);
      npc.update(delta);
    },

    dispose() {
      knight.dispose();
      mage.dispose();
      assassin.dispose();
      npc.dispose();
      pedestals.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
      });
    },
  };
}
