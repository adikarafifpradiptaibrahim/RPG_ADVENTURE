/**
 * Principal WebGL Performance Engineer & Browser Architecture Specialist
 * Device Profiler & Hardware Capability Detection
 * 
 * Automatically detects device performance tier (Low, Medium, High)
 * to adapt loading budgets, instanced mesh densities, shadow resolutions,
 * and pixel ratios so that 0-100% loading never freezes the browser.
 */

export type DeviceTier = 'low' | 'medium' | 'high';

export interface DeviceProfile {
  tier: DeviceTier;
  isMobile: boolean;
  cores: number;
  memory: number; // in GB
  loadFrameBudgetMs: number;
  propDensityScale: number;
  maxPixelRatio: number;
  shadowMapSize: number;
  drawDistanceScale: number;
}

let cachedProfile: DeviceProfile | null = null;

export function detectDeviceCapabilities(): DeviceProfile {
  if (typeof window === 'undefined') {
    return {
      tier: 'medium',
      isMobile: false,
      cores: 4,
      memory: 4,
      loadFrameBudgetMs: 7,
      propDensityScale: 0.75,
      maxPixelRatio: 1.0,
      shadowMapSize: 2048,
      drawDistanceScale: 0.85,
    };
  }

  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    ('ontouchstart' in window && window.innerWidth < 768) ||
    window.innerWidth < 768;

  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 4;

  let tier: DeviceTier = 'medium';

  if (isMobile || cores <= 4 || memory <= 4) {
    tier = 'low';
  } else if (cores > 8 && !isMobile) {
    tier = 'high';
  } else {
    tier = 'medium';
  }

  // Check if player has manual override in localStorage
  try {
    const savedQuality = localStorage.getItem('game_graphics_tier') || localStorage.getItem('graphics_quality');
    if (savedQuality === 'low' || savedQuality === 'medium' || savedQuality === 'high') {
      tier = savedQuality;
    }
  } catch {
    // Ignore localStorage access errors
  }

  const windowPixelRatio = window.devicePixelRatio || 1;

  if (tier === 'low') {
    return {
      tier: 'low',
      isMobile,
      cores,
      memory,
      loadFrameBudgetMs: 4,
      propDensityScale: 0.45,
      maxPixelRatio: 1.0,
      shadowMapSize: 1024,
      drawDistanceScale: 0.65,
    };
  }

  if (tier === 'medium') {
    return {
      tier: 'medium',
      isMobile,
      cores,
      memory,
      loadFrameBudgetMs: 7,
      propDensityScale: 0.75,
      maxPixelRatio: Math.min(windowPixelRatio, 1.5),
      shadowMapSize: 2048,
      drawDistanceScale: 0.85,
    };
  }

  return {
    tier: 'high',
    isMobile,
    cores,
    memory,
    loadFrameBudgetMs: 12,
    propDensityScale: 1.0,
    maxPixelRatio: Math.min(windowPixelRatio, 2.0),
    shadowMapSize: 2048,
    drawDistanceScale: 1.0,
  };
}

export function getDeviceProfile(): DeviceProfile {
  if (!cachedProfile) {
    cachedProfile = detectDeviceCapabilities();
  }
  return cachedProfile;
}

export function setDeviceTierOverride(tier: DeviceTier): DeviceProfile {
  try {
    localStorage.setItem('game_graphics_tier', tier);
  } catch {
    // Ignore localStorage errors
  }
  cachedProfile = null;
  return getDeviceProfile();
}
