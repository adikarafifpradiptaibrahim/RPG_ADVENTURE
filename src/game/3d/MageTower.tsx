import * as THREE from 'three';

/**
 * MageTower Interior Teleportation & Configuration Module
 * 
 * Manages safe coordinates, teleport transitions, floor heights,
 * collision constraints, and camera alignment for the Mage Tower at Puncak Halilintar.
 */

export interface MageTowerTransform {
  x: number;
  y: number;
  z: number;
  rotationY?: number;
}

export const MAGE_TOWER_CONFIG = {
  // Exterior Tower Center & Entrance Door
  EXTERIOR_CENTER: { x: -155.0, z: -135.0 },
  EXTERIOR_BASE_Y: 5.5,
  EXTERIOR_DOOR: { x: -155.0, y: 5.5, z: -127.0 },
  EXTERIOR_SAFE_SPAWN: { x: -155.0, y: 5.5 + 0.5, z: -123.5, rotationY: Math.PI },

  // Interior Cell Coordinates & Radius
  INTERIOR_CENTER: { x: -155.0, z: -135.0 },
  INTERIOR_RADIUS: 9.6,
  WALKABLE_RADIUS: 8.6, // Inside wall boundary minus character radius

  // Exact Vertical Floor Elevations
  FLOOR_HEIGHTS: {
    LEVEL_1: -45.0, // Ground Floor: Ancient Library & Teleport Altar
    LEVEL_2: -37.5, // 2nd Floor: Alchemy Lab & Lightning Crystal Table
    LEVEL_3: -30.0, // 3rd Floor: Celestial Observatory & Armillary Orrery
  },

  // Safe Spawn Point on Level 1 (Library)
  SAFE_INTERIOR_SPAWN: {
    x: -155.0,
    y: -44.0, // Floor (-45.0) + 1.0 safe clearance as specified
    z: -129.5, // Just inside the south entrance door facing North
    rotationY: 0, // Facing North (0 rad) into the grand library
  },

  // Interior Exit Door Trigger on Level 1
  INTERIOR_EXIT_DOOR: {
    x: -155.0,
    y: -45.0,
    z: -128.5,
    radius: 3.8,
  },

  // Transition Grace Period Duration (seconds)
  TRANSITION_GRACE_DURATION: 0.25,

  // Camera Shoulder Reset Config for Interior Room
  INTERIOR_CAMERA: {
    angleH: 0, // Behind player facing North
    angleV: 0.18,
    distance: 5.2,
    offsetY: 1.8,
  },
};

/**
 * Validates teleport coordinates to prevent NaN or undefined crashes
 */
export function validateTeleportCoordinates(pos: { x?: number; y?: number; z?: number } | null | undefined): boolean {
  if (!pos) return false;
  return Number.isFinite(pos.x) && Number.isFinite(pos.y) && Number.isFinite(pos.z);
}

/**
 * Returns safe interior spawn point with fallback protection
 */
export function getSafeInteriorSpawn(floor: 1 | 2 | 3 = 1): { x: number; y: number; z: number; rotationY: number } {
  const spawn = { ...MAGE_TOWER_CONFIG.SAFE_INTERIOR_SPAWN };
  if (floor === 2) {
    spawn.y = MAGE_TOWER_CONFIG.FLOOR_HEIGHTS.LEVEL_2 + 1.0;
    spawn.z = -135.0;
  } else if (floor === 3) {
    spawn.y = MAGE_TOWER_CONFIG.FLOOR_HEIGHTS.LEVEL_3 + 1.0;
    spawn.z = -135.0;
  }

  if (!validateTeleportCoordinates(spawn)) {
    return { ...MAGE_TOWER_CONFIG.SAFE_INTERIOR_SPAWN };
  }
  return spawn;
}

/**
 * Returns safe exterior spawn point right in front of the outside tower door
 */
export function getSafeExteriorSpawn(terrainHeight?: number): { x: number; y: number; z: number; rotationY: number } {
  const base = { ...MAGE_TOWER_CONFIG.EXTERIOR_SAFE_SPAWN };
  if (terrainHeight !== undefined && Number.isFinite(terrainHeight)) {
    base.y = Math.max(0.5, terrainHeight + 0.5);
  }
  return base;
}

/**
 * Checks whether given coordinates reside inside the Mage Tower interior cell
 */
export function isInsideMageTowerInterior(x: number, y: number, z: number): boolean {
  if (y > -15) return false;
  const dist = Math.hypot(x - MAGE_TOWER_CONFIG.INTERIOR_CENTER.x, z - MAGE_TOWER_CONFIG.INTERIOR_CENTER.z);
  return dist <= 14.0;
}

/**
 * Calculates current interior floor elevation based on Y coordinate
 */
export function getMageTowerFloorHeight(y: number): number {
  if (y > -33.8) {
    return MAGE_TOWER_CONFIG.FLOOR_HEIGHTS.LEVEL_3;
  }
  if (y > -41.3) {
    return MAGE_TOWER_CONFIG.FLOOR_HEIGHTS.LEVEL_2;
  }
  return MAGE_TOWER_CONFIG.FLOOR_HEIGHTS.LEVEL_1;
}

/**
 * Enforces solid circular perimeter containment inside Mage Tower chamber
 */
export function constrainToMageTowerInterior(
  candidateX: number,
  candidateZ: number,
  playerRadius = 0.65
): { x: number; z: number } {
  const dx = candidateX - MAGE_TOWER_CONFIG.INTERIOR_CENTER.x;
  const dz = candidateZ - MAGE_TOWER_CONFIG.INTERIOR_CENTER.z;
  const dist = Math.hypot(dx, dz);
  const maxRadius = MAGE_TOWER_CONFIG.WALKABLE_RADIUS - playerRadius;

  if (dist > maxRadius && dist > 0.001) {
    return {
      x: MAGE_TOWER_CONFIG.INTERIOR_CENTER.x + (dx / dist) * maxRadius,
      z: MAGE_TOWER_CONFIG.INTERIOR_CENTER.z + (dz / dist) * maxRadius,
    };
  }
  return { x: candidateX, z: candidateZ };
}

export default MAGE_TOWER_CONFIG;
