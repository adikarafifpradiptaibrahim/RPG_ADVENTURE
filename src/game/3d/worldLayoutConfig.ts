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
  version: 1,
  lastUpdated: '2026-11-23T20:00:00.000Z',
  landmarks: {
    village: {
      id: 'village',
      name: 'Sanctuary Village & Central Plains',
      nameId: 'Desa Utama & Padang Rumput Eldoria',
      x: -35,
      y: 0.25,
      z: 135,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 40,
      category: 'village',
    },
    harbor: {
      id: 'harbor',
      name: 'Sanctuary Coastal Harbor',
      nameId: 'Pelabuhan Sanctuary',
      x: 0,
      y: 0.35,
      z: 180,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 25,
      category: 'village',
    },
    astraea: {
      id: 'astraea',
      name: 'Grand Imperial Kingdom of Astraea',
      nameId: 'Ibukota Kerajaan Emas Astraea & Istana Kaisar',
      x: -250,
      y: 2.00,
      z: -240,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 50,
      category: 'castle',
    },
    valkragor: {
      id: 'valkragor',
      name: 'Fortress Village Val-Kragor',
      nameId: 'Desa Benteng Val-Kragor',
      x: 310,
      y: 2.00,
      z: 115,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 45,
      category: 'castle',
    },
    abandoned_castle: {
      id: 'abandoned_castle',
      name: 'Abandoned Castle Ruins',
      nameId: 'Puing Kastil Terbengkalai',
      x: 220,
      y: 1.40,
      z: -30,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 35,
      category: 'landmark',
    },
    desert_village: {
      id: 'desert_village',
      name: 'Solaria Desert Village & Bazaar',
      nameId: 'Desa Gurun & Bazaar Solaria',
      x: 135,
      y: 1.80,
      z: -245,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 35,
      category: 'desert',
    },
    oasis: {
      id: 'oasis',
      name: 'Hidden Solaria Oasis',
      nameId: 'Oase Solaria',
      x: 85,
      y: 0.50,
      z: -230,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 25,
      category: 'desert',
    },
    pyramid: {
      id: 'pyramid',
      name: 'Solaria Golden Pyramid',
      nameId: 'Piramida Emas Solaria',
      x: 30,
      y: 1.50,
      z: -350,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 35,
      category: 'desert',
    },
    sultan_palace: {
      id: 'sultan_palace',
      name: 'Sultan Malik Grand Palace',
      nameId: 'Istana Sultan Malik',
      x: 410,
      y: 2.00,
      z: -470,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 40,
      category: 'desert',
    },
    kawah_boss: {
      id: 'kawah_boss',
      name: 'Ancient Titan Colosseum Arena',
      nameId: 'Kawah Cacat World Boss (Lv. 10)',
      x: 235,
      y: 1.80,
      z: -380,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 50,
      category: 'boss',
    },
    desert_sandworm: {
      id: 'desert_sandworm',
      name: 'Ancient Sandworm Lair',
      nameId: 'Sarang Sandworm Gurun',
      x: -30,
      y: 0.50,
      z: -220,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 25,
      category: 'boss',
    },
    danau_titan: {
      id: 'danau_titan',
      name: 'Ancient Titan Lake Valley',
      nameId: 'Lembah Danau Titan Kuno',
      x: -310,
      y: -2.50,
      z: -480,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 55,
      category: 'landmark',
    },
    canyon: {
      id: 'canyon',
      name: 'Ancient Canyon',
      nameId: 'Kanyon Kuno',
      x: 160,
      y: 13.0,
      z: -540,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 50,
      category: 'landmark',
    },
    mage_tower: {
      id: 'mage_tower',
      name: 'Thunderpeak Mage Tower',
      nameId: 'Mage Tower Puncak Halilintar',
      x: 110,
      y: 4.50,
      z: -10,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 20,
      category: 'landmark',
    },
    moss_valley: {
      id: 'moss_valley',
      name: 'Moss Rock Valley',
      nameId: 'Lembah Batu Lumut',
      x: 465,
      y: 0.35,
      z: 35,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 35,
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
    bridge_astraea: {
      id: 'bridge_astraea',
      name: 'Astraea Highway River Crossing',
      nameId: 'Jembatan 1: Penyeberangan Astraea',
      x: -190,
      y: 0.45,
      z: -230,
      rotationY: 0,
      length: 26,
      width: 4.8,
      scale: 1.0,
      type: 'stone',
    },
    bridge_south_chasm: {
      id: 'bridge_south_chasm',
      name: 'Central South Suspension Bridge',
      nameId: 'Jembatan 2: Jembatan Gantung Hilir Selatan',
      x: 15,
      y: 1.35,
      z: 110,
      rotationY: 0,
      length: 24,
      width: 4.8,
      scale: 1.0,
      type: 'suspension',
    },
    bridge_moss_valley: {
      id: 'bridge_moss_valley',
      name: 'Moss Rock Valley Bridge',
      nameId: 'Jembatan 3: Jembatan Lembah Lumut',
      x: 380,
      y: 0.55,
      z: 35,
      rotationY: 1.5707963267948966, // 90 deg
      length: 24,
      width: 4.2,
      scale: 1.0,
      type: 'stone',
    },
    bridge_puing_kastil: {
      id: 'bridge_puing_kastil',
      name: 'Castle Ruins River Crossing',
      nameId: 'Jembatan 4: Penyeberangan Puing Kastil',
      x: 155,
      y: 0.85,
      z: 54,
      rotationY: 0.7853981633974483, // 45 deg
      length: 24,
      width: 4.2,
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
