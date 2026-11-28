/**
 * Lead 3D World Architect & Technical Tooling Engineer
 * Centralized Single Source of Truth for World Layout Coordinates, Rotations & Scales.
 * 
 * In Dev Mode (localhost), this file is automatically written by the In-Game Visual World Editor
 * via the Vite Dev Server middleware endpoint (POST /__api/save-world-layout).
 */

export interface WorldLandmarkLayout {
  id: string;
  name: string;
  nameId: string;
  x: number;
  y: number;
  z: number;
  rotationY: number; // in radians
  scale: number;
  flattenRadius: number;
  category: 'village' | 'castle' | 'desert' | 'boss' | 'island' | 'landmark';
}

export interface WorldBridgeLayout {
  id: string;
  name: string;
  nameId: string;
  x: number;
  y: number;
  z: number;
  rotationY: number; // in radians
  length: number;
  width: number;
  scale: number;
  type: 'stone' | 'suspension' | 'wood';
}

export interface WorldLayoutConfig {
  version: number;
  lastUpdated: string;
  landmarks: Record<string, WorldLandmarkLayout>;
  bridges: Record<string, WorldBridgeLayout>;
}

export const WORLD_LAYOUT_CONFIG: WorldLayoutConfig = {
  version: 2,
  lastUpdated: '2026-11-24T12:00:00.000Z',
  landmarks: {
    village: {
      id: 'village',
      name: 'Sanctuary Village & Central Plains',
      nameId: 'Desa Utama & Padang Rumput Eldoria',
      x: 20,
      y: 2.10,
      z: -60,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 44,
      category: 'village',
    },
    harbor: {
      id: 'harbor',
      name: 'Sanctuary Coastal Harbor',
      nameId: 'Pelabuhan Sanctuary',
      x: 20,
      y: 0.25,
      z: 20,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 10,
      category: 'village',
    },
    astraea: {
      id: 'astraea',
      name: 'Grand Imperial Kingdom of Astraea',
      nameId: 'Ibukota Kerajaan Emas Astraea & Istana Kaisar',
      x: 575,
      y: 3.20,
      z: -495,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 122,
      category: 'castle',
    },
    valkragor: {
      id: 'valkragor',
      name: 'Fortress Village Val-Kragor',
      nameId: 'Desa Benteng Val-Kragor',
      x: 580,
      y: 3.80,
      z: 130,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 86,
      category: 'castle',
    },
    abandoned_castle: {
      id: 'abandoned_castle',
      name: 'Abandoned Castle Ruins',
      nameId: 'Puing Kastil Terbengkalai',
      x: 580,
      y: 2.40,
      z: -60,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 35,
      category: 'landmark',
    },
    desert_village: {
      id: 'desert_village',
      name: 'Solaria Desert Village & Bazaar',
      nameId: 'Desa Gurun & Bazaar Solaria',
      x: -540,
      y: 1.80,
      z: -420,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 62,
      category: 'desert',
    },
    oasis: {
      id: 'oasis',
      name: 'Hidden Solaria Oasis',
      nameId: 'Oase Solaria',
      x: -420,
      y: 0.85,
      z: -350,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 30,
      category: 'desert',
    },
    pyramid: {
      id: 'pyramid',
      name: 'Solaria Golden Pyramid',
      nameId: 'Piramida Emas Solaria',
      x: -360,
      y: 1.50,
      z: -520,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 35,
      category: 'desert',
    },
    sultan_palace: {
      id: 'sultan_palace',
      name: 'Sultan Malik Grand Palace',
      nameId: 'Istana Sultan Malik',
      x: -540,
      y: 2.00,
      z: -540,
      rotationY: -1.5707963267948966, // -90 deg, facing South towards Desert Village
      scale: 1.0,
      flattenRadius: 95,
      category: 'desert',
    },
    bossGolem: {
      id: 'bossGolem',
      name: 'Ancient Titan Colosseum Arena',
      nameId: 'Arena Colosseum Titan Kuno (Lv. 10)',
      x: 180,
      y: 4.50,
      z: -560,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 68,
      category: 'boss',
    },
    kawah_boss: {
      id: 'kawah_boss',
      name: 'Ancient Titan Colosseum Arena',
      nameId: 'Arena Colosseum Titan Kuno (Lv. 10)',
      x: 180,
      y: 4.50,
      z: -560,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 68,
      category: 'boss',
    },
    desert_sandworm: {
      id: 'desert_sandworm',
      name: 'Solaria Whirlwind Crater',
      nameId: 'Kawah Pusaran Solaria (Sarang Jarrus)',
      x: -840,
      y: 0.50,
      z: -260,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 55,
      category: 'boss',
    },
    danau_titan: {
      id: 'danau_titan',
      name: 'Ancient Titan Lake Valley',
      nameId: 'Lembah Danau Titan Kuno',
      x: 60,
      y: -2.50,
      z: -820,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 55,
      category: 'landmark',
    },
    canyon: {
      id: 'canyon',
      name: 'Ancient Canyon',
      nameId: 'Kanyon Kuno',
      x: -380,
      y: 3.50,
      z: -640,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 50,
      category: 'landmark',
    },
    mage_tower: {
      id: 'mage_tower',
      name: 'Thunderpeak Mage Tower',
      nameId: 'Mage Tower Puncak Halilintar',
      x: 270,
      y: 5.50,
      z: -260,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 50,
      category: 'landmark',
    },
    mist_forest: {
      id: 'mist_forest',
      name: 'Eldoria Mist Forest',
      nameId: 'Hutan Kabut Eldoria',
      x: 760,
      y: 3.20,
      z: -280,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 40,
      category: 'landmark',
    },
    moss_valley: {
      id: 'moss_valley',
      name: 'Moss Rock Valley',
      nameId: 'Lembah Batu Lumut',
      x: 580,
      y: 3.60,
      z: -120,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 55,
      category: 'landmark',
    },
    caldera: {
      id: 'caldera',
      name: 'Dragonfang Caldera Main Island (Altar)',
      nameId: 'Kepulauan Kaldera Naga (Lv. 12)',
      x: 40,
      y: 2.50,
      z: 840,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 54,
      category: 'boss',
    },
    caldera_sw_satellite: {
      id: 'caldera_sw_satellite',
      name: 'Caldera SW Satellite Island',
      nameId: 'Pulau Satelit Barat Daya Kaldera',
      x: -138,
      y: 6.50,
      z: 892,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 25,
      category: 'island',
    },
    caldera_nw_satellite: {
      id: 'caldera_nw_satellite',
      name: 'Caldera NW Satellite Island',
      nameId: 'Pulau Satelit Barat Laut Kaldera',
      x: -128,
      y: 5.50,
      z: 772,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 22,
      category: 'island',
    },
    caldera_dock: {
      id: 'caldera_dock',
      name: 'Caldera North Bay Charred Dock',
      nameId: 'Dermaga Kayu Hangus Teluk Utara',
      x: 40,
      y: 0.45,
      z: 716,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 15,
      category: 'island',
    },
    lighthouse_island: {
      id: 'lighthouse_island',
      name: 'Sailor Reef & Lighthouse Island',
      nameId: 'Pulau Mercusuar & Karang Pelaut',
      x: -220,
      y: 6.20,
      z: 460,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 28,
      category: 'island',
    },
    pirate_island: {
      id: 'pirate_island',
      name: 'Pirate Ruins Island',
      nameId: 'Pulau Reruntuhan Bajak Laut',
      x: -520,
      y: 0.50,
      z: 620,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 32,
      category: 'island',
    },
    rocky_reef_island: {
      id: 'rocky_reef_island',
      name: 'Craggy Reef Stacks',
      nameId: 'Pulau Karang Terjal',
      x: -780,
      y: 4.50,
      z: 280,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 25,
      category: 'island',
    },
  },
  bridges: {
    bridge_desert: {
      id: 'bridge_desert',
      name: 'Solaria West River Crossing',
      nameId: 'Jembatan 1: Penyeberangan Gurun Solaria',
      x: -120,
      y: 2.35,
      z: -170,
      rotationY: 1.1324, // Tegak lurus Sungai Gurun Barat & segaris jalur [-129.5,-149.5] -> [-110.5,-190.5]
      length: 30,
      width: 6.8,
      scale: 1.0,
      type: 'stone',
    },
    bridge_astraea_east: {
      id: 'bridge_astraea_east',
      name: 'Astraea East River Bridge',
      nameId: 'Jembatan 2: Jembatan Poros Timur Astraea',
      x: 95,
      y: 2.35,
      z: -60,
      rotationY: 0, // Tegak lurus Sungai Hilir Muara & segaris jalur [76,-60] -> [114,-60]
      length: 30,
      width: 6.8,
      scale: 1.0,
      type: 'stone',
    },
    bridge_mage_approach: {
      id: 'bridge_mage_approach',
      name: 'Mage Tower River Bridge',
      nameId: 'Jembatan 3: Jembatan Menara Sihir Timur',
      x: 200,
      y: 2.55,
      z: -168,
      rotationY: Math.PI / 2, // Tegak lurus Sungai Kerajaan Timur & segaris jalur [200,-148] -> [200,-188]
      length: 30,
      width: 6.8,
      scale: 1.0,
      type: 'stone',
    },
    bridge_valkragor_river: {
      id: 'bridge_valkragor_river',
      name: 'Val-Kragor North River Bridge',
      nameId: 'Jembatan 4: Jembatan Benteng Val-Kragor',
      x: 380,
      y: 2.55,
      z: -190,
      rotationY: -Math.PI / 2, // Tegak lurus Sungai Kerajaan Timur & segaris jalur [380,-210] -> [380,-170]
      length: 30,
      width: 6.8,
      scale: 1.0,
      type: 'stone',
    },
    bridge_caldera_north: {
      id: 'bridge_caldera_north',
      name: 'Caldera Grand Obsidian Lava Bridge',
      nameId: 'Jembatan Obsidian Agung Kaldera Naga',
      x: 40,
      y: 2.85,
      z: 769,
      rotationY: Math.PI / 2, // Membentang lurus Utara -> Selatan melintasi Danau Lahar [40, 749] -> [40, 789]
      length: 40,
      width: 9.0,
      scale: 1.0,
      type: 'stone',
    },
    bridge_caldera_sw: {
      id: 'bridge_caldera_sw',
      name: 'Caldera SW Volcanic Chain Bridge',
      nameId: 'Jembatan Rantai Vulkanik Barat Daya',
      x: -97,
      y: 3.10,
      z: 873,
      rotationY: 0.3218, // Vektor [-112, 878] -> [-82, 868] di luar tebing barat kaldera
      length: 34,
      width: 4.6,
      scale: 1.0,
      type: 'stone',
    },
    bridge_caldera_nw: {
      id: 'bridge_caldera_nw',
      name: 'Caldera NW Volcanic Chain Bridge',
      nameId: 'Jembatan Rantai Vulkanik Barat Laut',
      x: -87,
      y: 3.10,
      z: 790,
      rotationY: -0.3218, // Vektor [-102, 785] -> [-72, 795] di luar tebing barat laut kaldera
      length: 34,
      width: 4.6,
      scale: 1.0,
      type: 'stone',
    },
  },
};

