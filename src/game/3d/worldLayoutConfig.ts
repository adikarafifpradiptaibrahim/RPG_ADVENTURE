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
      y: 0.25,
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
      y: 0.35,
      z: 130,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 25,
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
      x: 660,
      y: 2.00,
      z: 150,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 45,
      category: 'castle',
    },
    abandoned_castle: {
      id: 'abandoned_castle',
      name: 'Abandoned Castle Ruins',
      nameId: 'Puing Kastil Terbengkalai',
      x: 580,
      y: 1.40,
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
      x: -560,
      y: 1.80,
      z: -110,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 35,
      category: 'desert',
    },
    oasis: {
      id: 'oasis',
      name: 'Hidden Solaria Oasis',
      nameId: 'Oase Solaria',
      x: -400,
      y: 0.50,
      z: -290,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 25,
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
      x: -680,
      y: 2.00,
      z: -620,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 40,
      category: 'desert',
    },
    kawah_boss: {
      id: 'kawah_boss',
      name: 'Ancient Titan Colosseum Arena',
      nameId: 'Kawah Cacat World Boss (Lv. 10)',
      x: -720,
      y: 1.80,
      z: -340,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 50,
      category: 'boss',
    },
    desert_sandworm: {
      id: 'desert_sandworm',
      name: 'Ancient Sandworm Lair',
      nameId: 'Sarang Sandworm Gurun',
      x: -660,
      y: 0.50,
      z: -370,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 25,
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
      x: -280,
      y: 13.0,
      z: -760,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 50,
      category: 'landmark',
    },
    mage_tower: {
      id: 'mage_tower',
      name: 'Thunderpeak Mage Tower',
      nameId: 'Mage Tower Puncak Halilintar',
      x: 260,
      y: 4.50,
      z: -180,
      rotationY: 0,
      scale: 1.0,
      flattenRadius: 20,
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
      x: 680,
      y: 0.35,
      z: -160,
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
    bridge_desert: {
      id: 'bridge_desert',
      name: 'Solaria West River Crossing',
      nameId: 'Jembatan 1: Penyeberangan Gurun Solaria',
      x: -120,
      y: 0.45,
      z: -170,
      rotationY: -0.4,
      length: 28,
      width: 4.8,
      scale: 1.0,
      type: 'stone',
    },
    bridge_south_harbor: {
      id: 'bridge_south_harbor',
      name: 'South Harbor Confluence Bridge',
      nameId: 'Jembatan 2: Jembatan Muara Pelabuhan',
      x: 15,
      y: 0.40,
      z: 45,
      rotationY: 0.25,
      length: 24,
      width: 4.8,
      scale: 1.0,
      type: 'suspension',
    },
    bridge_astraea_east: {
      id: 'bridge_astraea_east',
      name: 'Astraea East River Bridge',
      nameId: 'Jembatan 3: Jembatan Kerajaan Astraea',
      x: 180,
      y: 0.55,
      z: -165,
      rotationY: 1.25,
      length: 24,
      width: 4.2,
      scale: 1.0,
      type: 'stone',
    },
    bridge_valkragor_pass: {
      id: 'bridge_valkragor_pass',
      name: 'Val-Kragor Fortress Crossing',
      nameId: 'Jembatan 4: Penyeberangan Benteng Val-Kragor',
      x: 580,
      y: 0.85,
      z: 40,
      rotationY: 0.7853981633974483, // 45 deg
      length: 26,
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
