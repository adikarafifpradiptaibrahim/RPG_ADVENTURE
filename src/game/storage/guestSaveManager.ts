import { CharacterClass, Item, PlayerStats, Quest } from '../../types/game';
import { GraphicsSettings, GRAPHICS_PRESETS } from '../graphicsSettings';
import { TouchControlMode } from '../../components/VirtualJoystick';
import { soundManager } from '../audio';
import { setMouseSensitivityMultiplier, getMouseSensitivityMultiplier } from '../CameraControls';
import { setSavedControlMode } from '../../components/VirtualJoystick';

export const GUEST_STORAGE_KEY = 'eldoria_guest_save_v1';
export const SAVE_SCHEMA_VERSION = 1;

export interface GuestProfile {
  guestId: string; // e.g. "Guest_#4829"
  displayName: string;
  createdAt: number;
}

export interface DeviceSettings {
  graphics: GraphicsSettings;
  cameraSensitivity: number;
  audio: {
    isMuted: boolean;
    bgmVolume: number;
    sfxVolume: number;
  };
  controls: {
    touchControlMode: TouchControlMode;
    showTouchControls: boolean;
  };
  customKeybindings: Record<string, string>;
  hudPreferences: {
    showDamageNumbers: boolean;
    showMinimap: boolean;
    showQuestTracker: boolean;
  };
}

export interface RoleSaveData {
  stats: PlayerStats;
  inventory: Item[];
  quests: Quest[];
  lastPosition: { x: number; y: number; z: number };
  lastRegion: string;
  savedAt: number;
  playTimeSeconds: number;
}

export interface EldoriaGuestSaveData {
  version: number;
  guestProfile: GuestProfile;
  deviceSettings: DeviceSettings;
  roleSaves: Partial<Record<CharacterClass, RoleSaveData>>;
}

/**
 * Generate unique local guest id (e.g. Guest_#4829)
 */
export function generateGuestId(): string {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `Guest_#${randomSuffix}`;
}

/**
 * Default initial device settings
 */
export function getDefaultDeviceSettings(): DeviceSettings {
  let touchDetected = false;
  try {
    if (typeof window !== 'undefined') {
      touchDetected =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches;
    }
  } catch {}

  return {
    graphics: { ...GRAPHICS_PRESETS.medium },
    cameraSensitivity: 1.0,
    audio: {
      isMuted: false,
      bgmVolume: 0.5,
      sfxVolume: 0.8,
    },
    controls: {
      touchControlMode: 'joystick',
      showTouchControls: touchDetected,
    },
    customKeybindings: {
      moveForward: 'KeyW',
      moveBackward: 'KeyS',
      moveLeft: 'KeyA',
      moveRight: 'KeyD',
      jump: 'Space',
      sprint: 'ShiftLeft',
      attack: 'Mouse0',
      skill1: 'KeyQ',
      skill2: 'KeyE',
      skill3: 'KeyR',
      skill4: 'KeyF',
      interact: 'KeyF',
      worldMap: 'KeyM',
      inventory: 'KeyI',
      pause: 'Escape',
    },
    hudPreferences: {
      showDamageNumbers: true,
      showMinimap: true,
      showQuestTracker: true,
    },
  };
}

/**
 * Default initial guest data container
 */
export function createDefaultGuestSaveData(): EldoriaGuestSaveData {
  const guestId = generateGuestId();
  return {
    version: SAVE_SCHEMA_VERSION,
    guestProfile: {
      guestId,
      displayName: guestId,
      createdAt: Date.now(),
    },
    deviceSettings: getDefaultDeviceSettings(),
    roleSaves: {},
  };
}

/**
 * Safely load all guest save data from browser localStorage with schema version check & migration.
 */