/**
 * Helper to retrieve a landmark's current layout with fallback
 */
export function getLandmarkLayout(id: string): WorldLandmarkLayout | undefined {
  return WORLD_LAYOUT_CONFIG.landmarks[id];
}

/**
 * Helper to retrieve a bridge's current layout with fallback
 */
export function getBridgeLayout(id: string): WorldBridgeLayout | undefined {
  return WORLD_LAYOUT_CONFIG.bridges[id];
}

/**
 * 5. DEFINISI RESMI PEMUKIMAN AMAN (SAFE_SETTLEMENTS), SAFE_ZONES, & TITIK MASUK BOSS AMAN
 * Seluruh plazaPos berada di alun-alun terbuka yang tervalidasi bebas tabrakan bangunan/air mancur.
 */
export interface SafeSettlementDef {
  id: string;
  waypointId: string;
  name: string;
  nameId: string;
  x: number;
  z: number;
  radius: number;
  plazaPos: { x: number; z: number; rotationY: number };
}

export const SAFE_SETTLEMENTS: SafeSettlementDef[] = [
  {
    id: 'town_sanctuary',
    waypointId: 'wp_village',
    name: 'Sanctuary Village',
    nameId: 'Desa Utama Eldoria',
    x: 20,
    z: -60,
    radius: 120,
    plazaPos: { x: 20, z: -48, rotationY: 0 },
  },
  {
    id: 'town_harbor',
    waypointId: 'wp_harbor',
    name: 'Sanctuary Coastal Harbor',
    nameId: 'Pelabuhan Sanctuary',
    x: 20,
    z: 20,
    radius: 85,
    plazaPos: { x: 20, z: 12, rotationY: 0 },
  },
  {
    id: 'town_valkragor',
    waypointId: 'wp_valkragor',
    name: 'Fortress Val-Kragor',
    nameId: 'Benteng Val-Kragor',
    x: 580,
    z: 130,
    radius: 110,
    plazaPos: { x: 580, z: 118, rotationY: 0 },
  },
  {
    id: 'town_astraea',
    waypointId: 'wp_astraea',
    name: 'Grand Imperial Capital Astraea',
    nameId: 'Ibukota Astraea',
    x: 575,
    z: -495,
    radius: 130,
    plazaPos: { x: 575, z: -447, rotationY: Math.PI },
  },
  {
    id: 'town_sultan_palace',
    waypointId: 'wp_sultan_palace',
    name: 'Solaria Sultanate City',
    nameId: 'Kota Gurun Sultan',
    x: -540,
    z: -506,
    radius: 135,
    plazaPos: { x: -540, z: -468, rotationY: Math.PI },
  },
  {
    id: 'town_mage_tower',
    waypointId: 'wp_thunderpeak',
    name: 'Thunderpeak Mage Tower Plaza',
    nameId: 'Bundaran Mage Tower',
    x: 270,
    z: -260,
    radius: 65,
    plazaPos: { x: 270, z: -236, rotationY: Math.PI },
  },
];

