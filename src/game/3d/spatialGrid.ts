/**
 * Lead WebGL Performance Architect & Procedural Terrain Engineer
 * 2D TypedArray Spatial Lookup Grid (O(1) Spatial Queries)
 * 
 * Replaces expensive curve math (splines, road segments, simplex noise) in vegetation
 * and prop distribution loops with precomputed Float32Array & Uint8Array lookups.
 * Sized 600 x 475 cells (2 units/cell) across world bounds X: [-600, 600], Z: [-600, 350].
 */

import { WORLD_BOUNDS, getBiomeAt, BRIDGE_CONFIGS, WORLD_LANDMARKS, isFarOcean, SEA_BED_HEIGHT } from './worldData';
import {
  RIVER_NW_BRANCH,
  RIVER_DESERT_BRANCH,
  RIVER_EAST_BRANCH,
  RIVER_SOUTH_BRANCH,
  isDesertBiome,
} from '../mapSampler';
import { getSampledRoads } from '../RoadSystem';
import { checkFrameBudget, yieldIfBudgetExceeded, yieldIfNeeded } from './frameBudget';

export const SPATIAL_CELL_SIZE = 4.0;
export const SPATIAL_MIN_X = WORLD_BOUNDS.minX; // -1650
export const SPATIAL_MAX_X = WORLD_BOUNDS.maxX; // 1450
export const SPATIAL_MIN_Z = WORLD_BOUNDS.minZ; // -1450
export const SPATIAL_MAX_Z = WORLD_BOUNDS.maxZ; // 1200

export const SPATIAL_COLS = Math.round((SPATIAL_MAX_X - SPATIAL_MIN_X) / SPATIAL_CELL_SIZE); // 775
export const SPATIAL_ROWS = Math.round((SPATIAL_MAX_Z - SPATIAL_MIN_Z) / SPATIAL_CELL_SIZE); // 663
export const SPATIAL_TOTAL_CELLS = SPATIAL_COLS * SPATIAL_ROWS;

// Bitmask Flags for Uint8Array
export const FLAG_BLOCKED_RIVER = 1 << 0;       // 1: < 18.0 units from river centerline
export const FLAG_BLOCKED_ROAD = 1 << 1;        // 2: < 6.5-7.0 units from road centerline
export const FLAG_BLOCKED_BRIDGE = 1 << 2;      // 4: near bridges
export const FLAG_BLOCKED_FARMYARD = 1 << 3;    // 8: farmyard cultivation zones
export const FLAG_BLOCKED_SETTLEMENT = 1 << 4;  // 16: village, castle, ruins, crater, etc.
export const FLAG_IS_DESERT = 1 << 5;           // 32: desert biome
export const FLAG_IS_OCEAN = 1 << 6;            // 64: ocean or water
export const FLAG_BLOCKED_GENERAL = 1 << 7;     // 128: general combined blocked flag

function distToSegmentSq(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) {
    const rx = px - ax;
    const rz = pz - az;
    return rx * rx + rz * rz;
  }
  let t = ((px - ax) * dx + (pz - az) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = px - (ax + t * dx);
  const cz = pz - (az + t * dz);
  return cx * cx + cz * cz;
}

export class SpatialLookupGrid {
  private static instance: SpatialLookupGrid | null = null;

  public heightGrid: Float32Array;
  public flagsGrid: Uint8Array;
  public isBuilt = false;

  constructor() {
    this.heightGrid = new Float32Array(SPATIAL_TOTAL_CELLS);
    this.flagsGrid = new Uint8Array(SPATIAL_TOTAL_CELLS);
  }

  public static get(): SpatialLookupGrid {
    if (!SpatialLookupGrid.instance) {
      SpatialLookupGrid.instance = new SpatialLookupGrid();
    }
    return SpatialLookupGrid.instance;
  }

