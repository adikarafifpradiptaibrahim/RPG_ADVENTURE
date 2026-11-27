export interface GraphicsSettings {
  preset: 'low' | 'medium' | 'high' | 'custom';
  renderScale: number; // 0.65, 0.75, 0.85, 1.0, 1.25
  shadows: boolean;
  enableShadows?: boolean;
  shadowQuality?: 'low' | 'medium' | 'high';
  enableGrass?: boolean;
  enableParticles?: boolean;
  enableFog?: boolean;
  particleDensity: 'low' | 'medium' | 'high';
  renderDistance: number; // 50, 90, 150
  targetFps: number; // 30, 60, 0 (unlimited)
  fxaa?: boolean;
}

export const GRAPHICS_PRESETS: Record<'low' | 'medium' | 'high', GraphicsSettings> = {
  low: {
    preset: 'low',
    renderScale: 0.75,
    shadows: false,
    enableShadows: false,
    shadowQuality: 'low',
    enableGrass: false,
    enableParticles: false,
    enableFog: false,
    particleDensity: 'low',
    renderDistance: 50,
    targetFps: 60,
  },
  medium: {
    preset: 'medium',
    renderScale: 1.0,
    shadows: true,
    enableShadows: true,
    shadowQuality: 'low',
    enableGrass: true,
    enableParticles: true,
    enableFog: true,
    particleDensity: 'medium',
    renderDistance: 90,
    targetFps: 60,
  },
  high: {
    preset: 'high',
    renderScale: 1.25,
    shadows: true,
    enableShadows: true,
    shadowQuality: 'high',
    enableGrass: true,
    enableParticles: true,
    enableFog: true,
    particleDensity: 'high',
    renderDistance: 150,
    targetFps: 0,
  },
};

export function isMobileRenderDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const hasTouch = 'ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0;
  return uaMobile || window.innerWidth < 768 || (hasTouch && window.innerHeight <= 580 && window.innerWidth <= 1100);
}

export const MOBILE_GRAPHICS_PRESETS: Record<'low' | 'medium' | 'high', GraphicsSettings> = {
  low: {
    preset: 'low',
    renderScale: 0.75,
    shadows: false,
    enableShadows: false,
    shadowQuality: 'low',
    enableGrass: false,
    enableParticles: false,
    enableFog: true,
    particleDensity: 'low',
    renderDistance: 160,
    targetFps: 60,
  },
  medium: {
    preset: 'medium',
    renderScale: 1.0,
    shadows: true,
    enableShadows: true,
    shadowQuality: 'low',
    enableGrass: true,
    enableParticles: true,
    enableFog: true,
    particleDensity: 'medium',
    renderDistance: 260,
    targetFps: 60,
  },
  high: {
    preset: 'high',
    renderScale: 1.5,
    shadows: true,
    enableShadows: true,
    shadowQuality: 'high',
    enableGrass: true,
    enableParticles: true,
    enableFog: true,
    particleDensity: 'high',
    renderDistance: 420,
    targetFps: 60,
  },
};

export function getGraphicsPresetForDevice(preset: 'low' | 'medium' | 'high'): GraphicsSettings {
  return isMobileRenderDevice()
    ? { ...MOBILE_GRAPHICS_PRESETS[preset] }
    : { ...GRAPHICS_PRESETS[preset] };
}

const STORAGE_KEY = 'eldoria_graphics_settings';

export function loadGraphicsSettings(): GraphicsSettings {
  if (typeof window === 'undefined') return GRAPHICS_PRESETS.medium;
  const defaultSettings = isMobileRenderDevice()
    ? MOBILE_GRAPHICS_PRESETS.medium
    : GRAPHICS_PRESETS.medium;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.renderScale === 'number') {
        const presetName = parsed.preset || 'medium';
        if (isMobileRenderDevice() && (presetName === 'low' || presetName === 'medium' || presetName === 'high')) {
          return { ...MOBILE_GRAPHICS_PRESETS[presetName] };
        }
        return {
          preset: presetName,
          renderScale: Math.max(0.5, Math.min(1.5, parsed.renderScale)),
          shadows: Boolean(parsed.shadows ?? parsed.enableShadows ?? true),
          enableShadows: Boolean(parsed.enableShadows ?? parsed.shadows ?? true),
          shadowQuality: parsed.shadowQuality || 'medium',
          enableGrass: parsed.enableGrass !== undefined ? Boolean(parsed.enableGrass) : true,
          enableParticles: parsed.enableParticles !== undefined ? Boolean(parsed.enableParticles) : true,
          enableFog: parsed.enableFog !== undefined ? Boolean(parsed.enableFog) : true,
          particleDensity: parsed.particleDensity || 'medium',
          renderDistance: Math.max(30, Math.min(500, parsed.renderDistance || defaultSettings.renderDistance)),
          targetFps: parsed.targetFps ?? 60,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to load graphics settings from localStorage:', e);
  }
  return { ...defaultSettings };
}

export function saveGraphicsSettings(settings: GraphicsSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save graphics settings to localStorage:', e);
  }
}
