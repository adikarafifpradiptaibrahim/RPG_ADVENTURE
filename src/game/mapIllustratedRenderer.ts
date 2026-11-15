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
} from './3d/worldData';

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

  const toC = (nx: number, ny: number): [number, number] => normToCanvas(nx, ny, width, height);
  const wToC = (wx: number, wz: number): [number, number] => worldToCanvas(wx, wz, width, height);

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
  ];
  rippleZones.forEach(({ pos, r }) => {
    ctx.beginPath();
    ctx.ellipse(pos[0], pos[1], r, r * 0.32, 0, 0, Math.PI * 2);
    ctx.stroke();
  });

  // ==========================================================================
  // 2. CONTINENTAL LANDMASS SILHOUETTE & NATURAL COASTLINE
  // Skala Terkalibrasi [1200 x 950]:
  // West Coast: starts below snow mountains (0.13, 0.36) -> (0.10, 0.55) -> (0.14, 0.72)
  // South Coast: Harbor Bay (0.38, 0.78) -> Cape Village (0.52, 0.79) -> (0.70, 0.76) -> (0.78, 0.79) -> (0.88, 0.88)
  // Southeast Bay: (0.88, 0.88) -> (0.86, 0.74) -> (0.91, 0.62) -> exits right border at (1.0, 0.55)
  // North / NE border: Solid continental mass from (1.0, 0.55) -> (1.0, 0.0) -> (0.0, 0.0)
  // ==========================================================================
  const normCoastline: [number, number][] = [
    [0.13, 0.36],
    [0.11, 0.44],
    [0.10, 0.55],
    [0.12, 0.64],
    [0.14, 0.72],
    [0.18, 0.76],
    [0.26, 0.76],
    [0.38, 0.78], // Sanctuary Harbor Bay
    [0.46, 0.78],
    [0.52, 0.79], // Cape South of Village
    [0.60, 0.78],
    [0.70, 0.76],
    [0.78, 0.79], // Curves towards Val-Kragor peninsula
    [0.88, 0.88], // Southeast Cape
    [0.86, 0.74], // Curves NNE into Southeast Bay
    [0.91, 0.62],
    [0.96, 0.58],
    [1.00, 0.55], // Exits right screen border
  ];

  const normContinentPoly: [number, number][] = [
    [0.00, 0.00], // Top-Left corner (snow mountains)
    [0.00, 0.36],
    ...normCoastline,
    [1.00, 0.55],
    [1.00, 0.00], // Top-Right corner (desert / green mountains)
    [0.00, 0.00],
  ];

  const coastCanvas = normCoastline.map((p) => toC(p[0], p[1]));
  const continentCanvas = normContinentPoly.map((p) => toC(p[0], p[1]));

  // 2A. Warm Sandy Beach Fringe (Along Coastline)
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = Math.max(9, width * 0.018);
  drawSmoothSpline(ctx, coastCanvas);
  ctx.stroke();

  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = Math.max(4.5, width * 0.009);
  drawSmoothSpline(ctx, coastCanvas);
  ctx.stroke();
  ctx.restore();

  // 2B. Continent Base Fill (Vibrant Eldoria Grass Green)
  ctx.save();
  drawSmoothSpline(ctx, continentCanvas, true);
  const grassGrad = ctx.createLinearGradient(0, height * 0.25, 0, height);
  grassGrad.addColorStop(0, '#7cb342');
  grassGrad.addColorStop(0.5, '#70a827');
  grassGrad.addColorStop(1, '#65a30d');
  ctx.fillStyle = grassGrad;
  ctx.fill();
  ctx.restore();

  // Gentle green topographical contour lines across plains
  ctx.save();
  ctx.strokeStyle = 'rgba(85, 139, 47, 0.32)';
  ctx.lineWidth = 1.6;
  const hillContours: [number, number][][] = [
    [[0.18, 0.45], [0.24, 0.48], [0.32, 0.46], [0.38, 0.50]],
    [[0.52, 0.62], [0.58, 0.65], [0.65, 0.63]],
    [[0.62, 0.54], [0.70, 0.52], [0.76, 0.56]],
    [[0.22, 0.68], [0.29, 0.70], [0.35, 0.68]],
    [[0.65, 0.60], [0.72, 0.58], [0.78, 0.62]],
  ];
  hillContours.forEach((c) => {
    drawSmoothSpline(ctx, c.map((p) => toC(p[0], p[1])));
    ctx.stroke();
  });
  ctx.restore();

  // ==========================================================================
  // 3. SOLARIA DESERT (GOLDEN SAND BIOME & ROLLING DUNES)
  // Bound by worldData formula (z < -130 + sin(x*0.009)*45 && x > -140)
  // ==========================================================================
  const normDesertPoly: [number, number][] = [
    [0.38, 0.00],
    [0.38, 0.14],
    [0.39, 0.26],
    [0.42, 0.40], // West of Pyramid & Oasis
    [0.48, 0.46], // Below Oasis
    [0.57, 0.46],
    [0.72, 0.43], // South of World Boss Crater
    [0.82, 0.36], // North of Hutan Kabut Eldoria
    [0.92, 0.32],
    [1.00, 0.28], // Exits right border
    [1.00, 0.00], // Top-Right corner
    [0.38, 0.00], // Top border
  ];
  const desertCanvas = normDesertPoly.map((p) => toC(p[0], p[1]));

  ctx.save();
  drawSmoothSpline(ctx, desertCanvas, true);
  const desertGrad = ctx.createLinearGradient(0, 0, 0, height * 0.5);
  desertGrad.addColorStop(0, '#f59e0b');
  desertGrad.addColorStop(0.4, '#eab308');
  desertGrad.addColorStop(1, '#facc15');
  ctx.fillStyle = desertGrad;
  ctx.fill();

  // Soft dune boundary stroke
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.restore();

  // Rolling Sand Dune Curves
  ctx.save();
  const duneCurves: [number, number][][] = [
    [[0.42, 0.18], [0.48, 0.16], [0.54, 0.19]],
    [[0.50, 0.28], [0.56, 0.26], [0.62, 0.29]],
    [[0.60, 0.35], [0.66, 0.33], [0.72, 0.36]],
    [[0.68, 0.12], [0.74, 0.10], [0.80, 0.13]],
    [[0.54, 0.20], [0.60, 0.18], [0.66, 0.21]],
    [[0.43, 0.30], [0.48, 0.28], [0.53, 0.31]],
    [[0.72, 0.28], [0.78, 0.26], [0.84, 0.29]],
    [[0.82, 0.20], [0.88, 0.18], [0.94, 0.22]],
  ];
  duneCurves.forEach((d) => {
    const pts = d.map((p) => toC(p[0], p[1]));
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
  // 4. KANYON KUNO (NORTHERN RED CANYON MESAS & STRATIFIED CLIFFS)
  // Center: [160, -540] -> norm [0.633, 0.063]
  // ==========================================================================
  ctx.save();
  const canyonCenter = toC(0.633, 0.063);
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
  // 5. NORTHWEST SNOWY MOUNTAINS & TITAN LAKE
  // Titan Lake center: [-310, -480] -> norm [0.242, 0.126]
  // Rangkaian puncak salju melingkari penuh sisi barat, utara, dan timur Danau Titan
  // ==========================================================================
  ctx.save();
  const snowPeaks = [
    { nx: 0.06, ny: 0.06, nw: 0.055, nh: 0.058 },
    { nx: 0.12, ny: 0.04, nw: 0.060, nh: 0.065 },
    { nx: 0.18, ny: 0.03, nw: 0.065, nh: 0.070 },
    { nx: 0.25, ny: 0.03, nw: 0.062, nh: 0.068 },
    { nx: 0.32, ny: 0.04, nw: 0.060, nh: 0.066 },
    { nx: 0.36, ny: 0.07, nw: 0.055, nh: 0.060 },
    { nx: 0.08, ny: 0.14, nw: 0.052, nh: 0.055 },
    { nx: 0.10, ny: 0.22, nw: 0.050, nh: 0.052 },
    { nx: 0.33, ny: 0.14, nw: 0.052, nh: 0.056 },
    { nx: 0.36, ny: 0.22, nw: 0.048, nh: 0.052 },
    { nx: 0.17, ny: 0.21, nw: 0.045, nh: 0.048 },
  ];
  snowPeaks.forEach((p) => {
    const [px, py] = toC(p.nx, p.ny);
    const pw = p.nw * width;
    const ph = p.nh * height;

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

  // Ancient Titan Alpine Lake [0.242, 0.126]
  const [tlx, tly] = toC(0.242, 0.126);
  const tlrX = width * 0.072;
  const tlrY = height * 0.050;

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
  ctx.ellipse(tlx, tly, tlrX * 0.18, tlrY * 0.18, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#15803d';
  ctx.fill();
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // ==========================================================================
  // 6. EASTERN GREEN MOUNTAIN RIDGES (X: 500..600, norm: 0.91..1.0)
  // Mengapit Lembah Batu Lumut [510, 20]
  // ==========================================================================
  ctx.save();
  const greenPeaks = [
    { nx: 0.93, ny: 0.16, nw: 0.052, nh: 0.046 },
    { nx: 0.96, ny: 0.24, nw: 0.048, nh: 0.042 },
    { nx: 0.93, ny: 0.34, nw: 0.050, nh: 0.044 },
    { nx: 0.95, ny: 0.44, nw: 0.048, nh: 0.042 },
    { nx: 0.93, ny: 0.54, nw: 0.052, nh: 0.045 },
    { nx: 0.96, ny: 0.64, nw: 0.046, nh: 0.040 },
  ];
  greenPeaks.forEach((p) => {
    const [px, py] = toC(p.nx, p.ny);
    const pw = p.nw * width;
    const ph = p.nh * height;

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
  const swTrees = [
    [0.15, 0.60, 0.016], [0.18, 0.58, 0.018], [0.21, 0.62, 0.020], [0.24, 0.59, 0.017],
    [0.16, 0.65, 0.018], [0.19, 0.64, 0.022], [0.22, 0.67, 0.019], [0.25, 0.63, 0.017],
    [0.17, 0.70, 0.017], [0.20, 0.69, 0.021], [0.23, 0.71, 0.018], [0.26, 0.68, 0.016],
  ];
  swTrees.forEach(([tx, ty, rad]) => {
    const [cx, cy] = toC(tx, ty);
    const r = rad * width;

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
  // Center: [380, -160] -> norm [0.817, 0.463]
  // ==========================================================================
  ctx.save();
  const [mfx, mfy] = toC(0.817, 0.463);
  const mfr = width * 0.065;

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
    const bLen = br.id === 'bridge_caldera_pier' ? Math.max(48, height * 0.075) : Math.max(16, width * 0.022);
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(br.rotationY);

    if (br.id === 'bridge_caldera_pier') {
      // Long wooden pier across south ocean to Dragonfang Caldera
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(-5, -bLen / 2 - 1, 10, bLen + 2);

      ctx.fillStyle = '#78350f';
      ctx.fillRect(-4, -bLen / 2, 8, bLen);

      // Plank lines
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1.0;
      for (let py = -bLen / 2 + 2; py <= bLen / 2 - 2; py += 4) {
        ctx.beginPath();
        ctx.moveTo(-4, py);
        ctx.lineTo(4, py);
        ctx.stroke();
      }

      // Railings
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-4, -bLen / 2);
      ctx.lineTo(-4, bLen / 2);
      ctx.moveTo(4, -bLen / 2);
      ctx.lineTo(4, bLen / 2);
      ctx.stroke();
    } else {
      // Standard Bridge
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
    }

    ctx.restore();
  });
  ctx.restore();

  // ==========================================================================
  // 11. ROAD NETWORK (ROADS OVER CONTINENT)
  // Driven 100% by ROAD_SPLINES in worldData.ts
  // ==========================================================================
  ctx.save();
  ROAD_SPLINES.forEach((road) => {
    if (road.id === 'road_caldera_bridge') return; // rendered as pier bridge
    const pts = road.points.map((p) => wToC(p[0], p[1]));
    const isDesert = road.id === 'road_desert_caravan';

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

  // 12A. Golden Pyramids [30, -350] -> norm [0.525, 0.263]
  const [pyrX, pyrY] = wToC(30, -350);
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

  // 12B. Solaria Oasis Pool & Palms [85, -230] -> norm [0.571, 0.389]
  const [oasX, oasY] = wToC(85, -230);
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

  // 12C. World Boss Crater Sinkhole [255, -390] -> norm [0.713, 0.221]
  const [cratX, cratY] = wToC(255, -390);
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

  // 12D. Sultan Malik Palace [430, -460] -> norm [0.858, 0.147]
  const [sultX, sultY] = wToC(430, -460);
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

  // 12E. Astraea Imperial Castle & Sun Palace [-260, -230] -> norm [0.283, 0.389]
  const [astX, astY] = wToC(-260, -230);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(astX - 28, astY - 15, 56, 30);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(astX - 22, astY - 10, 44, 20);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(astX - 12, astY - 20, 24, 18);
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(astX, astY + 15, 5, Math.PI, 0);
  ctx.fill();
  // Corner towers with gold cones
  const astTowers = [
    [astX - 28, astY - 15],
    [astX + 28, astY - 15],
    [astX - 28, astY + 15],
    [astX + 28, astY + 15],
  ];
  astTowers.forEach(([tx, ty]) => {
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(tx, ty, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.moveTo(tx - 6, ty);
    ctx.lineTo(tx + 6, ty);
    ctx.lineTo(tx, ty - 12);
    ctx.closePath();
    ctx.fill();
  });

  // 12F. Puing Kastil Terbengkalai [220, -30] -> norm [0.683, 0.600]
  const [ruinX, ruinY] = wToC(220, -30);
  ctx.fillStyle = '#475569';
  ctx.fillRect(ruinX - 12, ruinY - 7, 24, 14);
  ctx.clearRect(ruinX - 5, ruinY - 7, 10, 5);
  ctx.fillStyle = '#334155';
  ctx.fillRect(ruinX - 14, ruinY - 14, 7, 21);

  // 12G. Desa Benteng Val-Kragor [330, 95] -> norm [0.775, 0.732]
  const [valX, valY] = wToC(330, 95);
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 3.6;
  ctx.strokeRect(valX - 24, valY - 15, 48, 30);
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(valX - 11, valY + 5);
  ctx.lineTo(valX, valY - 9);
  ctx.lineTo(valX + 11, valY + 5);
  ctx.closePath();
  ctx.fill();
  [-24, 24].forEach((wx) => {
    ctx.fillStyle = '#92400e';
    ctx.fillRect(valX + wx - 3.5, valY - 17, 7, 9);
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(valX + wx - 4.5, valY - 17);
    ctx.lineTo(valX + wx + 4.5, valY - 17);
    ctx.lineTo(valX + wx, valY - 24);
    ctx.closePath();
    ctx.fill();
  });

  // 12H. Lembah Batu Lumut [510, 20] -> norm [0.925, 0.653]
  const [mosX, mosY] = wToC(510, 20);
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

  // 12I. Desa Utama & Sanctuary [25, 135] -> norm [0.521, 0.774]
  const [vilX, vilY] = wToC(25, 135);
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

  // 12J. Pelabuhan Sanctuary [-145, 175] -> norm [0.379, 0.816]
  const [harbX, harbY] = wToC(-145, 175);
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

  // 12K. Kaldera Sarang Naga [-70, 300] -> norm [0.442, 0.947]
  const [volX, volY] = wToC(-70, 300);
  ctx.fillStyle = '#1c1917';
  ctx.beginPath();
  ctx.ellipse(volX, volY, width * 0.08, height * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#292524';
  ctx.beginPath();
  ctx.ellipse(volX, volY, width * 0.06, height * 0.038, 0, 0, Math.PI * 2);
  ctx.fill();

  const lavaGrad = ctx.createRadialGradient(volX, volY, 2, volX, volY, width * 0.04);
  lavaGrad.addColorStop(0, '#fef08a');
  lavaGrad.addColorStop(0.3, '#f97316');
  lavaGrad.addColorStop(0.7, '#ef4444');
  lavaGrad.addColorStop(1, '#991b1b');
  ctx.fillStyle = lavaGrad;
  ctx.beginPath();
  ctx.ellipse(volX, volY, width * 0.04, height * 0.024, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ==========================================================================
  // 13. CLEAN OUTLINED LANDMARK LABELS (REQUIREMENT 4: TIDAK SALING MENIMPA)
  // Danau Titan & Kanyon: 26px di ATAS ikon pin
  // Seluruh lokasi lainnya: 26px di BAWAH ikon pin
  // ==========================================================================
  WORLD_LANDMARKS.forEach((lm) => {
    const [lx, ly] = wToC(lm.x, lm.z);
    const textY = lm.labelPosition === 'above' ? ly - 26 : ly + 26;
    drawOutlinedText(ctx, lm.nameId, lx, textY, 12, '#ffffff', 'center');
  });

  ctx.restore();
}