  public getIndex(x: number, z: number): number {
    const col = Math.floor((x - SPATIAL_MIN_X) / SPATIAL_CELL_SIZE);
    const row = Math.floor((z - SPATIAL_MIN_Z) / SPATIAL_CELL_SIZE);
    if (col < 0 || col >= SPATIAL_COLS || row < 0 || row >= SPATIAL_ROWS) {
      return -1;
    }
    return row * SPATIAL_COLS + col;
  }

  public getHeight(x: number, z: number): number {
    const idx = this.getIndex(x, z);
    if (idx === -1) return -999;
    return this.heightGrid[idx];
  }

  public getFlags(x: number, z: number): number {
    const idx = this.getIndex(x, z);
    if (idx === -1) return FLAG_BLOCKED_GENERAL | FLAG_IS_OCEAN;
    return this.flagsGrid[idx];
  }

  public isBlocked(x: number, z: number): boolean {
    const idx = this.getIndex(x, z);
    if (idx === -1) return true;
    return (this.flagsGrid[idx] & FLAG_BLOCKED_GENERAL) !== 0;
  }

  public isDesert(x: number, z: number): boolean {
    const idx = this.getIndex(x, z);
    if (idx === -1) return false;
    return (this.flagsGrid[idx] & FLAG_IS_DESERT) !== 0;
  }

  public isOcean(x: number, z: number): boolean {
    const idx = this.getIndex(x, z);
    if (idx === -1) return true;
    return (this.flagsGrid[idx] & FLAG_IS_OCEAN) !== 0;
  }

  public isNearRiver(x: number, z: number): boolean {
    const idx = this.getIndex(x, z);
    if (idx === -1) return false;
    return (this.flagsGrid[idx] & FLAG_BLOCKED_RIVER) !== 0;
  }

  public isNearRoad(x: number, z: number): boolean {
    const idx = this.getIndex(x, z);
    if (idx === -1) return false;
    return (this.flagsGrid[idx] & FLAG_BLOCKED_ROAD) !== 0;
  }

  public isNearBridge(x: number, z: number): boolean {
    const idx = this.getIndex(x, z);
    if (idx === -1) return false;
    return (this.flagsGrid[idx] & FLAG_BLOCKED_BRIDGE) !== 0;
  }

  public markCircle(cx: number, cz: number, radius: number, flag: number): void {
    const radSq = radius * radius;
    const minCol = Math.max(0, Math.floor((cx - radius - SPATIAL_MIN_X) / SPATIAL_CELL_SIZE));
    const maxCol = Math.min(SPATIAL_COLS - 1, Math.floor((cx + radius - SPATIAL_MIN_X) / SPATIAL_CELL_SIZE));
    const minRow = Math.max(0, Math.floor((cz - radius - SPATIAL_MIN_Z) / SPATIAL_CELL_SIZE));
    const maxRow = Math.min(SPATIAL_ROWS - 1, Math.floor((cz + radius - SPATIAL_MIN_Z) / SPATIAL_CELL_SIZE));

    for (let row = minRow; row <= maxRow; row++) {
      const pz = SPATIAL_MIN_Z + (row + 0.5) * SPATIAL_CELL_SIZE;
      const rowOffset = row * SPATIAL_COLS;
      for (let col = minCol; col <= maxCol; col++) {
        const px = SPATIAL_MIN_X + (col + 0.5) * SPATIAL_CELL_SIZE;
        const dx = px - cx;
        const dz = pz - cz;
        if (dx * dx + dz * dz <= radSq) {
          this.flagsGrid[rowOffset + col] |= flag;
        }
      }
    }
  }

  public markBox(minX: number, maxX: number, minZ: number, maxZ: number, flag: number): void {
    const minCol = Math.max(0, Math.floor((minX - SPATIAL_MIN_X) / SPATIAL_CELL_SIZE));
    const maxCol = Math.min(SPATIAL_COLS - 1, Math.floor((maxX - SPATIAL_MIN_X) / SPATIAL_CELL_SIZE));
    const minRow = Math.max(0, Math.floor((minZ - SPATIAL_MIN_Z) / SPATIAL_CELL_SIZE));
    const maxRow = Math.min(SPATIAL_ROWS - 1, Math.floor((maxZ - SPATIAL_MIN_Z) / SPATIAL_CELL_SIZE));

    for (let row = minRow; row <= maxRow; row++) {
      const rowOffset = row * SPATIAL_COLS;
      for (let col = minCol; col <= maxCol; col++) {
        this.flagsGrid[rowOffset + col] |= flag;
      }
    }
  }

