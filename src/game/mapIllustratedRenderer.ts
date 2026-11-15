/**
 * High-Resolution Vector Illustrated World Map Renderer
 * Renders smooth anti-aliased biomes, curved coastlines, organic meandering rivers,
 * illustrated landmarks, and clean stroke-outlined typography identical to target reference image_b16321.png.
 */

export interface MapBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const MAP_BOUNDS: MapBounds = {
  minX: -480,
  maxX: 560,
  minZ: -580,
  maxZ: 420,
};

function w2c(wx: number, wz: number, bounds: MapBounds, width: number, height: number): [number, number] {
  const cx = ((wx - bounds.minX) / (bounds.maxX - bounds.minX)) * width;
  const cy = ((wz - bounds.minZ) / (bounds.maxZ - bounds.minZ)) * height;
  return [cx, cy];
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
  ctx.lineWidth = Math.max(3, fontSize * 0.28);
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
  bounds: MapBounds = MAP_BOUNDS
) {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const toC = (wx: number, wz: number): [number, number] => w2c(wx, wz, bounds, width, height);

  // ==========================================================================
  // 1. AZURE OCEAN BACKGROUND
  // ==========================================================================
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#0284c7');
  oceanGrad.addColorStop(0.6, '#0284c7');
  oceanGrad.addColorStop(1, '#0369a1');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // Soft subtle ocean ripples in south sea
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1.2;
  const rippleZones: { pos: [number, number]; r: number }[] = [
    { pos: toC(-280, 260), r: 35 },
    { pos: toC(-120, 290), r: 45 },
    { pos: toC(220, 280), r: 50 },
    { pos: toC(340, 240), r: 40 },
    { pos: toC(-360, 210), r: 30 },
  ];
  rippleZones.forEach(({ pos, r }) => {
    ctx.beginPath();
    ctx.ellipse(pos[0], pos[1], r, r * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();
  });

  // ==========================================================================
  // 2. MAIN CONTINENT LANDMASS (ELDORIA PLAINS + COASTLINE)
  // ==========================================================================
  const rawCoastWorld: [number, number][] = [
    [-420, -560],
    [-435, -450],
    [-440, -320],
    [-450, -180],
    [-440, -50],
    [-430, 80],
    [-390, 160],
    [-320, 185],
    [-200, 185],
    [-70, 185],
    [0, 195],
    [20, 205],   // Sanctuary Harbor Peninsula
    [50, 195],
    [140, 185],
    [260, 185],
    [340, 180],
    [400, 165],  // Southeast Bay curving north
    [440, 130],
    [465, 75],
    [485, 30],   // East of Val-Kragor
    [505, -20],  // East of Moss Valley
    [495, -90],
    [475, -180],
    [455, -280],
    [425, -420],
    [380, -520],
    [240, -560],
    [50, -560],
    [-180, -560],
    [-420, -560],
  ];
  const coastCanvas = rawCoastWorld.map((p) => toC(p[0], p[1]));

  // 2A. Warm Sandy Beach Fringe
  ctx.save();
  drawSmoothSpline(ctx, coastCanvas, true);
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 14;
  ctx.lineJoin = 'round';
  ctx.stroke();

  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();

  // 2B. Continent Base Fill (Vibrant Eldoria Grass Green)
  ctx.save();
  drawSmoothSpline(ctx, coastCanvas, true);
  const grassGrad = ctx.createLinearGradient(0, height * 0.3, 0, height);
  grassGrad.addColorStop(0, '#7cb342');
  grassGrad.addColorStop(0.5, '#70a827');
  grassGrad.addColorStop(1, '#689f38');
  ctx.fillStyle = grassGrad;
  ctx.fill();
  ctx.restore();

  // Gentle green topographical contour lines across plains
  ctx.save();
  ctx.strokeStyle = 'rgba(85, 139, 47, 0.35)';
  ctx.lineWidth = 1.5;
  const hillContours: [number, number][][] = [
    [[-180, 20], [-120, 40], [-60, 30], [20, 50]],
    [[140, 40], [210, 65], [280, 50]],
    [[180, -40], [260, -30], [320, 10]],
  ];
  hillContours.forEach((c) => {
    drawSmoothSpline(ctx, c.map((p) => toC(p[0], p[1])));
    ctx.stroke();
  });
  ctx.restore();

  // ==========================================================================
  // 3. SOLARIA DESERT (GOLDEN SAND BIOME & ROLLING DUNES)
  // ==========================================================================
  const rawDesertWorld: [number, number][] = [
    [-110, -560],
    [-95, -420],
    [-75, -280],
    [-55, -200],
    [-20, -140],
    [20, -90],    // Southernmost crest between Pyramid & Oasis
    [65, -105],   // Around Confluence
    [130, -135],
    [190, -145],  // Dip below World Boss Crater
    [255, -145],
    [320, -210],
    [360, -290],
    [415, -400],
    [390, -560],
    [-110, -560],
  ];
  const desertCanvas = rawDesertWorld.map((p) => toC(p[0], p[1]));

  ctx.save();
  drawSmoothSpline(ctx, desertCanvas, true);
  const desertGrad = ctx.createLinearGradient(0, toC(0, -560)[1], 0, toC(0, -90)[1]);
  desertGrad.addColorStop(0, '#f59e0b');
  desertGrad.addColorStop(0.4, '#eab308');
  desertGrad.addColorStop(1, '#facc15');
  ctx.fillStyle = desertGrad;
  ctx.fill();

  // Soft dune shadow border
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  // Beautiful Rolling Sand Dune Curves
  ctx.save();
  const duneCurves: [number, number][][] = [
    [[-40, -360], [20, -345], [90, -370]],
    [[60, -260], [130, -245], [200, -270]],
    [[160, -200], [220, -185], [290, -210]],
    [[240, -300], [310, -280], [370, -315]],
    [[110, -320], [170, -305], [230, -330]],
    [[-10, -250], [50, -230], [110, -260]],
    [[270, -360], [330, -340], [380, -380]],
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
    { x: -10, z: -550, w: 42, h: 28 },
    { x: 35, z: -560, w: 55, h: 32 },
    { x: 95, z: -545, w: 48, h: 30 },
    { x: 15, z: -520, w: 38, h: 22 },
    { x: 60, z: -525, w: 44, h: 24 },
    { x: 110, z: -515, w: 36, h: 20 },
  ];
  mesaBlocks.forEach((m) => {
    const [mx, my] = toC(m.x, m.z);
    const mw = (m.w / (bounds.maxX - bounds.minX)) * width;
    const mh = (m.h / (bounds.maxZ - bounds.minZ)) * height;

    // Drop shadow
    ctx.fillStyle = 'rgba(69, 26, 3, 0.4)';
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
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(mx - mw / 2 + 2, my);
    ctx.lineTo(mx + mw / 2 - 2, my);
    ctx.moveTo(mx - mw / 2 + 4, my + mh * 0.25);
    ctx.lineTo(mx + mw / 2 - 4, my + mh * 0.25);
    ctx.stroke();

    // Top rim highlight
    ctx.strokeStyle = '#fdba74';
    ctx.lineWidth = 1.2;
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
  // Mountain peaks encircling Titan Lake [-260, -450]
  const snowPeaks = [
    { x: -370, z: -480, w: 55, h: 50 },
    { x: -330, z: -530, w: 60, h: 58 },
    { x: -260, z: -545, w: 65, h: 62 },
    { x: -190, z: -525, w: 58, h: 54 },
    { x: -140, z: -460, w: 52, h: 48 },
    { x: -160, z: -390, w: 50, h: 45 },
    { x: -350, z: -400, w: 52, h: 48 },
    { x: -380, z: -440, w: 48, h: 44 },
    { x: -210, z: -370, w: 46, h: 42 },
  ];
  snowPeaks.forEach((p) => {
    const [px, py] = toC(p.x, p.z);
    const pw = (p.w / (bounds.maxX - bounds.minX)) * width;
    const ph = (p.h / (bounds.maxZ - bounds.minZ)) * height;

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
    ctx.lineTo(px + pw * 0.08, py - ph * 0.5);
    ctx.lineTo(px - pw * 0.1, py - ph * 0.58);
    ctx.lineTo(px - pw * 0.22, py - ph * 0.55);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Ancient Titan Alpine Lake
  const [tlx, tly] = toC(-260, -450);
  const tlrX = (56 / (bounds.maxX - bounds.minX)) * width;
  const tlrY = (42 / (bounds.maxZ - bounds.minZ)) * height;

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
  ctx.restore();

  // ==========================================================================
  // 6. EASTERN GREEN MOUNTAIN RIDGES
  // ==========================================================================
  ctx.save();
  const greenPeaks = [
    { x: 420, z: -250, w: 45, h: 36 },
    { x: 450, z: -210, w: 40, h: 32 },
    { x: 470, z: -150, w: 42, h: 34 },
    { x: 490, z: -70, w: 44, h: 36 },
    { x: 505, z: 40, w: 38, h: 30 },
  ];
  greenPeaks.forEach((p) => {
    const [px, py] = toC(p.x, p.z);
    const pw = (p.w / (bounds.maxX - bounds.minX)) * width;
    const ph = (p.h / (bounds.maxZ - bounds.minZ)) * height;

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
    [-300, 70, 14], [-275, 60, 16], [-250, 75, 18], [-225, 65, 15],
    [-290, 95, 17], [-265, 90, 20], [-240, 100, 18], [-215, 90, 16],
    [-280, 125, 16], [-255, 120, 19], [-230, 130, 17], [-200, 115, 15],
  ];
  swTrees.forEach(([tx, tz, rad]) => {
    const [cx, cy] = toC(tx, tz);
    const r = (rad / (bounds.maxX - bounds.minX)) * width;

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
  const [mfx, mfy] = toC(380, -140);
  const mfr = (54 / (bounds.maxX - bounds.minX)) * width;

  // Massive lush green forest canopy
  const mistForestClusters = [
    [mfx - mfr * 0.4, mfy - mfr * 0.3, mfr * 0.5],
    [mfx + mfr * 0.4, mfy - mfr * 0.35, mfr * 0.52],
    [mfx, mfy, mfr * 0.65],
    [mfx - mfr * 0.45, mfy + mfr * 0.3, mfr * 0.55],
    [mfx + mfr * 0.4, mfy + mfr * 0.35, mfr * 0.52],
    [mfx, mfy - mfr * 0.5, mfr * 0.45],
    [mfx, mfy + mfr * 0.5, mfr * 0.48],
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
    [mfx - mfr * 0.2, mfy - mfr * 0.1, mfr * 0.45, mfr * 0.25],
    [mfx + mfr * 0.2, mfy + mfr * 0.1, mfr * 0.48, mfr * 0.28],
    [mfx, mfy, mfr * 0.55, mfr * 0.3],
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
  ctx.save();
  const riverNW: [number, number][] = [
    [-240, -385], [-225, -330], [-205, -270], [-185, -210],
    [-165, -160], [-135, -115], [-95, -75], [-50, -40], [-5, -18], [35, -5]
  ];
  const riverDesert: [number, number][] = [
    [35, -5], [65, -45], [95, -95], [125, -145], [145, -205],
    [155, -265], [155, -325], [165, -385], [160, -445], [135, -495], [95, -525]
  ];
  const riverEast: [number, number][] = [
    [35, -5], [85, 10], [140, 18], [190, 15], [240, 10],
    [290, 22], [335, 38], [385, 40], [430, 25],
    [455, -15], [450, -75], [440, -135], [435, -195], [440, -255]
  ];
  const riverSouth: [number, number][] = [
    [35, -5], [38, 22], [42, 55], [45, 90], [46, 125], [48, 160], [50, 195]
  ];

  const riverBranches = [riverNW, riverDesert, riverEast, riverSouth];

  // Pass 1: Dark Blue Edge
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 6.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  riverBranches.forEach((b) => {
    drawSmoothSpline(ctx, b.map((p) => toC(p[0], p[1])));
    ctx.stroke();
  });

  // Pass 2: Light Blue Water Body
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4.2;
  riverBranches.forEach((b) => {
    drawSmoothSpline(ctx, b.map((p) => toC(p[0], p[1])));
    ctx.stroke();
  });

  // Pass 3: Delicate Water Shimmer
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1.2;
  riverBranches.forEach((b) => {
    drawSmoothSpline(ctx, b.map((p) => toC(p[0], p[1])));
    ctx.stroke();
  });
  ctx.restore();

  // ==========================================================================
  // 10. WOODEN BRIDGES (ACROSS 5 HIGHWAY INTERSECTIONS)
  // ==========================================================================
  ctx.save();
  const bridges: { x: number; z: number; angle: number; len: number }[] = [
    { x: -185, z: -210, angle: -Math.PI / 4, len: 16 }, // West Bridge (Astraea Highway)
    { x: 38, z: 22, angle: 0, len: 18 },                 // Central Suspension Bridge
    { x: 190, z: 15, angle: Math.PI / 2, len: 16 },      // Castle Bridge
    { x: 335, z: 38, angle: Math.PI / 2, len: 16 },      // East Bridge (Val-Kragor)
    { x: 430, z: 25, angle: Math.PI / 2, len: 16 },      // Northeast Bridge (Batu Lumut)
  ];
  bridges.forEach((br) => {
    const [bx, by] = toC(br.x, br.z);
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(br.angle);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(-br.len / 2 - 1, -4.5, br.len + 2, 9);

    // Deck planks
    ctx.fillStyle = '#854d0e';
    ctx.fillRect(-br.len / 2, -3.5, br.len, 7);

    // Planks division lines
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 0.9;
    for (let px = -br.len / 2 + 2; px <= br.len / 2 - 2; px += 2.8) {
      ctx.beginPath();
      ctx.moveTo(px, -3.5);
      ctx.lineTo(px, 3.5);
      ctx.stroke();
    }

    // Railings
    ctx.strokeStyle = '#713f12';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-br.len / 2, -3.5);
    ctx.lineTo(br.len / 2, -3.5);
    ctx.moveTo(-br.len / 2, 3.5);
    ctx.lineTo(br.len / 2, 3.5);
    ctx.stroke();

    ctx.restore();
  });
  ctx.restore();

  // ==========================================================================
  // 11. ROAD NETWORK (ROADS OVER CONTINENT)
  // ==========================================================================
  ctx.save();
  const roadWest: [number, number][] = [
    [20, 95], [-30, 80], [-80, 50], [-130, 10], [-170, -60],
    [-185, -210], [-215, -220], [-240, -220], [-240, -310], [-240, -385]
  ];
  const roadEast: [number, number][] = [
    [20, 95], [30, 60], [38, 22], [70, 20], [130, 18], [190, 15],
    [230, 15], [280, 25], [335, 38], [330, 80], [380, 50], [430, 25], [475, 20]
  ];
  const roadDesert: [number, number][] = [
    [20, -240], [-20, -320], [80, -320], [170, -340], [270, -380], [360, -440]
  ];
  const roadHarbor: [number, number][] = [
    [20, 175], [20, 130], [20, 95]
  ];

  const mainRoads = [roadWest, roadEast, roadHarbor];
  mainRoads.forEach((r) => {
    const pts = r.map((p) => toC(p[0], p[1]));
    ctx.strokeStyle = 'rgba(74, 54, 38, 0.4)';
    ctx.lineWidth = 4.0;
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
  ctx.strokeStyle = 'rgba(180, 130, 50, 0.4)';
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

  // 12A. Golden Pyramids [-20, -320]
  const [pyrX, pyrY] = toC(-20, -320);
  // Large Pyramid
  ctx.beginPath();
  ctx.moveTo(pyrX, pyrY - 14);
  ctx.lineTo(pyrX + 16, pyrY + 6);
  ctx.lineTo(pyrX - 16, pyrY + 6);
  ctx.closePath();
  ctx.fillStyle = '#eab308';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(pyrX, pyrY - 14);
  ctx.lineTo(pyrX + 16, pyrY + 6);
  ctx.lineTo(pyrX + 2, pyrY + 6);
  ctx.closePath();
  ctx.fillStyle = '#ca8a04';
  ctx.fill();

  // Small Pyramid
  ctx.beginPath();
  ctx.moveTo(pyrX + 18, pyrY - 6);
  ctx.lineTo(pyrX + 30, pyrY + 8);
  ctx.lineTo(pyrX + 8, pyrY + 8);
  ctx.closePath();
  ctx.fillStyle = '#fde047';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(pyrX + 18, pyrY - 6);
  ctx.lineTo(pyrX + 30, pyrY + 8);
  ctx.lineTo(pyrX + 20, pyrY + 8);
  ctx.closePath();
  ctx.fillStyle = '#b45309';
  ctx.fill();

  // 12B. Solaria Oasis Pool & Palms [20, -240]
  const [oasX, oasY] = toC(20, -240);
  ctx.fillStyle = '#06b6d4';
  ctx.beginPath();
  ctx.ellipse(oasX, oasY, 14, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Palm trees
  const palmCoords = [
    [oasX - 10, oasY - 5],
    [oasX + 8, oasY - 7],
    [oasX + 11, oasY + 4],
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

  // 12C. World Boss Crater Sinkhole [210, -360]
  const [cratX, cratY] = toC(210, -360);
  ctx.fillStyle = '#9a3412';
  ctx.beginPath();
  ctx.ellipse(cratX, cratY, 32, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#7c2d12';
  ctx.beginPath();
  ctx.ellipse(cratX, cratY, 24, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#451a03';
  ctx.beginPath();
  ctx.ellipse(cratX, cratY, 14, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Crater fissures
  ctx.strokeStyle = '#291003';
  ctx.lineWidth = 1.2;
  for (let f = 0; f < 6; f++) {
    const ang = (f / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cratX + Math.cos(ang) * 14, cratY + Math.sin(ang) * 9);
    ctx.lineTo(cratX + Math.cos(ang) * 34, cratY + Math.sin(ang) * 23);
    ctx.stroke();
  }

  // 12D. Sultan Malik Palace [360, -440]
  const [sultX, sultY] = toC(360, -440);
  // Marble Base
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(sultX - 18, sultY - 6, 36, 16);
  // Golden Center Onion Dome
  ctx.fillStyle = '#eab308';
  ctx.beginPath();
  ctx.arc(sultX, sultY - 8, 10, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sultX - 10, sultY - 8);
  ctx.quadraticCurveTo(sultX, sultY - 22, sultX, sultY - 22);
  ctx.quadraticCurveTo(sultX, sultY - 22, sultX + 10, sultY - 8);
  ctx.fill();
  // Spire
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(sultX, sultY - 22);
  ctx.lineTo(sultX, sultY - 27);
  ctx.stroke();
  // Minarets
  [-16, 16].forEach((mx) => {
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(sultX + mx - 2, sultY - 18, 4, 28);
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(sultX + mx, sultY - 18, 3, Math.PI, 0);
    ctx.fill();
  });

  // 12E. Astraea Imperial Castle & Sun Palace [-240, -220]
  const [astX, astY] = toC(-240, -220);
  // Outer Stone Wall
  ctx.fillStyle = '#64748b';
  ctx.fillRect(astX - 26, astY - 14, 52, 28);
  // Courtyard
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(astX - 20, astY - 9, 40, 18);
  // Central Keep / Palace
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(astX - 11, astY - 18, 22, 16);
  // Gate arch
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(astX - 26, astY, 4.5, -Math.PI / 2, Math.PI / 2);
  ctx.fill();
  // Corner towers with gold cones
  const astTowers = [
    [astX - 26, astY - 14],
    [astX + 26, astY - 14],
    [astX - 26, astY + 14],
    [astX + 26, astY + 14],
  ];
  astTowers.forEach(([tx, ty]) => {
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(tx, ty, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.moveTo(tx - 5.5, ty);
    ctx.lineTo(tx + 5.5, ty);
    ctx.lineTo(tx, ty - 10);
    ctx.closePath();
    ctx.fill();
  });

  // 12F. Puing Kastil Terbengkalai [230, -60]
  const [ruinX, ruinY] = toC(230, -60);
  ctx.fillStyle = '#475569';
  ctx.fillRect(ruinX - 10, ruinY - 6, 20, 12);
  // Broken battlements
  ctx.clearRect(ruinX - 4, ruinY - 6, 8, 4);
  ctx.fillStyle = '#334155';
  ctx.fillRect(ruinX - 12, ruinY - 12, 6, 18);

  // 12G. Desa Benteng Val-Kragor [330, 90]
  const [valX, valY] = toC(330, 90);
  // Palisade wooden boundary
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 3.5;
  ctx.strokeRect(valX - 22, valY - 14, 44, 28);
  // Red roofed keep
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(valX - 10, valY + 4);
  ctx.lineTo(valX, valY - 8);
  ctx.lineTo(valX + 10, valY + 4);
  ctx.closePath();
  ctx.fill();
  // Watchtowers
  [-22, 22].forEach((wx) => {
    ctx.fillStyle = '#92400e';
    ctx.fillRect(valX + wx - 3, valY - 16, 6, 8);
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(valX + wx - 4, valY - 16);
    ctx.lineTo(valX + wx + 4, valY - 16);
    ctx.lineTo(valX + wx, valY - 22);
    ctx.closePath();
    ctx.fill();
  });

  // 12H. Lembah Batu Lumut [480, 20]
  const [mosX, mosY] = toC(480, 20);
  ctx.fillStyle = '#65a30d';
  ctx.beginPath();
  ctx.ellipse(mosX, mosY, 20, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  // Standing megaliths
  const megaliths = [
    [mosX - 8, mosY - 2, 4, 11],
    [mosX + 2, mosY - 6, 5, 14],
    [mosX + 9, mosY + 1, 4, 10],
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

  // 12I. Desa Utama & Sanctuary [20, 130]
  const [vilX, vilY] = toC(20, 130);
  // Thatched huts
  [-12, 8].forEach((hx) => {
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(vilX + hx - 5, vilY - 2, 10, 8);
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(vilX + hx - 7, vilY - 2);
    ctx.lineTo(vilX + hx + 7, vilY - 2);
    ctx.lineTo(vilX + hx, vilY - 9);
    ctx.closePath();
    ctx.fill();
  });
  // Torii Gate
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(vilX + 16, vilY + 6);
  ctx.lineTo(vilX + 16, vilY - 5);
  ctx.moveTo(vilX + 24, vilY + 6);
  ctx.lineTo(vilX + 24, vilY - 5);
  ctx.moveTo(vilX + 13, vilY - 3);
  ctx.lineTo(vilX + 27, vilY - 3);
  ctx.stroke();

  // 12J. Pelabuhan Sanctuary [20, 175]
  const [harbX, harbY] = toC(20, 175);
  // Wooden piers
  ctx.fillStyle = '#78350f';
  ctx.fillRect(harbX - 16, harbY, 32, 5);
  ctx.fillRect(harbX - 8, harbY + 5, 6, 14);
  ctx.fillRect(harbX + 8, harbY + 5, 6, 14);
  // Ships
  [-18, 18].forEach((sx) => {
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.moveTo(harbX + sx - 7, harbY + 14);
    ctx.lineTo(harbX + sx + 7, harbY + 14);
    ctx.lineTo(harbX + sx + 5, harbY + 19);
    ctx.lineTo(harbX + sx - 5, harbY + 19);
    ctx.closePath();
    ctx.fill();
    // Mast
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(harbX + sx, harbY + 8);
    ctx.lineTo(harbX + sx, harbY + 14);
    ctx.stroke();
  });

  // 12K. Kaldera Sarang Naga [80, 360]
  const [volX, volY] = toC(80, 360);
  // Obsidian Island Body
  ctx.fillStyle = '#1c1917';
  ctx.beginPath();
  ctx.ellipse(volX, volY, 50, 32, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#292524';
  ctx.beginPath();
  ctx.ellipse(volX, volY, 38, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Fiery Molten Magma Pit
  const lavaGrad = ctx.createRadialGradient(volX, volY, 2, volX, volY, 24);
  lavaGrad.addColorStop(0, '#fef08a');
  lavaGrad.addColorStop(0.3, '#f97316');
  lavaGrad.addColorStop(0.7, '#ef4444');
  lavaGrad.addColorStop(1, '#991b1b');
  ctx.fillStyle = lavaGrad;
  ctx.beginPath();
  ctx.ellipse(volX, volY, 24, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // ==========================================================================
  // 13. CLEAN OUTLINED LANDMARK LABELS (NO BLACK BACKGROUND BOXES)
  // ==========================================================================
  drawOutlinedText(ctx, 'Lembah Danau Titan Kuno', toC(-260, -450)[0], toC(-260, -450)[1] - 32, 12);
  drawOutlinedText(ctx, 'Ibukota Kerajaan Emas', toC(-240, -220)[0], toC(-240, -220)[1] - 30, 11);
  drawOutlinedText(ctx, 'Astraea & Istana Kaisar', toC(-240, -220)[0], toC(-240, -220)[1] - 17, 11);
  drawOutlinedText(ctx, 'Kanyon Kuno', toC(50, -520)[0], toC(50, -520)[1] - 22, 12);
  drawOutlinedText(ctx, 'Piramida Emas Solaria', toC(-20, -320)[0], toC(-20, -320)[1] - 18, 11);
  drawOutlinedText(ctx, 'Oase Solaria', toC(20, -240)[0], toC(20, -240)[1] + 16, 11);
  drawOutlinedText(ctx, 'Kawah Cacat', toC(210, -360)[0], toC(210, -360)[1] - 30, 11);
  drawOutlinedText(ctx, 'World Boss (Lv. 10)', toC(210, -360)[0], toC(210, -360)[1] - 17, 11);
  drawOutlinedText(ctx, 'Istana Sultan Malik', toC(360, -440)[0], toC(360, -440)[1] - 32, 11);
  drawOutlinedText(ctx, 'Hutan Kabut Eldoria', toC(380, -140)[0], toC(380, -140)[1] - 36, 12);
  drawOutlinedText(ctx, 'Puing Kastil Terbengkalai', toC(230, -60)[0], toC(230, -60)[1] + 16, 11);
  drawOutlinedText(ctx, 'Desa Benteng Val-Kragor', toC(330, 90)[0], toC(330, 90)[1] + 24, 11);
  drawOutlinedText(ctx, 'Lembah Batu Lumut', toC(480, 20)[0], toC(480, 20)[1] + 18, 11);
  drawOutlinedText(ctx, 'Pelabuhan Sanctuary', toC(20, 175)[0], toC(20, 175)[1] + 24, 11);
  drawOutlinedText(ctx, 'Desa Utama & Padang Rumput Eldoria', toC(20, 130)[0] + 30, toC(20, 130)[1] + 18, 11);
  drawOutlinedText(ctx, 'Kaldera Sarang Naga', toC(80, 360)[0], toC(80, 360)[1] + 32, 12);

  ctx.restore();
}
