export type GraphicsPresetId = 'low' | 'medium' | 'high' | 'ultra' | 'custom';
export type SkyQuality = 'low' | 'medium' | 'high';

export interface GraphicsSettings {
  preset: GraphicsPresetId;
  renderScale: number; // DPR scale: PC 0.75..2.0 | Mobile 0.65..1.4
  shadows: boolean;
  enableShadows?: boolean;
  shadowQuality?: 'low' | 'medium' | 'high' | 'ultra';
  shadowResolution?: number; // 0, 512, 1024, 1536, 2048
  enableGrass?: boolean;
  grassDensity?: number; // 0..1 (rumput & bunga)
  enableParticles?: boolean;
  enableFog?: boolean;
  enableBloomGlow?: boolean;
  skyQuality?: SkyQuality;
  particleDensity: 'low' | 'medium' | 'high';
  renderDistance: number; // PC: 320..950 | Mobile: 160..380
  targetFps: number; // 30, 60, 0
  fxaa?: boolean;
}

export function isMobileRenderDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const hasTouch = 'ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0;
  return uaMobile || window.innerWidth < 768 || (hasTouch && window.innerHeight <= 580 && window.innerWidth <= 1100);
}

// 1. Desktop / PC Profile Presets (Low, Medium, High, Ultra)
export const PC_GRAPHICS_PRESETS: Record<'low' | 'medium' | 'high' | 'ultra', GraphicsSettings> = {
  low: {
    preset: 'low',
    renderScale: 1.0,
    shadows: false,
    enableShadows: false,
    shadowQuality: 'low',
    shadowResolution: 0,
    enableGrass: false,
    grassDensity: 0,
    enableParticles: false,
    enableFog: false,
    enableBloomGlow: false,
    skyQuality: 'low',
    particleDensity: 'low',
    renderDistance: 320,
    targetFps: 60,
    fxaa: false,
  },
  medium: {
    preset: 'medium',
    renderScale: 1.25,
    shadows: true,
    enableShadows: true,
    shadowQuality: 'medium',
    shadowResolution: 1024,
    enableGrass: true,
    grassDensity: 0.55,
    enableParticles: true,
    enableFog: true,
    enableBloomGlow: true,
    skyQuality: 'medium',
    particleDensity: 'medium',
    renderDistance: 520,
    targetFps: 60,
    fxaa: true,
  },
  high: {
    preset: 'high',
    renderScale: 1.6,
    shadows: true,
    enableShadows: true,
    shadowQuality: 'high',
    shadowResolution: 1536,
    enableGrass: true,
    grassDensity: 0.85,
    enableParticles: true,
    enableFog: true,
    enableBloomGlow: true,
    skyQuality: 'high',
    particleDensity: 'high',
    renderDistance: 740,
    targetFps: 0,
    fxaa: true,
  },
  ultra: {
    preset: 'ultra',
    renderScale: 2.0,
    shadows: true,
    enableShadows: true,
    shadowQuality: 'ultra',
    shadowResolution: 2048,
    enableGrass: true,
    grassDensity: 1.0,
    enableParticles: true,
    enableFog: true,
    enableBloomGlow: true,
    skyQuality: 'high',
    particleDensity: 'high',
    renderDistance: 950,
    targetFps: 0,
    fxaa: true,
  },
};

// Backward-compatible alias for legacy imports
export const GRAPHICS_PRESETS = PC_GRAPHICS_PRESETS;

// 2. Mobile Profile Presets (Low 0 shadow DPR 0.75 far 160 | Medium 512 DPR 1.0 far 250 | High 1024 DPR 1.4 far 380)
export const MOBILE_GRAPHICS_PRESETS: Record<'low' | 'medium' | 'high', GraphicsSettings> = {
  low: {
    preset: 'low',
    renderScale: 0.75,
    shadows: false,
    enableShadows: false,
    shadowQuality: 'low',
    shadowResolution: 0,
    enableGrass: false,
    grassDensity: 0,
    enableParticles: false,
    enableFog: true,
    enableBloomGlow: false,
    skyQuality: 'low',
    particleDensity: 'low',
    renderDistance: 160,
    targetFps: 60,
    fxaa: false,
  },
  medium: {
    preset: 'medium',
    renderScale: 1.0,
    shadows: true,
    enableShadows: true,
    shadowQuality: 'low',
    shadowResolution: 512,
    enableGrass: true,
    grassDensity: 0.35,
    enableParticles: true,
    enableFog: true,
    enableBloomGlow: false,
    skyQuality: 'medium',
    particleDensity: 'medium',
    renderDistance: 250,
    targetFps: 60,
    fxaa: false,
  },
  high: {
    preset: 'high',
    renderScale: 1.4,
    shadows: true,
    enableShadows: true,
    shadowQuality: 'high',
    shadowResolution: 1024,
    enableGrass: true,
    grassDensity: 0.75,
    enableParticles: true,
    enableFog: true,
    enableBloomGlow: true,
    skyQuality: 'high',
    particleDensity: 'high',
    renderDistance: 380,
    targetFps: 60,
    fxaa: true,
  },
};

export const PC_GRAPHICS_STORAGE_KEY = 'graphics_pc';
export const MOBILE_GRAPHICS_STORAGE_KEY = 'graphics_mobile';
const LEGACY_STORAGE_KEY = 'eldoria_graphics_settings';