export interface SafeZoneDef {
  id: string;
  waypointId: string;
  name: string;
  nameId: string;
  x: number;
  z: number;
  radius: number;
  respawnX: number;
  respawnZ: number;
  rotationY?: number;
}

export const SAFE_ZONES: SafeZoneDef[] = SAFE_SETTLEMENTS.map((s) => ({
  id: s.id,
  waypointId: s.waypointId,
  name: s.name,
  nameId: s.nameId,
  x: s.x,
  z: s.z,
  radius: s.radius,
  respawnX: s.plazaPos.x,
  respawnZ: s.plazaPos.z,
  rotationY: s.plazaPos.rotationY,
}));

export interface BossSafeEntranceDef {
  bossId: 'boss_dragonfang' | 'boss_titan' | 'boss_jarrus';
  presetId: 'ignis' | 'titan' | 'jarrus';
  waypointId: string;
  label: string;
  x: number;
  z: number;
  rotationY: number;
}

export const BOSS_SAFE_ENTRANCES: Record<'boss_dragonfang' | 'boss_titan' | 'boss_jarrus', BossSafeEntranceDef> = {
  boss_dragonfang: {
    bossId: 'boss_dragonfang',
    presetId: 'ignis',
    waypointId: 'wp_dragoncaldera',
    label: 'Gerbang Luar Jembatan Obsidian Kaldera [40, 738]',
    x: 40,
    z: 738,
    rotationY: 0, // Facing South straight across Obsidian Bridge toward Ignis
  },
  boss_titan: {
    bossId: 'boss_titan',
    presetId: 'titan',
    waypointId: 'wp_boss_crater',
    label: 'Gerbang Luar Selatan Colosseum Titan [180, -478]',
    x: 180,
    z: -478,
    rotationY: Math.PI, // Facing North straight into South Colosseum Gate
  },
  boss_jarrus: {
    bossId: 'boss_jarrus',
    presetId: 'jarrus',
    waypointId: 'wp_sandworm',
    label: 'Punggung Bukit Pasir Luar Kawah Jarrus [-840, -184]',
    x: -840,
    z: -184,
    rotationY: Math.PI, // Facing North toward Swirling Crater
  },
};

