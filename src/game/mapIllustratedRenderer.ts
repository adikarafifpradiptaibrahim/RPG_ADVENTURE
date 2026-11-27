/**
 * High-Resolution Vector Illustrated World Map Renderer
 * Single Source of Truth: Driven 100% by src/game/3d/worldData.ts
 *
 * Renders:
 * 1. Deep Azure Ocean background (#0284c7) with gentle southern wave ripples
 * 2. Continental Silhouette & Shoreline with warm sandy beach fringe (#fef08a / #fde047)
 * 3. Vibrant Eldoria Grasslands (#65a30d / #70a827) with gentle contour lines
 * 4. Solaria Golden Desert with rolling dunes & sunlight crest highlights
 * 5. Ancient Canyon with stratified terracotta mesas & drop shadows
 * 6. Northwest Snowy Mountains & Glacial Titan Lake with center islet
 * 7. Eastern Green Mountains framing Moss Valley
 * 8. Eldoria Mist Forest with deep dark canopies and atmospheric floating mist clouds
 * 9. Ancient Sandworm Sinkhole / World Boss Crater with concentric rings & fissures
 * 10. Sultan Malik's Grand Palace with golden onion dome & minarets
 * 11. Astraea Imperial Castle & Sun Palace with stone curtain walls & golden cones
 * 12. Abandoned Castle Ruins with broken battlements
 * 13. Fortress Village Val-Kragor with timber palisades & red-roofed keep
 * 14. Moss Rock Valley with moss-capped standing megaliths
 * 15. Sanctuary Village (thatched cottages & red Torii gate) & Sanctuary Harbor (piers & ships)
 * 16. Dragonfang Caldera volcanic island with fiery molten lava pit
 * 17. Jembatan Dermaga Kayu Kaldera Naga (-70, 225) -> (-70, 300)
 * 18. 4-Branch Meandering River Network (RIVER_SPLINES) with dark banks & light water
 * 19. Road Network (ROAD_SPLINES) with dashed lines
 * 20. Wooden Bridges (BRIDGE_CONFIGS) across river intersections
 * 21. Clean Outlined Landmark Titles (white text + crisp black outline, 26px above/below pins)
 */

import {
  WORLD_BOUNDS,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  WORLD_LANDMARKS,
  RIVER_SPLINES,
  ROAD_SPLINES,
  BRIDGE_CONFIGS,
  worldToMapPercent,
  LandmarkDef,
  getBiomeAt,
  getProceduralContinentHeight,
} from './3d/worldData';

let cachedTerrainRasterCanvas: HTMLCanvasElement | null = null;

export function getCachedTerrainRasterCanvas(): HTMLCanvasElement | null {
  return cachedTerrainRasterCanvas;
}

/**
 * Mengisi cache raster peta 512x512 langsung dari Blob IndexedDB tanpa mengulang rasterisasi CPU.
 */
export async function hydrateWorldMapRasterFromBlob(blob: Blob): Promise<boolean> {
  if (typeof document === 'undefined' || !blob || blob.size === 0) return false;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(blob);
      ctx.drawImage(bitmap, 0, 0, 512, 512);
      bitmap.close();
      cachedTerrainRasterCanvas = canvas;
      return true;
    }

    return await new Promise<boolean>((resolve) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, 512, 512);
        URL.revokeObjectURL(url);
        cachedTerrainRasterCanvas = canvas;
        resolve(true);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(false);
      };
      img.src = url;
    });
  } catch (err) {
    console.warn('[MapRenderer] Gagal memuat raster peta dari cache Blob:', err);
    return false;
  }
}

/**
 * Mengekspor hasil rasterisasi peta 512x512 menjadi Blob biner untuk disimpan di IndexedDB.
 */
export async function exportWorldMapRasterToBlob(): Promise<Blob | null> {
  const canvas = getOrCreateTerrainRasterCanvas();
  if (!canvas) return null;

  return new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    } catch {
      resolve(null);
    }
  });
}

