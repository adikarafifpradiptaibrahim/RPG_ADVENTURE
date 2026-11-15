/**
 * High-Resolution Vector Illustrated World Map Renderer
 * Renders smooth anti-aliased biomes, natural continental silhouette & coastlines,
 * organic meandering rivers, illustrated landmarks, and clean stroke-outlined typography.
 * Identical to target reference image_b16321.png.
 */

export interface MapBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const MAP_BOUNDS: MapBounds = {
  minX: -580,
  maxX: 680,
  minZ: -580,
  maxZ: 460,
};

export function normToWorld(nx: number, ny: number, bounds: MapBounds = MAP_BOUNDS): [number, number] {
  return [
    bounds.minX + nx * (bounds.maxX - bounds.minX),
    bounds.minZ + ny * (bounds.maxZ - bounds.minZ),
  ];
}

export function worldToNorm(wx: number, wz: number, bounds: MapBounds = MAP_BOUNDS): [number, number] {
  return [
    (wx - bounds.minX) / (bounds.maxX - bounds.minX),
    (wz - bounds.minZ) / (bounds.maxZ - bounds.minZ),
  ];
}

function n2c(nx: number, ny: number, width: number, height: number): [number, number] {
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
 * Renders clean white text with a crisp thick black outline (NO background boxes).
 */
export function drawOutlinedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize = 11,
  color = '#ffffff',
  align: CanvasTextAlign = 'center'
) {
  ctx.save();
  ctx.font = `bold ${fontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';

  // Thick black stroke
  ctx.strokeStyle = '#000000';
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
 * Master render function for the illustrated map
 */
export function renderIllustratedMap(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  _bounds: MapBounds = MAP_BOUNDS
) {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const toC = (nx: number, ny: number): [number, number] => n2c(nx, ny, width, height);

  // ==========================================================================
  // 1. AZURE OCEAN BACKGROUND
  // ==========================================================================
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#0284c7');
  oceanGrad.addColorStop(0.65, '#0284c7');
  oceanGrad.addColorStop(1, '#0369a1');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // Soft subtle ocean ripples in south sea
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 1.3;
  const rippleZones: { pos: [number, number]; r: number }[] = [
    { pos: toC(0.18, 0.86), r: width * 0.045 },
    { pos: toC(0.35, 0.88), r: width * 0.055 },
    { pos: toC(0.68, 0.85), r: width * 0.060 },
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
  // ==========================================================================
  // Sesuai normalized coordinates:
  // West Coast: (0.0, 0.0) -> (0.08, 0.35) -> (0.06, 0.55) -> (0.11, 0.72) -> (0.13, 0.76)
  // South Coast: (0.13, 0.76) -> (0.36, 0.74) -> (0.50, 0.76) -> (0.68, 0.73) -> (0.87, 0.87)
  // East / SE Coast: (0.87, 0.87) -> (0.85, 0.75) -> (0.89, 0.62) -> (1.0, 0.55)
  // North / NE border: Solid continental landmass from (1.0, 0.55) -> (1.0, 0.0) -> (0.0, 0.0)
  const normCoastline: [number, number][] = [
    [0.08, 0.35],
    [0.07, 0.44],
    [0.06, 0.55],
    [0.08, 0.64],
    [0.11, 0.72],
    [0.13, 0.76],
    [0.22, 0.75],
    [0.36, 0.74], // Sanctuary Harbor Bay
    [0.44, 0.75],
    [0.50, 0.76], // Tanjung Desa Utama
    [0.58, 0.75],
    [0.68, 0.73], // Rises slightly
    [0.78, 0.78], // Curves SE towards Val-Kragor peninsula
    [0.87, 0.87], // Ujung Tanjung Tenggara
    [0.85, 0.75], // Curves NNE into Eastern Bay
    [0.89, 0.62],
    [0.95, 0.58],
    [1.00, 0.55], // Exits right screen border
  ];

  // Full continental polygon (closed through top edge)
  const normContinentPoly: [number, number][] = [
    [0.00, 0.00], // Top-Left corner (solid landmass)
    [0.00, 0.35],
    ...normCoastline,
    [1.00, 0.55],
    [1.00, 0.00], // Top-Right corner (solid landmass)
    [0.00, 0.00],
  ];

  const coastCanvas = normCoastline.map((p) => toC(p[0], p[1]));
  const continentCanvas = normContinentPoly.map((p) => toC(p[0], p[1]));

  // 2A. Warm Sandy Beach Fringe (Along Coastline)
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 15;
  drawSmoothSpline(ctx, coastCanvas);
  ctx.stroke();

  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 7;
  drawSmoothSpline(ctx, coastCanvas);
  ctx.stroke();
  ctx.restore();

  // 2B. Continent Base Fill (Vibrant Eldoria Grass Green)
  ctx.save();
  drawSmoothSpline(ctx, continentCanvas, true);
  const grassGrad = ctx.createLinearGradient(0, height * 0.25, 0, height);
  grassGrad.addColorStop(0, '#7cb342');
  grassGrad.addColorStop(0.5, '#70a827');
  grassGrad.addColorStop(1, '#689f38');
  ctx.fillStyle = grassGrad;
  ctx.fill();
  ctx.restore();

  // Gentle green topographical contour lines across plains
  ctx.save();
  ctx.strokeStyle = 'rgba(85, 139, 47, 0.32)';
  ctx.lineWidth = 1.6;
  const hillContours: [number, number][][] = [
    [[0.15, 0.45], [0.22, 0.48], [0.30, 0.46], [0.38, 0.50]],
    [[0.52, 0.62], [0.58, 0.65], [0.65, 0.63]],
    [[0.62, 0.54], [0.70, 0.52], [0.76, 0.56]],
    [[0.20, 0.68], [0.28, 0.70], [0.34, 0.68]],
  ];
  hillContours.forEach((c) => {
    drawSmoothSpline(ctx, c.map((p) => toC(p[0], p[1])));
    ctx.stroke();
  });
  ctx.restore();

  // ==========================================================================
  // 3. SOLARIA DESERT (GOLDEN SAND BIOME & ROLLING DUNES)
  // ==========================================================================
  // Sesuai normalized coordinates:
  // Starts at snowy mountain foot (0.35, 0.0) -> (0.37, 0.25) -> (0.41, 0.42)
  // Below oasis: (0.48, 0.48) -> south of crater: (0.68, 0.43) -> north of mist forest: (0.82, 0.36)
  // Exits right screen border at (1.0, 0.30)
  const normDesertPoly: [number, number][] = [
    [0.35, 0.00],
    [0.36, 0.12],
    [0.37, 0.25],
    [0.41, 0.42], // Turns SE west of Pyramid & Oasis
    [0.48, 0.48], // Below Oasis
    [0.58, 0.46],
    [0.68, 0.43], // South of World Boss Crater
    [0.82, 0.36], // North of Hutan Kabut Eldoria
    [0.92, 0.33],
    [1.00, 0.30], // Exits right border
    [1.00, 0.00], // Top-Right corner
    [0.35, 0.00], // Back to start along top border
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

  // Beautiful Rolling Sand Dune Curves
  ctx.save();
  const duneCurves: [number, number][][] = [
    [[0.40, 0.18], [0.46, 0.16], [0.52, 0.19]],
    [[0.50, 0.28], [0.56, 0.26], [0.62, 0.29]],
    [[0.60, 0.35], [0.66, 0.33], [0.72, 0.36]],
    [[0.68, 0.12], [0.74, 0.10], [0.80, 0.13]],
    [[0.54, 0.20], [0.60, 0.18], [0.66, 0.21]],
    [[0.42, 0.30], [0.47, 0.28], [0.52, 0.31]],
    [[0.72, 0.28], [0.78, 0.26], [0.84, 0.29]],
    [[0.82, 0.20], [0.88, 0.18], [0.94, 0.22]],
  ];
  duneCurves.forEach((d) => {
    const pts = d.map((p) => toC(p[0], p[1]));
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.8;
    drawSmoothSpline(ctx, pts);
    ctx.stroke();

    // Dune crest sunlight highlight
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
  // ==========================================================================
  ctx.save();
  const mesaBlocks = [
    { nx: 0.45, ny: 0.05, nw: 0.045, nh: 0.038 },
    { nx: 0.50, ny: 0.04, nw: 0.055, nh: 0.042 },
    { nx: 0.56, ny: 0.06, nw: 0.050, nh: 0.039 },
    { nx: 0.48, ny: 0.09, nw: 0.040, nh: 0.032 },
    { nx: 0.53, ny: 0.08, nw: 0.048, nh: 0.035 },
  ];
  mesaBlocks.forEach((m) => {
    const [mx, my] = toC(m.nx, m.ny);
    const mw = m.nw * width;
    const mh = m.nh * height;

    // Drop shadow
    ctx.fillStyle = 'rgba(69, 26, 3, 0.45)';
    ctx.fillRect(mx - mw / 2 + 2, my - mh / 2 + 3, mw, mh);

    // Terracotta cliff face
    const mesaGrad = ctx.createLinearGradient(mx, my - mh / 2, mx, my + mh / 2);
    mesaGrad.addColorStop(0, '#ea580c');
    mesaGrad.addColorStop(0.5, '#c2410c');
    mesaGrad.addColorStop(1, '#9a3412');
    ctx.fillStyle = mesaGrad;
    ctx.beginPath();
    ctx.roundRect(mx - mw / 2, my - mh / 2, mw, mh, 4);
    ctx.fill();

    // Strata geological lines
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(mx - mw / 2 + 2, my);
    ctx.lineTo(mx + mw / 2 - 2, my);
    ctx.moveTo(mx - mw / 2 + 4, my + mh * 0.25);
    ctx.lineTo(mx + mw / 2 - 4, my + mh * 0.25);
    ctx.stroke();

    // Top rim highlight
    ctx.strokeStyle = '#fdba74';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(mx - mw / 2, my - mh / 2);
    ctx.lineTo(mx + mw / 2, my - mh / 2);
    ctx.stroke();
  });
  ctx.restore();

  // ==========================================================================
  // 5. NORTHWEST SNOWY MOUNTAINS & TITAN LAKE
  // ==========================================================================
  ctx.save();
  // Mountain peaks encircling Titan Lake [0.254, 0.125]
  const snowPeaks = [
    { nx: 0.08, ny: 0.06, nw: 0.055, nh: 0.058 },
    { nx: 0.14, ny: 0.04, nw: 0.060, nh: 0.065 },
    { nx: 0.20, ny: 0.03, nw: 0.065, nh: 0.070 },
    { nx: 0.28, ny: 0.03, nw: 0.062, nh: 0.068 },
    { nx: 0.34, ny: 0.05, nw: 0.058, nh: 0.060 },
    { nx: 0.10, ny: 0.13, nw: 0.052, nh: 0.055 },
    { nx: 0.12, ny: 0.21, nw: 0.050, nh: 0.052 },
    { nx: 0.33, ny: 0.12, nw: 0.052, nh: 0.056 },
    { nx: 0.36, ny: 0.20, nw: 0.048, nh: 0.052 },
    { nx: 0.19, ny: 0.20, nw: 0.045, nh: 0.048 },
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

  // Ancient Titan Alpine Lake [0.254, 0.125]
  const [tlx, tly] = toC(0.254, 0.125);
  const tlrX = width * 0.075;
  const tlrY = height * 0.052;

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

  // Small mystical center island in Titan Lake
  ctx.beginPath();
  ctx.ellipse(tlx, tly, tlrX * 0.18, tlrY * 0.18, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#15803d';
  ctx.fill();
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();

  // ==========================================================================
  // 6. EASTERN GREEN MOUNTAIN RIDGES
  // ==========================================================================
  ctx.save();
  const greenPeaks = [
    { nx: 0.93, ny: 0.20, nw: 0.045, nh: 0.042 },
    { nx: 0.95, ny: 0.28, nw: 0.042, nh: 0.038 },
    { nx: 0.92, ny: 0.36, nw: 0.046, nh: 0.040 },
    { nx: 0.94, ny: 0.44, nw: 0.044, nh: 0.038 },
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
    [0.12, 0.60, 0.016], [0.15, 0.58, 0.018], [0.18, 0.62, 0.020], [0.21, 0.59, 0.017],
    [0.13, 0.65, 0.018], [0.16, 0.64, 0.022], [0.19, 0.67, 0.019], [0.22, 0.63, 0.017],
    [0.14, 0.70, 0.017], [0.17, 0.69, 0.021], [0.20, 0.71, 0.018], [0.23, 0.68, 0.016],
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
  // ==========================================================================
  ctx.save();
  const [mfx, mfy] = toC(0.762, 0.423);
  const mfr = width * 0.065;

  // Massive lush green forest canopy
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
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
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
  // ==========================================================================
  // Central Confluence at (0.460, 0.560)
  // 1. NW: from Titan lake outlet (0.254, 0.170) -> east of Astraea -> (0.460, 0.560)
  // 2. North/Desert: (0.460, 0.560) -> (0.560, 0.440) -> west of crater -> foot of canyon (0.515, 0.100)
  // 3. East: (0.460, 0.560) -> between castle & valkragor -> loops north of mist forest -> NE mountains
  // 4. South: (0.460, 0.560) -> straight south to muara (0.476, 0.745)
  ctx.save();
  const riverNW: [number, number][] = [
    [0.254, 0.170], // Danau Titan Outlet
    [0.265, 0.220],
    [0.285, 0.280],
    [0.315, 0.340], // East of Astraea
    [0.360, 0.420],
    [0.410, 0.500],
    [0.460, 0.560], // Confluence
  ];
  const riverDesert: [number, number][] = [
    [0.460, 0.560], // Confluence
    [0.510, 0.500],
    [0.560, 0.440], // Enters Solaria Desert
    [0.585, 0.360],
    [0.595, 0.280], // West of World Boss Crater
    [0.575, 0.200],
    [0.540, 0.140],
    [0.515, 0.100], // Kaki Kanyon Kuno
  ];
  const riverEast: [number, number][] = [
    [0.460, 0.560], // Confluence
    [0.520, 0.565],
    [0.580, 0.540],
    [0.640, 0.525], // Between Ruined Castle & Val-Kragor
    [0.710, 0.550],
    [0.770, 0.535],
    [0.820, 0.470], // Loops north east of Hutan Kabut
    [0.835, 0.380],
    [0.840, 0.280], // NE mountains (NO branch to SE sea)
  ];
  const riverSouth: [number, number][] = [
    [0.460, 0.560], // Confluence
    [0.465, 0.620],
    [0.472, 0.680],
    [0.476, 0.745], // Muara Samudra Selatan
  ];

  const riverBranches = [riverNW, riverDesert, riverEast, riverSouth];

  // Pass 1: Dark Blue Edge
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 6.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  riverBranches.forEach((b) => {
    drawSmoothSpline(ctx, b.map((p) => toC(p[0], p[1])));
    ctx.stroke();
  });

  // Pass 2: Light Blue Water Body
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4.4;
  riverBranches.forEach((b) => {
    drawSmoothSpline(ctx, b.map((p) => toC(p[0], p[1])));
    ctx.stroke();
  });

  // Pass 3: Delicate Water Shimmer
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.50)';
  ctx.lineWidth = 1.3;
  riverBranches.forEach((b) => {
    drawSmoothSpline(ctx, b.map((p) => toC(p[0], p[1])));
    ctx.stroke();
  });
  ctx.restore();

  // ==========================================================================
  // 10. WOODEN BRIDGES (ACROSS HIGHWAY INTERSECTIONS)
  // ==========================================================================
  ctx.save();
  const bridges: { nx: number; ny: number; angle: number; len: number }[] = [
    { nx: 0.315, ny: 0.340, angle: -Math.PI / 4, len: 18 },  // West Bridge (Astraea Highway)
    { nx: 0.465, ny: 0.600, angle: 0, len: 20 },             // Central Village Bridge
    { nx: 0.640, ny: 0.525, angle: Math.PI / 2.2, len: 18 }, // Castle Access Bridge
    { nx: 0.770, ny: 0.535, angle: Math.PI / 2, len: 18 },   // East Bridge (Val-Kragor)
    { nx: 0.560, ny: 0.440, angle: Math.PI / 3, len: 18 },   // Desert Bridge
  ];
  bridges.forEach((br) => {
    const [bx, by] = toC(br.nx, br.ny);
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(br.angle);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(-br.len / 2 - 1, -5, br.len + 2, 10);

    // Deck planks
    ctx.fillStyle = '#854d0e';
    ctx.fillRect(-br.len / 2, -4, br.len, 8);

    // Planks division lines
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.0;
    for (let px = -br.len / 2 + 2; px <= br.len / 2 - 2; px += 3) {
      ctx.beginPath();
      ctx.moveTo(px, -4);
      ctx.lineTo(px, 4);
      ctx.stroke();
    }

    // Railings
    ctx.strokeStyle = '#713f12';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-br.len / 2, -4);
    ctx.lineTo(br.len / 2, -4);
    ctx.moveTo(-br.len / 2, 4);
    ctx.lineTo(br.len / 2, 4);
    ctx.stroke();

    ctx.restore();
  });
  ctx.restore();

  // ==========================================================================
  // 11. ROAD NETWORK (ROADS OVER CONTINENT)
  // ==========================================================================
  ctx.save();
  const roadWest: [number, number][] = [
    [0.476, 0.683], [0.380, 0.700], [0.260, 0.620], [0.220, 0.500],
    [0.230, 0.420], [0.270, 0.346]
  ];
  const roadEast: [number, number][] = [
    [0.476, 0.683], [0.465, 0.600], [0.550, 0.590], [0.643, 0.500],
    [0.722, 0.644], [0.800, 0.600], [0.841, 0.577]
  ];
  const roadDesert: [number, number][] = [
    [0.460, 0.560], [0.560, 0.440], [0.476, 0.327], [0.444, 0.250],
    [0.550, 0.200], [0.627, 0.211], [0.746, 0.135]
  ];
  const roadHarbor: [number, number][] = [
    [0.476, 0.683], [0.420, 0.710], [0.360, 0.740]
  ];

  const mainRoads = [roadWest, roadEast, roadHarbor];
  mainRoads.forEach((r) => {
    const pts = r.map((p) => toC(p[0], p[1]));
    ctx.strokeStyle = 'rgba(74, 54, 38, 0.45)';
    ctx.lineWidth = 4.2;
    drawSmoothSpline(ctx, pts);
    ctx.stroke();

    ctx.strokeStyle = '#a3917a';
    ctx.lineWidth = 2.4;
    ctx.setLineDash([5, 4]);
    drawSmoothSpline(ctx, pts);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // Desert caravan trail
  const desertRoadPts = roadDesert.map((p) => toC(p[0], p[1]));
  ctx.strokeStyle = 'rgba(180, 130, 50, 0.45)';
  ctx.lineWidth = 3.6;
  drawSmoothSpline(ctx, desertRoadPts);
  ctx.stroke();
  ctx.strokeStyle = '#d9be8b';
  ctx.lineWidth = 2.2;
  ctx.setLineDash([4, 4]);
  drawSmoothSpline(ctx, desertRoadPts);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // ==========================================================================
  // 12. ILLUSTRATED LANDMARK STRUCTURES & FEATURES
  // ==========================================================================
  ctx.save();

  // 12A. Golden Pyramids [0.444, 0.250]
  const [pyrX, pyrY] = toC(0.444, 0.250);
  // Large Pyramid
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

  // Small Pyramid
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

  // 12B. Solaria Oasis Pool & Palms [0.476, 0.327]
  const [oasX, oasY] = toC(0.476, 0.327);
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

  // 12C. World Boss Crater Sinkhole [0.627, 0.211]
  const [cratX, cratY] = toC(0.627, 0.211);
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

  // 12D. Sultan Malik Palace [0.746, 0.135]
  const [sultX, sultY] = toC(0.746, 0.135);
  // Marble Base
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(sultX - 20, sultY - 7, 40, 18);
  // Golden Center Onion Dome
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

  // 12E. Astraea Imperial Castle & Sun Palace [0.270, 0.346]
  const [astX, astY] = toC(0.270, 0.346);
  // Outer Stone Wall
  ctx.fillStyle = '#64748b';
  ctx.fillRect(astX - 28, astY - 15, 56, 30);
  // Courtyard
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(astX - 22, astY - 10, 44, 20);
  // Central Keep / Palace
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(astX - 12, astY - 20, 24, 18);
  // Gate arch
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

  // 12F. Puing Kastil Terbengkalai [0.643, 0.500]
  const [ruinX, ruinY] = toC(0.643, 0.500);
  ctx.fillStyle = '#475569';
  ctx.fillRect(ruinX - 12, ruinY - 7, 24, 14);
  // Broken battlements
  ctx.clearRect(ruinX - 5, ruinY - 7, 10, 5);
  ctx.fillStyle = '#334155';
  ctx.fillRect(ruinX - 14, ruinY - 14, 7, 21);

  // 12G. Desa Benteng Val-Kragor [0.722, 0.644]
  const [valX, valY] = toC(0.722, 0.644);
  // Palisade wooden boundary
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 3.6;
  ctx.strokeRect(valX - 24, valY - 15, 48, 30);
  // Red roofed keep
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(valX - 11, valY + 5);
  ctx.lineTo(valX, valY - 9);
  ctx.lineTo(valX + 11, valY + 5);
  ctx.closePath();
  ctx.fill();
  // Watchtowers
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

  // 12H. Lembah Batu Lumut [0.841, 0.577]
  const [mosX, mosY] = toC(0.841, 0.577);
  ctx.fillStyle = '#65a30d';
  ctx.beginPath();
  ctx.ellipse(mosX, mosY, 22, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  // Standing megaliths
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
    // Green moss cap
    ctx.fillStyle = '#84cc16';
    ctx.beginPath();
    ctx.arc(gx, gy - gh + 2, gw / 2, Math.PI, 0);
    ctx.fill();
  });

  // 12I. Desa Utama & Sanctuary [0.476, 0.683]
  const [vilX, vilY] = toC(0.476, 0.683);
  // Thatched huts
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

  // 12J. Pelabuhan Sanctuary [0.360, 0.740]
  const [harbX, harbY] = toC(0.360, 0.740);
  // Wooden piers
  ctx.fillStyle = '#78350f';
  ctx.fillRect(harbX - 18, harbY, 36, 5);
  ctx.fillRect(harbX - 9, harbY + 5, 6, 15);
  ctx.fillRect(harbX + 9, harbY + 5, 6, 15);
  // Ships
  [-20, 20].forEach((sx) => {
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.moveTo(harbX + sx - 8, harbY + 15);
    ctx.lineTo(harbX + sx + 8, harbY + 15);
    ctx.lineTo(harbX + sx + 6, harbY + 20);
    ctx.lineTo(harbX + sx - 6, harbY + 20);
    ctx.closePath();
    ctx.fill();
    // Mast
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(harbX + sx, harbY + 8);
    ctx.lineTo(harbX + sx, harbY + 15);
    ctx.stroke();
  });

  // 12K. Kaldera Sarang Naga [0.524, 0.904]
  const [volX, volY] = toC(0.524, 0.904);
  // Obsidian Island Body
  ctx.fillStyle = '#1c1917';
  ctx.beginPath();
  ctx.ellipse(volX, volY, width * 0.08, height * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#292524';
  ctx.beginPath();
  ctx.ellipse(volX, volY, width * 0.06, height * 0.038, 0, 0, Math.PI * 2);
  ctx.fill();

  // Fiery Molten Magma Pit
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
  // 13. CLEAN OUTLINED LANDMARK LABELS (NO BLACK BACKGROUND BOXES)
  // ==========================================================================
  // Rendered cleanly directly onto canvas with thick black stroke and white text
  drawOutlinedText(ctx, 'Lembah Danau Titan Kuno', toC(0.254, 0.060)[0], toC(0.254, 0.060)[1], 12);
  drawOutlinedText(ctx, 'Ibukota Kerajaan Emas Astraea & Istana Kaisar', toC(0.270, 0.280)[0], toC(0.270, 0.280)[1], 11);
  drawOutlinedText(ctx, 'Kanyon Kuno', toC(0.500, 0.025)[0], toC(0.500, 0.025)[1], 12);
  drawOutlinedText(ctx, 'Piramida Emas Solaria', toC(0.444, 0.190)[0], toC(0.444, 0.190)[1], 11);
  drawOutlinedText(ctx, 'Oase Solaria', toC(0.476, 0.370)[0], toC(0.476, 0.370)[1], 11);
  drawOutlinedText(ctx, 'Kawah Cacat World Boss (Lv. 10)', toC(0.627, 0.150)[0], toC(0.627, 0.150)[1], 11);
  drawOutlinedText(ctx, 'Istana Sultan Malik', toC(0.746, 0.075)[0], toC(0.746, 0.075)[1], 11);
  drawOutlinedText(ctx, 'Hutan Kabut Eldoria', toC(0.762, 0.355)[0], toC(0.762, 0.355)[1], 12);
  drawOutlinedText(ctx, 'Puing Kastil Terbengkalai', toC(0.643, 0.450)[0], toC(0.643, 0.450)[1], 11);
  drawOutlinedText(ctx, 'Desa Benteng Val-Kragor', toC(0.722, 0.705)[0], toC(0.722, 0.705)[1], 11);
  drawOutlinedText(ctx, 'Lembah Batu Lumut', toC(0.841, 0.635)[0], toC(0.841, 0.635)[1], 11);
  drawOutlinedText(ctx, 'Pelabuhan Sanctuary', toC(0.360, 0.795)[0], toC(0.360, 0.795)[1], 11);
  drawOutlinedText(ctx, 'Desa Utama & Padang Rumput Eldoria', toC(0.500, 0.785)[0], toC(0.500, 0.785)[1], 11);
  drawOutlinedText(ctx, 'Kaldera Sarang Naga', toC(0.524, 0.970)[0], toC(0.524, 0.970)[1], 12);

  ctx.restore();
}