export function getSettlementById(id?: string | null): SafeSettlementDef {
  if (id) {
    const found = SAFE_SETTLEMENTS.find((s) => s.id === id);
    if (found) return found;
  }
  return SAFE_SETTLEMENTS[0];
}

/**
 * Cek apakah sebuah koordinat berada di dalam salah satu SAFE_ZONE pemukiman.
 */
export function isInsideSafeZone(x: number, z: number): boolean {
  for (let i = 0; i < SAFE_ZONES.length; i++) {
    const sz = SAFE_ZONES[i];
    const dx = x - sz.x;
    const dz = z - sz.z;
    if (dx * dx + dz * dz <= sz.radius * sz.radius) {
      return true;
    }
  }
  return false;
}

/**
 * Cari Safe Zone terdekat untuk fallback checkpoint/respawn
 */
export function getClosestSafeZone(x: number, z: number): SafeZoneDef {
  let closest = SAFE_ZONES[0];
  let minDistSq = Infinity;
  for (let i = 0; i < SAFE_ZONES.length; i++) {
    const sz = SAFE_ZONES[i];
    const dx = x - sz.x;
    const dz = z - sz.z;
    const dSq = dx * dx + dz * dz;
    if (dSq < minDistSq) {
      minDistSq = dSq;
      closest = sz;
    }
  }
  return closest;
}