export function getOrCreateTerrainRasterCanvas(): HTMLCanvasElement | null {
  if (cachedTerrainRasterCanvas) return cachedTerrainRasterCanvas;
  if (typeof document === 'undefined') return null;

  const rasterW = 512;
  const rasterH = 512;
  const canvas = document.createElement('canvas');
  canvas.width = rasterW;
  canvas.height = rasterH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imgData = ctx.createImageData(rasterW, rasterH);
  const data = imgData.data;
  const SEA_LEVEL = 0.0;

  for (let gy = 0; gy < rasterH; gy++) {
    const normZ = (gy + 0.5) / rasterH;
    const wz = WORLD_BOUNDS.minZ + normZ * WORLD_HEIGHT;

    for (let gx = 0; gx < rasterW; gx++) {
      const normX = (gx + 0.5) / rasterW;
      const wx = WORLD_BOUNDS.minX + normX * WORLD_WIDTH;
      const idx = (gy * rasterW + gx) * 4;

      const biome = getBiomeAt(wx, wz);
      let r = 2, g = 132, b = 199; // Azure Ocean #0284c7

      if (biome === 'ocean') {
        r = 2; g = 132; b = 199;
      } else if (biome === 'lake') {
        r = 56; g = 189; b = 248; // #38bdf8 Titan Lake
      } else if (biome === 'volcano') {
        const distDragon = Math.hypot(wx - 40, wz - 840);
        if (distDragon < 24) {
          r = 220; g = 38; b = 38; // Molten lava core #dc2626
        } else {
          r = 39; g = 39; b = 42; // Volcanic dark basalt #27272a
        }
      } else {
        const h = getProceduralContinentHeight(wx, wz);
        if (h <= SEA_LEVEL) {
          r = 2; g = 132; b = 199; // Azure ocean
        } else if (h <= SEA_LEVEL + 0.45 && biome !== 'snow') {
          // STRICT Shore Beach Ribbon: HANYA pada pita tipis height > SEA_LEVEL && height <= SEA_LEVEL + 0.45
          r = 230; g = 210; b = 150; // #e6d296
        } else if (biome === 'snow') {
          // Pure bright snow white (#f2f7fb)
          r = 242; g = 247; b = 251;
        } else {
          // Warna Tegas Bioma: Gurun (#e2be6e..#d4a64c) vs Padang Rumput/Hutan (#569e46..#438537)
          const duneNoise = 0.5 + 0.5 * Math.sin(wx * 0.035 + wz * 0.028);
          const dr = 212 + (226 - 212) * duneNoise;
          const dg = 166 + (190 - 166) * duneNoise;
          const db = 76 + (110 - 76) * duneNoise;

          const grassNoise = 0.5 + 0.5 * Math.sin(wx * 0.025 - wz * 0.03);
          let gr = 67 + (86 - 67) * grassNoise;
          let gg = 133 + (158 - 133) * grassNoise;
          let gb = 55 + (70 - 55) * grassNoise;
          if (wx > 340 && wz < -80 && wz > -200) {
            // Forest dark lush green accent (#438537)
            gr = 54; gg = 122; gb = 48;
          }

          const wave = Math.sin(wz * 0.006) * 110 + Math.cos(wz * 0.015) * 35;
          const warp = Math.sin(wx * 0.01 + wz * 0.012) * 45;
          const boundaryDist = (wx + wave + warp) - (-240);

          if (wz < 180 && Math.abs(boundaryDist) <= 15) {
            const t = Math.max(0, Math.min(1, (boundaryDist + 15) / 30));
            const blend = t * t * (3 - 2 * t);
            r = Math.round(dr * (1 - blend) + gr * blend);
            g = Math.round(dg * (1 - blend) + gg * blend);
            b = Math.round(db * (1 - blend) + gb * blend);
          } else if (biome === 'desert') {
            r = Math.round(dr);
            g = Math.round(dg);
            b = Math.round(db);
          } else {
            r = Math.round(gr);
            g = Math.round(gg);
            b = Math.round(gb);
          }
        }
      }

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  cachedTerrainRasterCanvas = canvas;
  return canvas;
}

export function worldToCanvas(wx: number, wz: number, width: number, height: number): [number, number] {
  const normX = (wx - WORLD_BOUNDS.minX) / WORLD_WIDTH;
  const normZ = (wz - WORLD_BOUNDS.minZ) / WORLD_HEIGHT;
  return [normX * width, normZ * height];
}

export function normToCanvas(nx: number, ny: number, width: number, height: number): [number, number] {
  return [nx * width, ny * height];
}

/**
 * Draws a smooth Catmull-Rom spline through an array of 2D points.
 */
function drawSmoothSpline(ctx: CanvasRenderingContext2D, points: [number, number][], close = false) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2[0], p2[1]);
  }

  if (close) {
    ctx.closePath();
  }
}

/**
 * Renders crisp outlined typography: pure white fill with a thick black stroke (#0f172a).
 * Guarantees high readability on any background with ZERO ugly black boxes.
 */
