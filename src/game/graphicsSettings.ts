export interface GraphicsSettings {
  preset: 'low' | 'medium' | 'high';
  renderScale: number; // 0.65, 0.85, 1.0
  shadows: boolean;
  particleDensity: 'low' | 'medium' | 'high';
  renderDistance: number; // 50, 90, 150
  targetFps: number; // 30, 60, 0 (unlimited)
}

export const GRAPHICS_PRESETS: Record<'low' | 'medium' | 'high', GraphicsSettings> = {
  low: {
    preset: 'low',
    renderScale: 0.65,
    shadows: false,
    particleDensity: 'low',
    renderDistance: 50,
    targetFps: 60,
  },
  medium: {
    preset: 'medium',
    renderScale: 0.85,
    shadows: true,
    particleDensity: 'medium',
    renderDistance: 90,
    targetFps: 60,
  },
  high: {
    preset: 'high',
    renderScale: 1.0,
    shadows: true,
    particleDensity: 'high',
    renderDistance: 150,
    targetFps: 0,
  },
};

const STORAGE_KEY = 'eldoria_graphics_settings';

export function loadGraphicsSettings(): GraphicsSettings {
  if (typeof window === 'undefined') return GRAPHICS_PRESETS.medium;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.renderScale === 'number') {
        return {
          preset: parsed.preset || 'medium',
          renderScale: Math.max(0.5, Math.min(1.5, parsed.renderScale)),
          shadows: Boolean(parsed.shadows),
          particleDensity: parsed.particleDensity || 'medium',
          renderDistance: Math.max(30, Math.min(250, parsed.renderDistance || 90)),
          targetFps: parsed.targetFps ?? 60,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to load graphics settings from localStorage:', e);
  }
  return GRAPHICS_PRESETS.medium;
}

export function saveGraphicsSettings(settings: GraphicsSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save graphics settings to localStorage:', e);
  }
}