export function getGuestSaveData(): EldoriaGuestSaveData {
  if (typeof window === 'undefined' || !window.localStorage) {
    return createDefaultGuestSaveData();
  }

  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) {
      const fresh = createDefaultGuestSaveData();
      saveGuestSaveData(fresh);
      return fresh;
    }

    const parsed = JSON.parse(raw) as Partial<EldoriaGuestSaveData>;
    if (!parsed || typeof parsed !== 'object') {
      const fallback = createDefaultGuestSaveData();
      saveGuestSaveData(fallback);
      return fallback;
    }

    // Migration / Sanitization
    const defaults = createDefaultGuestSaveData();
    const guestProfile: GuestProfile = {
      guestId: parsed.guestProfile?.guestId || defaults.guestProfile.guestId,
      displayName: parsed.guestProfile?.displayName || parsed.guestProfile?.guestId || defaults.guestProfile.displayName,
      createdAt: parsed.guestProfile?.createdAt || Date.now(),
    };

    const deviceSettings: DeviceSettings = {
      graphics: {
        ...defaults.deviceSettings.graphics,
        ...(parsed.deviceSettings?.graphics || {}),
      },
      cameraSensitivity:
        typeof parsed.deviceSettings?.cameraSensitivity === 'number'
          ? parsed.deviceSettings.cameraSensitivity
          : defaults.deviceSettings.cameraSensitivity,
      audio: {
        isMuted: parsed.deviceSettings?.audio?.isMuted ?? defaults.deviceSettings.audio.isMuted,
        bgmVolume: parsed.deviceSettings?.audio?.bgmVolume ?? defaults.deviceSettings.audio.bgmVolume,
        sfxVolume: parsed.deviceSettings?.audio?.sfxVolume ?? defaults.deviceSettings.audio.sfxVolume,
      },
      controls: {
        touchControlMode: parsed.deviceSettings?.controls?.touchControlMode || defaults.deviceSettings.controls.touchControlMode,
        showTouchControls: parsed.deviceSettings?.controls?.showTouchControls ?? defaults.deviceSettings.controls.showTouchControls,
      },
      customKeybindings: {
        ...defaults.deviceSettings.customKeybindings,
        ...(parsed.deviceSettings?.customKeybindings || {}),
      },
      hudPreferences: {
        ...defaults.deviceSettings.hudPreferences,
        ...(parsed.deviceSettings?.hudPreferences || {}),
      },
    };

    const roleSaves: Partial<Record<CharacterClass, RoleSaveData>> = {};
    if (parsed.roleSaves && typeof parsed.roleSaves === 'object') {
      for (const key of ['warrior', 'mage', 'rogue'] as CharacterClass[]) {
        const rData = parsed.roleSaves[key];
        if (rData && rData.stats) {
          roleSaves[key] = {
            stats: rData.stats,
            inventory: Array.isArray(rData.inventory) ? rData.inventory : [],
            quests: Array.isArray(rData.quests) ? rData.quests : [],
            lastPosition: rData.lastPosition || { x: -40, y: 0, z: 148 },
            lastRegion: rData.lastRegion || 'Desa Sanctuary',
            savedAt: rData.savedAt || Date.now(),
            playTimeSeconds: rData.playTimeSeconds || 0,
          };
        }
      }
    }

    return {
      version: SAVE_SCHEMA_VERSION,
      guestProfile,
      deviceSettings,
      roleSaves,
    };
  } catch (err) {
    console.warn('[guestSaveManager] Failed to read guest save, creating default fallback:', err);
    const fallback = createDefaultGuestSaveData();
    saveGuestSaveData(fallback);
    return fallback;
  }
}

/**
 * Safely persist all guest data to localStorage
 */
export function saveGuestSaveData(data: EldoriaGuestSaveData): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    data.version = SAVE_SCHEMA_VERSION;
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(data));
    // Dispatch custom event for reactive UI updates across modals
    window.dispatchEvent(new CustomEvent('eldoria_guest_save_changed', { detail: data }));
    return true;
  } catch (err) {
    console.error('[guestSaveManager] Error saving to localStorage:', err);
    return false;
  }
}

/**
 * Get guest profile
 */
export function getGuestProfile(): GuestProfile {
  return getGuestSaveData().guestProfile;
}

/**
 * Update guest profile (displayName)
 */
export function updateGuestProfile(partial: Partial<GuestProfile>): void {
  const full = getGuestSaveData();
  full.guestProfile = { ...full.guestProfile, ...partial };
  saveGuestSaveData(full);
}