export function drawOutlinedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize = 12,
  color = '#ffffff',
  align: CanvasTextAlign = 'center'
) {
  ctx.save();
  ctx.font = `bold ${fontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';

  // Thick crisp dark stroke
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = Math.max(3.2, fontSize * 0.28);
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeText(text, x, y);

  // Pure white fill
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/**
 * MASTER RENDER FUNCTION
 * Draws the high-res illustrated map onto any 2D canvas context.
 */
export function renderIllustratedMap(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const wToC = (wx: number, wz: number): [number, number] => worldToCanvas(wx, wz, width, height);

  // Proyeksi koordinat ternormalisasi lawas [1200 x 950] ke koordinat dunia presisi
  const oldNormToWorld = (nx: number, ny: number): [number, number] => [
    -600 + nx * 1200,
    -600 + ny * 950,
  ];
  const toC = (nx: number, ny: number): [number, number] => {
    const [wx, wz] = oldNormToWorld(nx, ny);
    return wToC(wx, wz);
  };

  // ==========================================================================
  // 1. AZURE OCEAN BACKGROUND
  // ==========================================================================
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#0284c7');
  oceanGrad.addColorStop(0.65, '#0284c7');
  oceanGrad.addColorStop(1, '#0369a1');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle wave ripple arcs in the southern ocean waters
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 1.3;
  const rippleZones: { pos: [number, number]; r: number }[] = [
    { pos: toC(0.18, 0.86), r: width * 0.045 },
    { pos: toC(0.32, 0.88), r: width * 0.055 },
    { pos: toC(0.65, 0.86), r: width * 0.060 },
    { pos: toC(0.78, 0.90), r: width * 0.050 },
    { pos: toC(0.12, 0.92), r: width * 0.040 },
    { pos: toC(0.92, 0.72), r: width * 0.045 },
    { pos: wToC(-650, 480), r: width * 0.050 },
    { pos: wToC(-380, 800), r: width * 0.060 },
    { pos: wToC(-120, 1020), r: width * 0.045 },
  ];
  rippleZones.forEach(({ pos, r }) => {
    ctx.beginPath();
    ctx.ellipse(pos[0], pos[1], r, r * 0.32, 0, 0, Math.PI * 2);
    ctx.stroke();
  });

  // ==========================================================================
  // 2. CONTINENTAL LANDMASS & BIOMES RASTERIZED BASE (SINGLE SOURCE OF TRUTH)
  // Direct sampling from 3D world: getProceduralContinentHeight & getBiomeAt
  // Eliminates all overflowing desert splines, sharp triangles, and mismatched coastlines.
  // ==========================================================================
  const terrainRaster = getOrCreateTerrainRasterCanvas();
  if (terrainRaster) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(terrainRaster, 0, 0, width, height);
    ctx.restore();
  }

  // Rolling Sand Dune Curves in West Desert
  ctx.save();
  const duneCurves: [number, number][][] = [
    [[-200, -700], [-260, -720], [-320, -700]],
    [[-220, -580], [-280, -600], [-340, -580]],
    [[-360, -640], [-420, -660], [-480, -640]],
    [[-200, -440], [-260, -460], [-320, -440]],
    [[-360, -500], [-420, -520], [-480, -500]],
    [[-220, -300], [-280, -320], [-340, -300]],
    [[-380, -360], [-440, -380], [-500, -360]],
    [[-480, -240], [-540, -260], [-600, -240]],
    [[-260, -180], [-320, -200], [-380, -180]],
    [[-400, -180], [-460, -200], [-520, -180]],
    [[-660, -380], [-720, -400], [-780, -380]],
    [[-680, -200], [-740, -220], [-800, -200]],
    [[-900, -340], [-960, -360], [-1020, -340]],
  ];
  duneCurves.forEach((d) => {
    const pts = d.map((p) => wToC(p[0], p[1]));
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.8;
    drawSmoothSpline(ctx, pts);
    ctx.stroke();

    // Sunlight crest highlight
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1] - 1);
    ctx.lineTo(pts[1][0], pts[1][1] - 1);
    ctx.lineTo(pts[2][0], pts[2][1] - 1);
    ctx.stroke();
  });
  ctx.restore();

  // ==========================================================================
  // 4. KANYON KUNO (NORTH-WEST RED CANYON MESAS & STRATIFIED CLIFFS)
  // Center: [-380, -640] (100% di atas Daratan Pasir Kering Gurun)
  // ==========================================================================
  ctx.save();
  const canyonCenter = wToC(-380, -640);
  const mesaBlocks = [
    { ox: -40, oy: -15, w: 46, h: 34 },
    { ox: 0, oy: -20, w: 52, h: 38 },
    { ox: 44, oy: -14, w: 48, h: 34 },
    { ox: -20, oy: 16, w: 42, h: 28 },
    { ox: 26, oy: 18, w: 46, h: 30 },
  ];
  mesaBlocks.forEach((m) => {
    const mx = canyonCenter[0] + m.ox;
    const my = canyonCenter[1] + m.oy;

    // Drop shadow
    ctx.fillStyle = 'rgba(69, 26, 3, 0.45)';
    ctx.fillRect(mx - m.w / 2 + 2, my - m.h / 2 + 3, m.w, m.h);

    // Terracotta cliff face
    const mesaGrad = ctx.createLinearGradient(mx, my - m.h / 2, mx, my + m.h / 2);
    mesaGrad.addColorStop(0, '#ea580c');
    mesaGrad.addColorStop(0.5, '#c2410c');
    mesaGrad.addColorStop(1, '#9a3412');
    ctx.fillStyle = mesaGrad;
    ctx.beginPath();
    ctx.roundRect(mx - m.w / 2, my - m.h / 2, m.w, m.h, 4);
    ctx.fill();

    // Strata geological lines
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(mx - m.w / 2 + 2, my);
    ctx.lineTo(mx + m.w / 2 - 2, my);
    ctx.moveTo(mx - m.w / 2 + 4, my + m.h * 0.25);
    ctx.lineTo(mx + m.w / 2 - 4, my + m.h * 0.25);
    ctx.stroke();

    // Top rim highlight
    ctx.strokeStyle = '#fdba74';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(mx - m.w / 2, my - m.h / 2);
    ctx.lineTo(mx + m.w / 2, my - m.h / 2);
    ctx.stroke();
  });
  ctx.restore();

  // ==========================================================================
  // 5. NORTH HIGHLANDS SNOWY MOUNTAINS & TITAN LAKE
  // Titan Lake center: [80, -760]
  // Rangkaian puncak salju melingkari penuh sisi barat, utara, dan timur Danau Titan
  // ==========================================================================
  ctx.save();
  const snowPeakWorldCoords: [number, number, number, number][] = [
    [-120, -820, 70, 55],
    [-60, -850, 75, 60],
    [10, -870, 80, 65],
    [80, -880, 85, 68],
    [150, -870, 80, 65],
    [220, -850, 75, 60],
    [280, -820, 70, 55],
    [-110, -740, 65, 50],
    [-90, -670, 60, 48],
    [260, -740, 65, 50],
    [270, -670, 60, 48],
  ];
  snowPeakWorldCoords.forEach(([wx, wz, pw, ph]) => {
    const [px, py] = wToC(wx, wz);

    // Mountain body
    ctx.beginPath();
    ctx.moveTo(px, py - ph);
    ctx.lineTo(px + pw / 2, py);
    ctx.lineTo(px - pw / 2, py);
    ctx.closePath();
    ctx.fillStyle = '#64748b';
    ctx.fill();

    // Shadowed slope (East/Right half)
    ctx.beginPath();
    ctx.moveTo(px, py - ph);
    ctx.lineTo(px + pw / 2, py);
    ctx.lineTo(px, py);
    ctx.closePath();
    ctx.fillStyle = '#475569';
    ctx.fill();

    // Snow Cap
    ctx.beginPath();
    ctx.moveTo(px, py - ph);
    ctx.lineTo(px + pw * 0.22, py - ph * 0.55);
    ctx.lineTo(px + pw * 0.08, py - ph * 0.50);
    ctx.lineTo(px - pw * 0.10, py - ph * 0.58);
    ctx.lineTo(px - pw * 0.22, py - ph * 0.55);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Ancient Titan Alpine Lake [60, -820]
  const [tlx, tly] = wToC(60, -820);
  const tlrX = width * 0.045;
  const tlrY = height * 0.038;

  // Shore rim
  ctx.beginPath();
  ctx.ellipse(tlx, tly, tlrX + 4, tlrY + 3, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#e0f2fe';
  ctx.fill();

  // Lake water fill
  ctx.beginPath();
  ctx.ellipse(tlx, tly, tlrX, tlrY, 0, 0, Math.PI * 2);
  const lakeGrad = ctx.createRadialGradient(tlx, tly, 4, tlx, tly, tlrX);
  lakeGrad.addColorStop(0, '#38bdf8');
  lakeGrad.addColorStop(1, '#0284c7');
  ctx.fillStyle = lakeGrad;
  ctx.fill();
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Center islet in Titan Lake
  ctx.beginPath();
  ctx.ellipse(tlx, tly, tlrX * 0.22, tlrY * 0.22, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#15803d';
  ctx.fill();
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // ==========================================================================
  // 6. EASTERN GREEN MOUNTAIN RIDGES
  // Mengapit Lembah Batu Lumut [600, -120] dan Pesisir Timur
  // ==========================================================================
  ctx.save();
  const greenPeaks: [number, number, number, number][] = [
    [690, -260, 60, 48],
    [720, -190, 56, 44],
    [690, -120, 58, 46],
    [710, -50, 54, 42],
    [680, 20, 56, 44],
    [650, 80, 52, 40],
  ];
  greenPeaks.forEach(([wx, wz, pw, ph]) => {
    const [px, py] = wToC(wx, wz);

    ctx.beginPath();
    ctx.moveTo(px, py - ph);
    ctx.lineTo(px + pw / 2, py);
    ctx.lineTo(px - pw / 2, py);
    ctx.closePath();
    ctx.fillStyle = '#4d7c0f';
    ctx.fill();

    // Shaded side
    ctx.beginPath();
    ctx.moveTo(px, py - ph);
    ctx.lineTo(px + pw / 2, py);
    ctx.lineTo(px, py);
    ctx.closePath();
    ctx.fillStyle = '#365314';
    ctx.fill();
  });
  ctx.restore();

  // ==========================================================================
  // 7. SOUTHWEST LUSH FOREST (OAK TREE CLUSTERS)
  // ==========================================================================
  ctx.save();
  const swTrees: [number, number, number][] = [
    [0, 10, 12], [30, 20, 14], [60, 15, 13], [80, 25, 15],
    [-20, 30, 14], [10, 40, 16], [50, 45, 14], [70, 50, 13],
    [-10, 60, 13], [20, 65, 15], [40, 70, 14], [60, 75, 12],
  ];
  swTrees.forEach(([wx, wz, r]) => {
    const [cx, cy] = wToC(wx, wz);

    // Drop shadow
    ctx.fillStyle = 'rgba(20, 40, 15, 0.35)';
    ctx.beginPath();
    ctx.arc(cx + 2, cy + 2, r, 0, Math.PI * 2);
    ctx.fill();

    // Canopy layers
    ctx.fillStyle = '#1b4d20';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2d8a3e';
    ctx.beginPath();
    ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.75, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(cx - r * 0.35, cy - r * 0.35, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // ==========================================================================
  // 8. ELDORIA MIST FOREST (EAST CANOPY & CLOUD COVER)
  // Center: [760, -280]
  // ==========================================================================
  ctx.save();
  const [mfx, mfy] = wToC(760, -280);
  const mfr = width * 0.045;

  const mistForestClusters = [
    [mfx - mfr * 0.40, mfy - mfr * 0.30, mfr * 0.50],
    [mfx + mfr * 0.40, mfy - mfr * 0.35, mfr * 0.52],
    [mfx, mfy, mfr * 0.65],
    [mfx - mfr * 0.45, mfy + mfr * 0.30, mfr * 0.55],
    [mfx + mfr * 0.40, mfy + mfr * 0.35, mfr * 0.52],
    [mfx, mfy - mfr * 0.50, mfr * 0.45],
    [mfx, mfy + mfr * 0.50, mfr * 0.48],
  ];
  mistForestClusters.forEach(([cx, cy, r]) => {
    ctx.fillStyle = '#14532d';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
  });

  // Soft mystical mist clouds floating across the canopy
  ctx.fillStyle = 'rgba(255, 255, 255, 0.48)';
  const mistPuffs = [
    [mfx - mfr * 0.20, mfy - mfr * 0.10, mfr * 0.48, mfr * 0.26],
    [mfx + mfr * 0.20, mfy + mfr * 0.10, mfr * 0.50, mfr * 0.28],
    [mfx, mfy, mfr * 0.58, mfr * 0.32],
  ];
  mistPuffs.forEach(([cx, cy, rx, ry]) => {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // ==========================================================================
  // 9. ORGANIC MEANDERING RIVERS (4 BRANCHES)
  // Driven 100% by RIVER_SPLINES in worldData.ts
  // ==========================================================================
  ctx.save();
  const riverBranches = RIVER_SPLINES.map((s) => s.points.map((p) => wToC(p[0], p[1])));

  // Pass 1: Dark Blue Edge
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = Math.max(5.5, width * 0.009);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  riverBranches.forEach((b) => {
    drawSmoothSpline(ctx, b);
    ctx.stroke();
  });

  // Pass 2: Light Blue Water Body
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = Math.max(3.6, width * 0.006);
  riverBranches.forEach((b) => {
    drawSmoothSpline(ctx, b);
    ctx.stroke();
  });

  // Pass 3: Delicate Water Shimmer
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 1.3;
  riverBranches.forEach((b) => {
    drawSmoothSpline(ctx, b);
    ctx.stroke();
  });
  ctx.restore();

  // ==========================================================================
  // 10. WOODEN BRIDGES & CALDERA PIER BRIDGE
  // Driven 100% by BRIDGE_CONFIGS in worldData.ts
  // ==========================================================================
  ctx.save();
  BRIDGE_CONFIGS.forEach((br) => {
    const [bx, by] = wToC(br.x, br.z);
    const bLen = Math.max(18, width * 0.024);
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(-br.rotationY);

    // Standard Bridge spanning perpendicularly across river
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(-bLen / 2 - 1, -5, bLen + 2, 10);

    ctx.fillStyle = br.type === 'stone' ? '#94a3b8' : '#854d0e';
    ctx.fillRect(-bLen / 2, -4, bLen, 8);

    ctx.strokeStyle = br.type === 'stone' ? '#475569' : '#451a03';
    ctx.lineWidth = 1.0;
    for (let px = -bLen / 2 + 2; px <= bLen / 2 - 2; px += 3) {
      ctx.beginPath();
      ctx.moveTo(px, -4);
      ctx.lineTo(px, 4);
      ctx.stroke();
    }

    ctx.strokeStyle = br.type === 'stone' ? '#334155' : '#713f12';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-bLen / 2, -4);
    ctx.lineTo(bLen / 2, -4);
    ctx.moveTo(-bLen / 2, 4);
    ctx.lineTo(bLen / 2, 4);
    ctx.stroke();

    ctx.restore();
  });
  ctx.restore();

  // ==========================================================================
  // 11. ROAD NETWORK (ROADS OVER CONTINENT)
  // Driven 100% by ROAD_SPLINES in worldData.ts
  // ==========================================================================
  ctx.save();
  ROAD_SPLINES.forEach((road) => {
    const pts = road.points.map((p) => wToC(p[0], p[1]));
    const isDesert = road.id.includes('solaria') || road.id.includes('desert');

    ctx.strokeStyle = isDesert ? 'rgba(180, 130, 50, 0.45)' : 'rgba(74, 54, 38, 0.45)';
    ctx.lineWidth = isDesert ? 3.6 : 4.0;
    drawSmoothSpline(ctx, pts);
    ctx.stroke();

    ctx.strokeStyle = isDesert ? '#d9be8b' : '#a3917a';
    ctx.lineWidth = isDesert ? 2.2 : 2.4;
    ctx.setLineDash([5, 4]);
    drawSmoothSpline(ctx, pts);
    ctx.stroke();
    ctx.setLineDash([]);
  });
  ctx.restore();

  // ==========================================================================
  // 12. ILLUSTRATED LANDMARK STRUCTURES & FEATURES
  // ==========================================================================
  ctx.save();

  // 12A. Golden Pyramids [-360, -520]
  const [pyrX, pyrY] = wToC(-360, -520);
  ctx.beginPath();
  ctx.moveTo(pyrX, pyrY - 16);
  ctx.lineTo(pyrX + 18, pyrY + 7);
  ctx.lineTo(pyrX - 18, pyrY + 7);
  ctx.closePath();
  ctx.fillStyle = '#eab308';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(pyrX, pyrY - 16);
  ctx.lineTo(pyrX + 18, pyrY + 7);
  ctx.lineTo(pyrX + 2, pyrY + 7);
  ctx.closePath();
  ctx.fillStyle = '#ca8a04';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(pyrX + 20, pyrY - 7);
  ctx.lineTo(pyrX + 34, pyrY + 9);
  ctx.lineTo(pyrX + 9, pyrY + 9);
  ctx.closePath();
  ctx.fillStyle = '#fde047';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(pyrX + 20, pyrY - 7);
  ctx.lineTo(pyrX + 34, pyrY + 9);
  ctx.lineTo(pyrX + 22, pyrY + 9);
  ctx.closePath();
  ctx.fillStyle = '#b45309';
  ctx.fill();

  // 12B. Solaria Oasis Pool & Palms [-420, -350]
  const [oasX, oasY] = wToC(-420, -350);
  ctx.fillStyle = '#06b6d4';
  ctx.beginPath();
  ctx.ellipse(oasX, oasY, 15, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 1.3;
  ctx.stroke();

  // Palm trees
  const palmCoords = [
    [oasX - 11, oasY - 5],
    [oasX + 9, oasY - 7],
    [oasX + 12, oasY + 4],
  ];
  palmCoords.forEach(([px, py]) => {
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(px, py + 8);
    ctx.quadraticCurveTo(px + 2, py + 3, px, py);
    ctx.stroke();

    ctx.fillStyle = '#16a34a';
    for (let a = 0; a < 5; a++) {
      const ang = (a / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(px + Math.cos(ang) * 4, py + Math.sin(ang) * 4, 4.5, 1.8, ang, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // 12C. World Boss Colosseum Titan Kuno [180, -560]
  const [cratX, cratY] = wToC(180, -560);
  ctx.fillStyle = '#9a3412';
  ctx.beginPath();
  ctx.ellipse(cratX, cratY, 34, 23, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#7c2d12';
  ctx.beginPath();
  ctx.ellipse(cratX, cratY, 25, 17, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#451a03';
  ctx.beginPath();
  ctx.ellipse(cratX, cratY, 15, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Crater fissures
  ctx.strokeStyle = '#291003';
  ctx.lineWidth = 1.3;
  for (let f = 0; f < 6; f++) {
    const ang = (f / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cratX + Math.cos(ang) * 15, cratY + Math.sin(ang) * 10);
    ctx.lineTo(cratX + Math.cos(ang) * 36, cratY + Math.sin(ang) * 24);
    ctx.stroke();
  }

  // 12C2. Sandworm Sinkhole Vortex (Kawah Pusaran Solaria [-840, -260])
  const [swX, swY] = wToC(-840, -260);
  ctx.fillStyle = '#b45309';
  ctx.beginPath();
  ctx.ellipse(swX, swY, 26, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.ellipse(swX, swY, 15, 10.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 12C2. Solaria Desert Village & Bazaar [-540, -420]
  const [desVilX, desVilY] = wToC(-540, -420);
  ctx.fillStyle = '#b45309';
  // Adobe mudbrick houses cluster
  ctx.fillRect(desVilX - 12, desVilY - 8, 10, 8);
  ctx.fillRect(desVilX + 3, desVilY - 9, 11, 9);
  ctx.fillRect(desVilX - 8, desVilY + 3, 9, 8);
  ctx.fillRect(desVilX + 4, desVilY + 4, 10, 7);
  // Village Oasis Well & Date Palms
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.arc(desVilX, desVilY, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#15803d';
  [-14, 14].forEach((px) => {
    ctx.beginPath();
    ctx.arc(desVilX + px, desVilY - 2, 4.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // 12D. Sultan Malik Grand Desert Kingdom & Reflecting Pool [-540, -540] (~150x150)
  const [sultX, sultY] = wToC(-540, -540);
  const [sultPlazaX, sultPlazaY] = wToC(-540, -495);
  // Courtyard low sandstone plaza frame
  ctx.fillStyle = 'rgba(217, 178, 120, 0.55)';
  ctx.fillRect(sultPlazaX - 32, sultPlazaY - 32, 64, 64);
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 1.6;
  ctx.strokeRect(sultPlazaX - 32, sultPlazaY - 32, 64, 64);
  // Elongated Turquoise Reflecting Pool in front of stairs
  ctx.fillStyle = '#06b6d4';
  ctx.fillRect(sultX - 3.5, sultY + 11, 7, 22);
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(sultX - 20, sultY - 7, 40, 18);
  // Onion dome
  ctx.fillStyle = '#eab308';
  ctx.beginPath();
  ctx.arc(sultX, sultY - 9, 11, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sultX - 11, sultY - 9);
  ctx.quadraticCurveTo(sultX, sultY - 24, sultX, sultY - 24);
  ctx.quadraticCurveTo(sultX, sultY - 24, sultX + 11, sultY - 9);
  ctx.fill();
  // Spire
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(sultX, sultY - 24);
  ctx.lineTo(sultX, sultY - 30);
  ctx.stroke();
  // Minarets
  [-18, 18].forEach((mx) => {
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(sultX + mx - 2.5, sultY - 20, 5, 31);
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(sultX + mx, sultY - 20, 3.5, Math.PI, 0);
    ctx.fill();
  });

  // 12E. Astraea Expanded Imperial Capital City (170x170 at [460, -420])
  const [astX, astY] = wToC(460, -420);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(astX - 38, astY - 36, 76, 72);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(astX - 34, astY - 32, 68, 64);
  // Royal Districts & Grand Sun Palace in north quarter
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(astX - 16, astY - 31, 32, 20);
  ctx.fillStyle = '#eab308';
  ctx.beginPath();
  ctx.arc(astX, astY - 24, 9, 0, Math.PI * 2);
  ctx.fill();
  // Central Marble Fountain Plaza
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(astX, astY + 4, 5, 0, Math.PI * 2);
  ctx.fill();
  // South Gate
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(astX, astY + 36, 6, Math.PI, 0);
  ctx.fill();
  // Corner towers with gold cones
  const astTowers = [
    [astX - 38, astY - 36],
    [astX + 38, astY - 36],
    [astX - 38, astY + 36],
    [astX + 38, astY + 36],
  ];
  astTowers.forEach(([tx, ty]) => {
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(tx, ty, 6.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.moveTo(tx - 6.5, ty);
    ctx.lineTo(tx + 6.5, ty);
    ctx.lineTo(tx, ty - 13);
    ctx.closePath();
    ctx.fill();
  });

  // 12F. Puing Kastil Terbengkalai [580, -60]
  const [ruinX, ruinY] = wToC(580, -60);
  ctx.fillStyle = '#475569';
  ctx.fillRect(ruinX - 12, ruinY - 7, 24, 14);
  ctx.clearRect(ruinX - 5, ruinY - 7, 10, 5);
  ctx.fillStyle = '#334155';
  ctx.fillRect(ruinX - 14, ruinY - 14, 7, 21);

  // 12F2. Mage Tower Puncak Halilintar & Circular Arcane Ring Plaza [270, -260]
  const [mtX, mtY] = wToC(270, -260);
  ctx.strokeStyle = 'rgba(139, 92, 246, 0.75)';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(mtX, mtY, 16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#475569';
  ctx.fillRect(mtX - 8, mtY - 15, 16, 30);
  ctx.fillStyle = '#7c3aed';
  ctx.beginPath();
  ctx.moveTo(mtX - 10, mtY - 15);
  ctx.lineTo(mtX + 10, mtY - 15);
  ctx.lineTo(mtX, mtY - 28);
  ctx.closePath();
  ctx.fill();

  // 12G. Desa Benteng Val-Kragor (110x110 at [580, 130], 4 Integrated Corner Watchtowers)
  const [valX, valY] = wToC(580, 130);
  ctx.fillStyle = 'rgba(71, 85, 105, 0.45)';
  ctx.fillRect(valX - 26, valY - 26, 52, 52);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 3.8;
  ctx.strokeRect(valX - 26, valY - 26, 52, 52);
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(valX + 4, valY + 6);
  ctx.lineTo(valX + 14, valY - 9);
  ctx.lineTo(valX + 24, valY + 6);
  ctx.closePath();
  ctx.fill();
  [
    [-26, -26], [26, -26], [-26, 26], [26, 26],
  ].forEach(([wx, wy]) => {
    ctx.fillStyle = '#334155';
    ctx.fillRect(valX + wx - 4, valY + wy - 4, 8, 8);
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(valX + wx - 4.5, valY + wy - 4);
    ctx.lineTo(valX + wx + 4.5, valY + wy - 4);
    ctx.lineTo(valX + wx, valY + wy - 11);
    ctx.closePath();
    ctx.fill();
  });

  // 12H. Lembah Batu Lumut [580, -120]
  const [mosX, mosY] = wToC(580, -120);
  ctx.fillStyle = '#65a30d';
  ctx.beginPath();
  ctx.ellipse(mosX, mosY, 22, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  const megaliths = [
    [mosX - 9, mosY - 2, 4.5, 12],
    [mosX + 2, mosY - 7, 5.5, 15],
    [mosX + 10, mosY + 1, 4.5, 11],
  ];
  megaliths.forEach(([gx, gy, gw, gh]) => {
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.roundRect(gx - gw / 2, gy - gh, gw, gh, 2);
    ctx.fill();
    ctx.fillStyle = '#84cc16';
    ctx.beginPath();
    ctx.arc(gx, gy - gh + 2, gw / 2, Math.PI, 0);
    ctx.fill();
  });

  // 12I. Desa Utama Sanctuary [20, -60]
  const [vilX, vilY] = wToC(20, -60);
  [-14, 8].forEach((hx) => {
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(vilX + hx - 5, vilY - 2, 10, 8);
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(vilX + hx - 7, vilY - 2);
    ctx.lineTo(vilX + hx + 7, vilY - 2);
    ctx.lineTo(vilX + hx, vilY - 10);
    ctx.closePath();
    ctx.fill();
  });
  // Torii Gate
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(vilX + 18, vilY + 6);
  ctx.lineTo(vilX + 18, vilY - 6);
  ctx.moveTo(vilX + 26, vilY + 6);
  ctx.lineTo(vilX + 26, vilY - 6);
  ctx.moveTo(vilX + 15, vilY - 4);
  ctx.lineTo(vilX + 29, vilY - 4);
  ctx.stroke();

  // 12J. Pelabuhan Sanctuary [20, 20]
  const [harbX, harbY] = wToC(20, 20);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(harbX - 18, harbY, 36, 5);
  ctx.fillRect(harbX - 9, harbY + 5, 6, 15);
  ctx.fillRect(harbX + 9, harbY + 5, 6, 15);
  [-20, 20].forEach((sx) => {
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.moveTo(harbX + sx - 8, harbY + 15);
    ctx.lineTo(harbX + sx + 8, harbY + 15);
    ctx.lineTo(harbX + sx + 6, harbY + 20);
    ctx.lineTo(harbX + sx - 6, harbY + 20);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(harbX + sx, harbY + 8);
    ctx.lineTo(harbX + sx, harbY + 15);
    ctx.stroke();
  });

  // ==========================================================================
  // 12K. NAUTICAL SHIPPING ROUTES (JALUR PELAYARAN KAPAL LAUT SELATAN & BARAT)
  // Rute garis putus-putus bahari menghubungkan Pelabuhan Sanctuary ke Pulau-Pulau
  // ==========================================================================
  ctx.save();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
  ctx.lineWidth = 2.2;
  ctx.setLineDash([7, 5]);

  // Rute 1: Pelabuhan Sanctuary [20, 20] -> Pulau Mercusuar [-220, 460]
  const routeHarborToLighthouse: [number, number][] = [
    wToC(20, 20),
    wToC(-70, 270),
    wToC(-150, 360),
    wToC(-220, 460),
  ];
  drawSmoothSpline(ctx, routeHarborToLighthouse);
  ctx.stroke();

  // Rute 2: Pulau Mercusuar [-220, 460] -> Dermaga Teluk Utara Kaldera Naga [40, 716]
  const routeLighthouseToDragon: [number, number][] = [
    wToC(-220, 460),
    wToC(-120, 560),
    wToC(-30, 650),
    wToC(40, 716),
  ];
  drawSmoothSpline(ctx, routeLighthouseToDragon);
  ctx.stroke();

  // Rute 3: Pulau Mercusuar [-220, 460] -> Pulau Reruntuhan Bajak Laut [-520, 620]
  ctx.strokeStyle = 'rgba(251, 146, 60, 0.65)';
  const routeToPirates: [number, number][] = [
    wToC(-220, 460),
    wToC(-330, 520),
    wToC(-430, 570),
    wToC(-520, 620),
  ];
  drawSmoothSpline(ctx, routeToPirates);
  ctx.stroke();

  // Rute 4: Jalur Samudra Barat ke Pulau Karang Terjal [-780, 280]
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
  const routeToReef: [number, number][] = [
    wToC(-460, 100),
    wToC(-620, 190),
    wToC(-780, 280),
  ];
  drawSmoothSpline(ctx, routeToReef);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // ==========================================================================
  // 12L. KEPULAUAN PERANTARA DI SELATAN & BARAT (ARCHIPELAGO PHASE 1)
  // ==========================================================================

  // 1. Pulau Mercusuar & Karang Pelaut [-220, 460]
  const [lhX, lhY] = wToC(-220, 460);
  // Pasir pantai
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.ellipse(lhX, lhY, 32, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  // Daratan hijau berbukit
  ctx.fillStyle = '#65a30d';
  ctx.beginPath();
  ctx.ellipse(lhX - 3, lhY, 26, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  // Dermaga singgah kayu timur
  ctx.fillStyle = '#78350f';
  ctx.fillRect(lhX + 16, lhY - 3, 16, 6);
  // Menara Mercusuar Batu
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(lhX - 5, lhY - 14, 10, 18);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(lhX - 5, lhY - 8, 10, 4);
  // Ruang lentera bersinar
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(lhX - 4, lhY - 19, 8, 5);
  ctx.beginPath();
  ctx.moveTo(lhX - 5, lhY - 19);
  ctx.lineTo(lhX + 5, lhY - 19);
  ctx.lineTo(lhX, lhY - 24);
  ctx.closePath();
  ctx.fillStyle = '#991b1b';
  ctx.fill();
  // Cahaya suar mercusuar
  ctx.fillStyle = 'rgba(254, 240, 138, 0.35)';
  ctx.beginPath();
  ctx.arc(lhX, lhY - 17, 18, 0, Math.PI * 2);
  ctx.fill();

  // 2. Pulau Reruntuhan Bajak Laut [-520, 620]
  const [pirX, pirY] = wToC(-520, 620);
  // Pulau bulan sabit tebing cadas
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.arc(pirX, pirY, 34, 0.4 * Math.PI, 1.8 * Math.PI);
  ctx.lineTo(pirX - 8, pirY);
  ctx.closePath();
  ctx.fill();
  // Pantai teluk terlindung
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.ellipse(pirX + 10, pirY, 15, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  // Bangkai kapal karam di teluk
  ctx.fillStyle = '#3e2723';
  ctx.save();
  ctx.translate(pirX + 12, pirY);
  ctx.rotate(0.35);
  ctx.fillRect(-8, -4, 16, 8);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-2, -4);
  ctx.lineTo(-2, -12);
  ctx.moveTo(4, -4);
  ctx.lineTo(4, -10);
  ctx.stroke();
  ctx.restore();

  // 3. Pulau Karang Terjal [-780, 280]
  const [rfX, rfY] = wToC(-780, 280);
  ctx.fillStyle = '#334155';
  [-14, 0, 14].forEach((rx, i) => {
    ctx.beginPath();
    ctx.ellipse(rfX + rx, rfY + (i % 2) * 5, 11, 15, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  // Gerbang batu karang alami
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.arc(rfX, rfY - 2, 12, Math.PI, 0);
  ctx.stroke();

  // ==========================================================================
  // 12M. GUGUSAN 3 PULAU VULKANIK KALDERA NAGA [40, 840] (JAUH DI SELATAN)
  // Bentuk Organik Bebas Kotak-Kotak & Bebas Datar (Domain-Warped FBM)
  // ==========================================================================

  // A. Pulau Satelit Barat Daya [-138, 892]
  const [swvX, swvY] = wToC(-138, 892);
  ctx.fillStyle = '#1c1917';
  ctx.beginPath();
  ctx.ellipse(swvX, swvY, 24, 20, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#44403c';
  ctx.beginPath();
  ctx.ellipse(swvX, swvY, 16, 13, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Aliran lava satelit
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(swvX - 6, swvY - 4);
  ctx.lineTo(swvX + 6, swvY + 4);
  ctx.stroke();

  // B. Pulau Satelit Barat Laut [-128, 772]
  const [nwvX, nwvY] = wToC(-128, 772);
  ctx.fillStyle = '#1c1917';
  ctx.beginPath();
  ctx.ellipse(nwvX, nwvY, 22, 18, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#292524';
  ctx.beginPath();
  ctx.ellipse(nwvX, nwvY, 14, 11, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // C. Jembatan Batu Rantai Vulkanik Penghubung ke Tebing Barat Kaldera
  const [br1StartX, br1StartY] = wToC(-112, 878);
  const [br1EndX, br1EndY] = wToC(-82, 868);
  ctx.strokeStyle = '#292524';
  ctx.lineWidth = 4.0;
  ctx.beginPath();
  ctx.moveTo(br1StartX, br1StartY);
  ctx.lineTo(br1EndX, br1EndY);
  ctx.stroke();
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const [br2StartX, br2StartY] = wToC(-102, 785);
  const [br2EndX, br2EndY] = wToC(-72, 795);
  ctx.strokeStyle = '#292524';
  ctx.lineWidth = 4.0;
  ctx.beginPath();
  ctx.moveTo(br2StartX, br2StartY);
  ctx.lineTo(br2EndX, br2EndY);
  ctx.stroke();
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // D. Pulau Utama Kaldera Naga [40, 840] (Tebing Luar, Danau Lahar r=54..88, Arena Obsidian r=54, Jembatan Obsidian Utara)
  const [volX, volY] = wToC(40, 840);
  const [dockX, dockY] = wToC(40, 716);
  const [bridgeStartX, bridgeStartY] = wToC(40, 749);
  const [bridgeEndX, bridgeEndY] = wToC(40, 789);
  const [rimN_X, rimN_Y] = wToC(40, 840 - 88);
  const [rimE_X] = wToC(40 + 88, 840);
  const [islE_X] = wToC(40 + 54, 840);
  const outerPx = Math.max(46, (rimE_X - volX) * 1.32);
  const lavaPx = Math.max(32, rimE_X - volX);
  const islandPx = Math.max(20, islE_X - volX);

  // Dinding kawah basalt luar (radius 88..132)
  ctx.fillStyle = '#09090b';
  ctx.beginPath();
  ctx.ellipse(volX, volY, outerPx, outerPx * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1c1917';
  ctx.beginPath();
  ctx.ellipse(volX, volY, lavaPx * 1.15, lavaPx * 1.08, 0, 0, Math.PI * 2);
  ctx.fill();

  // Danau Lahar membara mengelilingi seluruh pulau altar (radius 54..88)
  const lavaGrad = ctx.createRadialGradient(volX, volY, islandPx * 0.85, volX, volY, lavaPx);
  lavaGrad.addColorStop(0, '#ea580c');
  lavaGrad.addColorStop(0.55, '#f97316');
  lavaGrad.addColorStop(0.85, '#dc2626');
  lavaGrad.addColorStop(1, '#7f1d1d');
  ctx.fillStyle = lavaGrad;
  ctx.beginPath();
  ctx.ellipse(volX, volY, lavaPx, lavaPx * 0.94, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pulau Altar Utama Basalt-Obsidian di tengah danau lahar (radius ~54)
  ctx.fillStyle = '#27272a';
  ctx.beginPath();
  ctx.ellipse(volX, volY, islandPx, islandPx * 0.94, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ea580c';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Retakan magma & Altar Rune Naga di pusat kawah [40, 840]
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.arc(volX, volY, 8.0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Jalan masuk daratan utara & Jembatan Obsidian Agung [40, 749] -> [40, 789] melintasi lahar
  ctx.strokeStyle = '#1c1917';
  ctx.lineWidth = 7.5;
  ctx.beginPath();
  ctx.moveTo(dockX, dockY);
  ctx.lineTo(rimN_X, rimN_Y);
  ctx.stroke();

  ctx.strokeStyle = '#09090b';
  ctx.lineWidth = 7.0;
  ctx.beginPath();
  ctx.moveTo(bridgeStartX, bridgeStartY);
  ctx.lineTo(bridgeEndX, bridgeEndY);
  ctx.stroke();
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(bridgeStartX, bridgeStartY);
  ctx.lineTo(bridgeEndX, bridgeEndY);
  ctx.stroke();

  // Dermaga Kayu Hangus di Teluk Utara [40, 716]
  ctx.fillStyle = '#18181b';
  ctx.fillRect(dockX - 4, dockY - 6, 8, 12);
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(dockX - 4, dockY - 6, 8, 12);

  ctx.restore();

  // ==========================================================================
  // 13. CLEAN OUTLINED LANDMARK LABELS WITH DARK BACKDROP PILLS (ANTI-COLLISION)
  // Smart directional offsets + semi-transparent dark backdrop pills
  // ==========================================================================
  WORLD_LANDMARKS.forEach((lm) => {
    const [lx, ly] = wToC(lm.x, lm.z);
    const textX = lx;
    const textY = lm.labelPosition === 'above' ? ly - 26 : ly + 26;

    ctx.save();
    ctx.font = 'bold 11px sans-serif';
    const textWidth = ctx.measureText(lm.nameId).width;
    const pillW = textWidth + 14;
    const pillH = 18;
    const pillX = textX - pillW / 2;
    const pillY = textY - pillH / 2;

    ctx.fillStyle = 'rgba(10, 15, 29, 0.78)';
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 5);
    ctx.fill();
    ctx.stroke();

    drawOutlinedText(ctx, lm.nameId, textX, textY + 3.5, 11, '#ffffff', 'center');
    ctx.restore();
  });

  ctx.restore();
}