  public hydrate(heightGrid: Float32Array, flagsGrid: Uint8Array): boolean {
    if (
      heightGrid.length !== SPATIAL_TOTAL_CELLS ||
      flagsGrid.length !== SPATIAL_TOTAL_CELLS
    ) {
      return false;
    }
    this.heightGrid.set(heightGrid);
    this.flagsGrid.set(flagsGrid);
    this.isBuilt = true;
    return true;
  }

  public async buildAsync(
    getTerrainHeight: (x: number, z: number) => number,
    onProgress?: (percent: number, statusText: string) => void
  ): Promise<void> {
    if (this.isBuilt) return;

    this.flagsGrid.fill(0);
    this.heightGrid.fill(0);

    // 1. Rasterize Roads (9.5 unit strict Road Clearance Zone)
    const roads = getSampledRoads();
    const roadMargin = 9.5;
    const roadMarginSq = roadMargin * roadMargin;
    for (let r = 0; r < roads.length; r++) {
      const pts = roads[r].coarsePoints2D;
      for (let i = 0; i < pts.length - 1; i++) {
        const x0 = pts[i][0], z0 = pts[i][1];
        const x1 = pts[i + 1][0], z1 = pts[i + 1][1];
        const minC = Math.max(0, Math.floor((Math.min(x0, x1) - roadMargin - SPATIAL_MIN_X) / SPATIAL_CELL_SIZE));
        const maxC = Math.min(SPATIAL_COLS - 1, Math.floor((Math.max(x0, x1) + roadMargin - SPATIAL_MIN_X) / SPATIAL_CELL_SIZE));
        const minR = Math.max(0, Math.floor((Math.min(z0, z1) - roadMargin - SPATIAL_MIN_Z) / SPATIAL_CELL_SIZE));
        const maxR = Math.min(SPATIAL_ROWS - 1, Math.floor((Math.max(z0, z1) + roadMargin - SPATIAL_MIN_Z) / SPATIAL_CELL_SIZE));

        for (let row = minR; row <= maxR; row++) {
          const pz = SPATIAL_MIN_Z + (row + 0.5) * SPATIAL_CELL_SIZE;
          const rowOff = row * SPATIAL_COLS;
          for (let col = minC; col <= maxC; col++) {
            const px = SPATIAL_MIN_X + (col + 0.5) * SPATIAL_CELL_SIZE;
            if (distToSegmentSq(px, pz, x0, z0, x1, z1) <= roadMarginSq) {
              this.flagsGrid[rowOff + col] |= (FLAG_BLOCKED_ROAD | FLAG_BLOCKED_GENERAL);
            }
          }
        }
      }
    }

    // 2. Rasterize River Splines (STRICT 18 UNIT EXCLUSION ZONE)
    const riverBranches = [RIVER_NW_BRANCH, RIVER_DESERT_BRANCH, RIVER_EAST_BRANCH, RIVER_SOUTH_BRANCH];
    const riverMargin = 18.0;
    const riverMarginSq = riverMargin * riverMargin;
    for (let b = 0; b < riverBranches.length; b++) {
      const branch = riverBranches[b];
      for (let i = 0; i < branch.length - 1; i++) {
        const x0 = branch[i][0], z0 = branch[i][1];
        const x1 = branch[i + 1][0], z1 = branch[i + 1][1];
        const minC = Math.max(0, Math.floor((Math.min(x0, x1) - riverMargin - SPATIAL_MIN_X) / SPATIAL_CELL_SIZE));
        const maxC = Math.min(SPATIAL_COLS - 1, Math.floor((Math.max(x0, x1) + riverMargin - SPATIAL_MIN_X) / SPATIAL_CELL_SIZE));
        const minR = Math.max(0, Math.floor((Math.min(z0, z1) - riverMargin - SPATIAL_MIN_Z) / SPATIAL_CELL_SIZE));
        const maxR = Math.min(SPATIAL_ROWS - 1, Math.floor((Math.max(z0, z1) + riverMargin - SPATIAL_MIN_Z) / SPATIAL_CELL_SIZE));

        for (let row = minR; row <= maxR; row++) {
          const pz = SPATIAL_MIN_Z + (row + 0.5) * SPATIAL_CELL_SIZE;
          const rowOff = row * SPATIAL_COLS;
          for (let col = minC; col <= maxC; col++) {
            const px = SPATIAL_MIN_X + (col + 0.5) * SPATIAL_CELL_SIZE;
            if (distToSegmentSq(px, pz, x0, z0, x1, z1) <= riverMarginSq) {
              this.flagsGrid[rowOff + col] |= (FLAG_BLOCKED_RIVER | FLAG_BLOCKED_GENERAL);
            }
          }
        }
      }
    }

    // 3. Mark Bridges
    for (const b of BRIDGE_CONFIGS) {
      this.markCircle(b.x, b.z, (b.length * 0.5) + 6.0, FLAG_BLOCKED_BRIDGE | FLAG_BLOCKED_GENERAL);
    }

    // 4. Mark Settlements, Castles, Landmarks & Islands dynamically
    for (const lm of WORLD_LANDMARKS) {
      this.markCircle(lm.x, lm.z, 45.0, FLAG_BLOCKED_SETTLEMENT | FLAG_BLOCKED_GENERAL);
    }

    // 6. Mark Farmyards (Dry Sanctuary Southwest Plains)
    this.markBox(-66, -42, -46, -29, FLAG_BLOCKED_FARMYARD | FLAG_BLOCKED_GENERAL);
    this.markBox(-66, -42, -28, -11, FLAG_BLOCKED_FARMYARD | FLAG_BLOCKED_GENERAL);
    this.markBox(-41, -22, -28, -11, FLAG_BLOCKED_FARMYARD | FLAG_BLOCKED_GENERAL);

    // 7. Grid Heights & Biomes Sampling with Time-Slicing
    for (let row = 0; row < SPATIAL_ROWS; row++) {
      const pz = SPATIAL_MIN_Z + (row + 0.5) * SPATIAL_CELL_SIZE;
      const rowOff = row * SPATIAL_COLS;

      for (let col = 0; col < SPATIAL_COLS; col++) {
        const px = SPATIAL_MIN_X + (col + 0.5) * SPATIAL_CELL_SIZE;
        const idx = rowOff + col;

        // Fast O(1) far ocean check: skips 70%+ of cells across the 3100x2650 map
        if (isFarOcean(px, pz)) {
          this.heightGrid[idx] = SEA_BED_HEIGHT;
          this.flagsGrid[idx] |= (FLAG_IS_OCEAN | FLAG_BLOCKED_GENERAL);
          continue;
        }

        // Desert biome
        if (isDesertBiome(px, pz)) {
          this.flagsGrid[idx] |= FLAG_IS_DESERT;
        }

        // Sample terrain height
        const y = getTerrainHeight(px, pz);
        this.heightGrid[idx] = y;

        // Ocean or below water line
        if (y < 0.2 || (px < -460 && pz > 190) || getBiomeAt(px, pz) === 'ocean') {
          this.flagsGrid[idx] |= (FLAG_IS_OCEAN | FLAG_BLOCKED_GENERAL);
        }
      }

      // Check frame budget every 2 rows (~1,200 cells) with strict 8ms macrotask budget
      if (row % 2 === 0) {
        await yieldIfNeeded(8);
        if (onProgress) {
          const pct = 26 + Math.round((row / SPATIAL_ROWS) * 6);
          onProgress(pct, 'Membangun Spatial Lookup Grid & Heightmap (TypedArray)...');
        }
      }
    }

    this.isBuilt = true;
  }
}

export const spatialLookupGrid = SpatialLookupGrid.get();