export function getActiveGraphicsProfileKey(isMobile = isMobileRenderDevice()): string {
  return isMobile ? MOBILE_GRAPHICS_STORAGE_KEY : PC_GRAPHICS_STORAGE_KEY;
}

export function getGraphicsPresetForDevice(
  preset: 'low' | 'medium' | 'high' | 'ultra',
  isMobile = isMobileRenderDevice()
): GraphicsSettings {
  if (isMobile) {
    const mobileKey = preset === 'ultra' ? 'high' : preset;
    return { ...MOBILE_GRAPHICS_PRESETS[mobileKey] };
  }
  return { ...PC_GRAPHICS_PRESETS[preset] };
}

function sanitizeGraphicsForDevice(rawParsed: Partial<GraphicsSettings>, isMobile: boolean): GraphicsSettings {
  const defaultSettings = isMobile ? MOBILE_GRAPHICS_PRESETS.medium : PC_GRAPHICS_PRESETS.medium;
  const presetName = (rawParsed.preset || 'medium') as GraphicsPresetId;

  if (!isMobile && (presetName === 'low' || presetName === 'medium' || presetName === 'high' || presetName === 'ultra')) {
    return { ...PC_GRAPHICS_PRESETS[presetName] };
  }
  if (isMobile && (presetName === 'low' || presetName === 'medium' || presetName === 'high')) {
    return { ...MOBILE_GRAPHICS_PRESETS[presetName] };
  }

  const maxDpr = isMobile ? 1.4 : 2.0;
  const minDpr = isMobile ? 0.6 : 0.75;
  const minDist = isMobile ? 140 : 320;
  const maxDist = isMobile ? 380 : 950;
  const rawShadow = Boolean(rawParsed.enableShadows ?? rawParsed.shadows ?? defaultSettings.shadows);
  const rawGrass = rawParsed.enableGrass !== undefined ? Boolean(rawParsed.enableGrass) : Boolean(defaultSettings.enableGrass);
  const fallbackShadowRes = rawShadow ? (isMobile ? 512 : 1024) : 0;

  return {
    preset: isMobile && presetName === 'ultra' ? 'high' : presetName,
    renderScale: Math.max(minDpr, Math.min(maxDpr, Number(rawParsed.renderScale ?? defaultSettings.renderScale))),
    shadows: rawShadow,
    enableShadows: rawShadow,
    shadowQuality: rawParsed.shadowQuality || defaultSettings.shadowQuality,
    shadowResolution: Math.max(
      0,
      Math.min(isMobile ? 1024 : 2048, Number(rawParsed.shadowResolution ?? fallbackShadowRes))
    ),
    enableGrass: rawGrass,
    grassDensity: rawGrass
      ? Math.max(0.1, Math.min(1.0, Number(rawParsed.grassDensity ?? defaultSettings.grassDensity ?? 0.6)))
      : 0,
    enableParticles: rawParsed.enableParticles !== undefined ? Boolean(rawParsed.enableParticles) : Boolean(defaultSettings.enableParticles),
    enableFog: rawParsed.enableFog !== undefined ? Boolean(rawParsed.enableFog) : Boolean(defaultSettings.enableFog),
    enableBloomGlow:
      rawParsed.enableBloomGlow !== undefined ? Boolean(rawParsed.enableBloomGlow) : Boolean(defaultSettings.enableBloomGlow),
    skyQuality: rawParsed.skyQuality || defaultSettings.skyQuality || 'medium',
    particleDensity: rawParsed.particleDensity || defaultSettings.particleDensity,
    renderDistance: Math.max(minDist, Math.min(maxDist, Number(rawParsed.renderDistance ?? defaultSettings.renderDistance))),
    targetFps: rawParsed.targetFps ?? defaultSettings.targetFps,
    fxaa: rawParsed.fxaa ?? defaultSettings.fxaa,
  };
}

export function loadGraphicsSettings(forMobile = isMobileRenderDevice()): GraphicsSettings {
  const defaultSettings = forMobile ? MOBILE_GRAPHICS_PRESETS.medium : PC_GRAPHICS_PRESETS.medium;
  if (typeof window === 'undefined') return { ...defaultSettings };

  const storageKey = getActiveGraphicsProfileKey(forMobile);
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GraphicsSettings>;
      if (parsed && typeof parsed === 'object') {
        return sanitizeGraphicsForDevice(parsed, forMobile);
      }
    }

    // One-time safe migration from legacy single key without cross-polluting PC/Mobile
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const legacyParsed = JSON.parse(legacyRaw) as Partial<GraphicsSettings>;
      if (legacyParsed && typeof legacyParsed === 'object') {
        const migrated = sanitizeGraphicsForDevice(legacyParsed, forMobile);
        localStorage.setItem(storageKey, JSON.stringify(migrated));
        return migrated;
      }
    }
  } catch (e) {
    console.warn('Failed to load graphics settings from localStorage:', e);
  }
  return { ...defaultSettings };
}

export function saveGraphicsSettings(settings: GraphicsSettings, forMobile = isMobileRenderDevice()): void {
  if (typeof window === 'undefined') return;
  try {
    const storageKey = getActiveGraphicsProfileKey(forMobile);
    const sanitized = sanitizeGraphicsForDevice(settings, forMobile);
    localStorage.setItem(storageKey, JSON.stringify(sanitized));
  } catch (e) {
    console.warn('Failed to save graphics settings to localStorage:', e);
  }
}