/**
 * Get device settings
 */
export function getDeviceSettings(): DeviceSettings {
  return getGuestSaveData().deviceSettings;
}

/**
 * Update device settings and persist immediately
 */
export function updateDeviceSettings(partial: Partial<DeviceSettings>): void {
  const full = getGuestSaveData();
  full.deviceSettings = {
    ...full.deviceSettings,
    ...partial,
  };
  saveGuestSaveData(full);
  applyDeviceSettings(full.deviceSettings);
}

/**
 * Apply device settings to audio, camera, and controls singletons
 */
export function applyDeviceSettings(settings: DeviceSettings): void {
  try {
    // 1. Audio
    if (settings.audio) {
      soundManager.setMuted(settings.audio.isMuted);
      soundManager.setBgmVolume(settings.audio.bgmVolume);
      soundManager.setSfxVolume(settings.audio.sfxVolume);
    }

    // 2. Camera sensitivity
    if (typeof settings.cameraSensitivity === 'number') {
      setMouseSensitivityMultiplier(settings.cameraSensitivity);
    }

    // 3. Touch control mode
    if (settings.controls?.touchControlMode) {
      setSavedControlMode(settings.controls.touchControlMode);
    }

    // 4. Touch control visibility legacy key
    if (typeof settings.controls?.showTouchControls === 'boolean') {
      try {
        localStorage.setItem('eldoria_touch_controls', String(settings.controls.showTouchControls));
      } catch {}
    }
  } catch (err) {
    console.warn('[guestSaveManager] applyDeviceSettings error:', err);
  }
}

/**
 * Get saved progress for a specific role (warrior / mage / rogue)
 */
export function getRoleSave(role: CharacterClass): RoleSaveData | null {
  const full = getGuestSaveData();
  return full.roleSaves[role] || null;
}

/**
 * Check if a role has existing save data
 */
export function hasRoleSave(role: CharacterClass): boolean {
  const save = getRoleSave(role);
  return !!save && !!save.stats && save.stats.level >= 1;
}

/**
 * Check if the browser has meaningful local guest progress that can be migrated to cloud
 */
export function hasLocalGuestProgress(): boolean {
  const data = getGuestSaveData();
  if (!data || !data.roleSaves) return false;
  const roles = Object.keys(data.roleSaves) as CharacterClass[];
  if (roles.length === 0) return false;

  return roles.some((roleKey) => {
    const r = data.roleSaves[roleKey];
    if (!r || !r.stats) return false;
    return (
      r.stats.level > 1 ||
      r.stats.exp > 0 ||
      (r.stats.gold && r.stats.gold > 50) ||
      (r.inventory && r.inventory.length > 0) ||
      (r.quests && r.quests.length > 0) ||
      (r.playTimeSeconds && r.playTimeSeconds > 5)
    );
  });
}

/**
 * Save progress for a specific role
 */
export function saveRoleProgress(role: CharacterClass, roleData: RoleSaveData): boolean {
  const full = getGuestSaveData();
  roleData.savedAt = Date.now();
  full.roleSaves[role] = roleData;
  return saveGuestSaveData(full);
}

/**
 * Reset / delete progress for a single role
 */
export function resetRoleSave(role: CharacterClass): void {
  const full = getGuestSaveData();
  delete full.roleSaves[role];
  saveGuestSaveData(full);
}

/**
 * Total reset of all guest data and local cache
 */
export function resetAllGuestData(): EldoriaGuestSaveData {
  try {
    localStorage.removeItem(GUEST_STORAGE_KEY);
    localStorage.removeItem('ancients_quest_save_slots_v1');
    localStorage.removeItem('eldoria_unlocked_checkpoints');
    localStorage.removeItem('ancients_quest_graphics_settings');
    localStorage.removeItem('ancients_quest_control_mode');
    localStorage.removeItem('ancients_quest_mouse_sensitivity');
    localStorage.removeItem('eldoria_touch_controls');
  } catch {}

  const fresh = createDefaultGuestSaveData();
  saveGuestSaveData(fresh);
  applyDeviceSettings(fresh.deviceSettings);
  return fresh;
}
