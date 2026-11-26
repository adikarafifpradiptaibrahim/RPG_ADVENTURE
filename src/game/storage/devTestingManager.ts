/**
 * Local-only Developer & Testing Mode Manager.
 * All preferences are persisted exclusively in browser localStorage and MUST NEVER sync to Cloud Save.
 * Master toggle and every sub-toggle strictly default to `false` (OFF).
 */

export const DEV_TESTING_STORAGE_KEY = 'eldoria_dev_testing_settings_v1';

export interface DevTestingSettings {
  enabled: boolean; // Master Toggle: "Aktifkan Mode Developer"
  godMode: boolean; // HP kebal serangan & kebal kematian
  ccImmune: boolean; // Kebal Stun, Knockback, Knockup, Slow, & Pusaran Hisap
  infiniteEnergy: boolean; // MP & Stamina selalu 100%
  superDamage: boolean; // 10x ATK untuk testing cepat fase boss
  zeroCooldown: boolean; // 0 Cooldown untuk seluruh skill & dash
  spectatorMode: boolean; // Sinkronisasi status Spectator Mode (Freecam F3)
  showDebugOverlay: boolean; // Overlay FPS, XYZ, State AI & Fase Boss real-time
}

export function getDefaultDevTestingSettings(): DevTestingSettings {
  return {
    enabled: false,
    godMode: false,
    ccImmune: false,
    infiniteEnergy: false,
    superDamage: false,
    zeroCooldown: false,
    spectatorMode: false,
    showDebugOverlay: false,
  };
}

let cachedSettings: DevTestingSettings | null = null;
const listeners = new Set<(settings: DevTestingSettings) => void>();

function normalizeSettings(raw: Partial<DevTestingSettings> | null | undefined): DevTestingSettings {
  const defaults = getDefaultDevTestingSettings();
  if (!raw || typeof raw !== 'object') return defaults;
  return {
    enabled: Boolean(raw.enabled),
    godMode: Boolean(raw.godMode),
    ccImmune: Boolean(raw.ccImmune),
    infiniteEnergy: Boolean(raw.infiniteEnergy),
    superDamage: Boolean(raw.superDamage),
    zeroCooldown: Boolean(raw.zeroCooldown),
    spectatorMode: Boolean(raw.spectatorMode),
    showDebugOverlay: Boolean(raw.showDebugOverlay),
  };
}

export function getDevTestingSettings(): DevTestingSettings {
  if (cachedSettings) return cachedSettings;
  const defaults = getDefaultDevTestingSettings();
  if (typeof window === 'undefined' || !window.localStorage) {
    cachedSettings = defaults;
    return cachedSettings;
  }
  try {
    const raw = window.localStorage.getItem(DEV_TESTING_STORAGE_KEY);
    if (!raw) {
      cachedSettings = defaults;
      return cachedSettings;
    }
    cachedSettings = normalizeSettings(JSON.parse(raw));
  } catch {
    cachedSettings = defaults;
  }
  return cachedSettings;
}

/**
 * Returns effective active dev flags:
 * If Master Toggle `enabled` is false, ALL testing flags evaluate to false.
 */
export function getEffectiveDevTestingSettings(): DevTestingSettings {
  const s = getDevTestingSettings();
  if (!s.enabled) {
    return getDefaultDevTestingSettings();
  }
  return s;
}

function notifyDevSettingsListeners(next: DevTestingSettings): void {
  listeners.forEach((cb) => {
    try {
      cb(next);
    } catch { }
  });
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('eldoria_dev_settings_changed', { detail: next }));
    } catch { }
  }
}

export function saveDevTestingSettings(next: DevTestingSettings): DevTestingSettings {
  const normalized = normalizeSettings(next);
  cachedSettings = normalized;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(DEV_TESTING_STORAGE_KEY, JSON.stringify(normalized));
    } catch { }
  }
  notifyDevSettingsListeners(normalized);
  return normalized;
}

export function updateDevTestingSettings(
  partial: Partial<DevTestingSettings>
): DevTestingSettings {
  const current = getDevTestingSettings();
  return saveDevTestingSettings({ ...current, ...partial });
}

export function subscribeDevTestingSettings(
  listener: (settings: DevTestingSettings) => void
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
