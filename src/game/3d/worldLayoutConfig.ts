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
      y: 2.00,
      z: -60,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 40,
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
      x: 460,
      y: 2.00,
      z: -420,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 50,
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
      flattenRadius: 65,
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
      flattenRadius: 35,
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
      flattenRadius: 40,
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
      flattenRadius: 55,
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
      flattenRadius: 55,
      category: 'boss',
    },
    desert_sandworm: {
      id: 'desert_sandworm',
      name: 'Ancient Sandworm Lair',
      nameId: 'Sarang Sandworm Gurun',
      x: -580,
      y: 0.50,
      z: -220,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 50,
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
      flattenRadius: 28,
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
      flattenRadius: 38,
      category: 'boss',
    },
    caldera_sw_satellite: {
      id: 'caldera_sw_satellite',
      name: 'Caldera SW Satellite Island',
      nameId: 'Pulau Satelit Barat Daya Kaldera',
      x: -75,
      y: 6.50,
      z: 875,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 25,
      category: 'island',
    },
    caldera_nw_satellite: {
      id: 'caldera_nw_satellite',
      name: 'Caldera NW Satellite Island',
      nameId: 'Pulau Satelit Barat Laut Kaldera',
      x: -65,
      y: 5.50,
      z: 775,
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
      z: 750,
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
      y: 2.10,
      z: -170,
      rotationY: -0.4,
      length: 28,
      width: 4.8,
      scale: 1.0,
      type: 'stone',
    },
    bridge_astraea_east: {
      id: 'bridge_astraea_east',
      name: 'Astraea East River Bridge',
      nameId: 'Jembatan 2: Jembatan Poros Timur Astraea',
      x: 95,
      y: 2.10,
      z: -60,
      rotationY: 0.436, // Aligned with road crossing vector Math.atan2(70, 150)
      length: 26,
      width: 4.8,
      scale: 1.0,
      type: 'stone',
    },
    bridge_caldera_sw: {
      id: 'bridge_caldera_sw',
      name: 'Caldera SW Volcanic Chain Bridge',
      nameId: 'Jembatan Rantai Vulkanik Barat Daya',
      x: -23,
      y: 2.40,
      z: 853,
      rotationY: -0.32,
      length: 32,
      width: 4.2,
      scale: 1.0,
      type: 'stone',
    },
    bridge_caldera_nw: {
      id: 'bridge_caldera_nw',
      name: 'Caldera NW Volcanic Chain Bridge',
      nameId: 'Jembatan Rantai Vulkanik Barat Laut',
      x: -19,
      y: 2.40,
      z: 800,
      rotationY: 0.48,
      length: 32,
      width: 4.2,
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
 * 5. DEFINISI ZONA AMAN PEMUKIMAN (SAFE_ZONES) & TITIK RESPAWN CHECKPOINT
 * Radius perlindungan 95-130 unit di seluruh 6 pemukiman utama Eldoria:
 * 1. Desa Utama Eldoria [20, -60] - radius 120
 * 2. Pelabuhan Sanctuary [20, 20] - radius 95
 * 3. Desa Gurun Solaria [-540, -420] - radius 110
 * 4. Ibukota Kerajaan Astraea [460, -420] - radius 130
 * 5. Benteng Val-Kragor [580, 130] - radius 110
 * 6. Istana Sultan Taj Mahal [-540, -540] - radius 110
 */
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
}

export const SAFE_ZONES: SafeZoneDef[] = [
  {
    id: 'town_sanctuary',
    waypointId: 'wp_village',
    name: 'Sanctuary Village',
    nameId: 'Desa Utama Eldoria',
    x: 20,
    z: -60,
    radius: 120,
    respawnX: 20,
    respawnZ: -55,
  },
  {
    id: 'town_harbor',
    waypointId: 'wp_harbor',
    name: 'Sanctuary Coastal Harbor',
    nameId: 'Pelabuhan Sanctuary',
    x: 20,
    z: 20,
    radius: 95,
    respawnX: 20,
    respawnZ: 10,
  },
  {
    id: 'town_solaria',
    waypointId: 'wp_solaria_village',
    name: 'Solaria Desert Village',
    nameId: 'Desa Gurun Solaria',
    x: -540,
    z: -420,
    radius: 110,
    respawnX: -540,
    respawnZ: -415,
  },
  {
    id: 'town_astraea',
    waypointId: 'wp_astraea',
    name: 'Grand Imperial Capital Astraea',
    nameId: 'Ibukota Kerajaan Astraea',
    x: 460,
    z: -420,
    radius: 130,
    respawnX: 460,
    respawnZ: -370,
  },
  {
    id: 'town_valkragor',
    waypointId: 'wp_valkragor',
    name: 'Fortress Val-Kragor',
    nameId: 'Benteng Val-Kragor',
    x: 580,
    z: 130,
    radius: 110,
    respawnX: 580,
    respawnZ: 115,
  },
  {
    id: 'town_sultan_palace',
    waypointId: 'wp_sultan_palace',
    name: 'Sultan Malik Grand Palace',
    nameId: 'Istana Sultan Taj Mahal',
    x: -540,
    z: -540,
    radius: 110,
    respawnX: -540,
    respawnZ: -505,
  },
];

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

