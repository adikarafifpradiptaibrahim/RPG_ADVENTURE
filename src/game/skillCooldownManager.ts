import { CharacterClass } from '../types/game';
import { SKILL_COOLDOWNS } from './skills';

export type SkillCooldownKey =
  | 'rogue_dagger_q'
  | 'rogue_bow_q'
  | 'rogue_dash'
  | 'rogue_smoke_r'
  | 'rogue_dagger_f'
  | 'rogue_bow_f'
  | 'warrior_q'
  | 'warrior_dash'
  | 'warrior_r'
  | 'warrior_ult'
  | 'mage_q'
  | 'mage_e'
  | 'mage_r'
  | 'mage_f';

export interface HudSkillCooldownSlotState {
  key: SkillCooldownKey;
  remaining: number;
  maxCooldown: number;
  charges: number;
  maxCharges: number;
  internalRemaining: number;
  internalMax: number;
  readyFlash: boolean;
}

export type HudCooldownSlotName = 'skill1' | 'skill2' | 'skill3' | 'skill4' | 'dash';
export type HudSkillCooldownMap = Partial<Record<HudCooldownSlotName, HudSkillCooldownSlotState>>;

interface SkillSlotInternal {
  key: SkillCooldownKey;
  maxCooldown: number;
  remaining: number;
  maxCharges: number;
  charges: number;
  internalMax: number;
  internalRemaining: number;
  readyFlashTimer: number;
}

interface SkillSlotDefinition {
  key: SkillCooldownKey;
  maxCooldown: number;
  maxCharges: number;
  internalMax: number;
}

const SKILL_DEFINITIONS: SkillSlotDefinition[] = [
  // Assassin / Hunter (Dual Mode: Q & F per mode, E Dash & R Smoke Veil shared)
  { key: 'rogue_dagger_q', maxCooldown: SKILL_COOLDOWNS.HUNTER_DAGGER_Q, maxCharges: 1, internalMax: 0 },
  { key: 'rogue_bow_q', maxCooldown: SKILL_COOLDOWNS.ASTRAL_EAGLE, maxCharges: 1, internalMax: 0 },
  {
    key: 'rogue_dash',
    maxCooldown: SKILL_COOLDOWNS.HUNTER_DECOY_DASH_RECHARGE,
    maxCharges: 2,
    internalMax: SKILL_COOLDOWNS.HUNTER_DECOY_DASH_INTERNAL,
  },
  { key: 'rogue_smoke_r', maxCooldown: SKILL_COOLDOWNS.HUNTER_SMOKE_VEIL, maxCharges: 1, internalMax: 0 },
  { key: 'rogue_dagger_f', maxCooldown: SKILL_COOLDOWNS.HUNTER_DAGGER_ULT, maxCharges: 1, internalMax: 0 },
  { key: 'rogue_bow_f', maxCooldown: SKILL_COOLDOWNS.SKYWARD_VOLLEY, maxCharges: 1, internalMax: 0 },

  // Knight / Warrior (Q has 3 charges, 5s per charge, 0.35s internal CD)
  {
    key: 'warrior_q',
    maxCooldown: SKILL_COOLDOWNS.WARRIOR_CRESCENT_RECHARGE,
    maxCharges: 3,
    internalMax: SKILL_COOLDOWNS.WARRIOR_CRESCENT_INTERNAL,
  },
  { key: 'warrior_dash', maxCooldown: SKILL_COOLDOWNS.WARRIOR_DASH, maxCharges: 1, internalMax: 0 },
  { key: 'warrior_r', maxCooldown: SKILL_COOLDOWNS.WARRIOR_AEGIS, maxCharges: 1, internalMax: 0 },
  { key: 'warrior_ult', maxCooldown: SKILL_COOLDOWNS.WARRIOR_ULTIMATE, maxCharges: 1, internalMax: 0 },

  // Mage
  { key: 'mage_q', maxCooldown: SKILL_COOLDOWNS.GLACIAL_BARRAGE, maxCharges: 1, internalMax: 0 },
  { key: 'mage_e', maxCooldown: SKILL_COOLDOWNS.ARCANE_BLINK, maxCharges: 1, internalMax: 0 },
  { key: 'mage_r', maxCooldown: SKILL_COOLDOWNS.CAHAYA_SUCI, maxCharges: 1, internalMax: 0 },
  { key: 'mage_f', maxCooldown: SKILL_COOLDOWNS.CELESTIAL_APOCALYPSE, maxCharges: 1, internalMax: 0 },
];

/**
 * Centralized global cooldown & charge manager across all roles.
 * Tracks Dual Mode Assassin Q/F independently while preserving universal Dash & Smoke Veil across weapon switches.
 */
export class SkillCooldownManager {
  private slots: Map<SkillCooldownKey, SkillSlotInternal> = new Map();
  private listeners = new Set<() => void>();

  constructor() {
    for (const def of SKILL_DEFINITIONS) {
      this.slots.set(def.key, {
        key: def.key,
        maxCooldown: def.maxCooldown,
        remaining: 0,
        maxCharges: def.maxCharges,
        charges: def.maxCharges,
        internalMax: def.internalMax,
        internalRemaining: 0,
        readyFlashTimer: 0,
      });
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch { }
    });
  }

  public resetAll(): void {
    this.slots.forEach((slot) => {
      slot.remaining = 0;
      slot.charges = slot.maxCharges;
      slot.internalRemaining = 0;
      slot.readyFlashTimer = 0;
    });
    this.notify();
  }

  public forceZeroAll(): void {
    let changed = false;
    this.slots.forEach((slot) => {
      if (slot.remaining > 0 || slot.internalRemaining > 0 || slot.charges < slot.maxCharges) {
        slot.remaining = 0;
        slot.internalRemaining = 0;
        slot.charges = slot.maxCharges;
        changed = true;
      }
    });
    if (changed) this.notify();
  }

  public canUse(
    key: SkillCooldownKey,
    zeroCooldown: boolean
  ): { ok: boolean; reason?: 'cooldown' | 'internal' | 'no_charges'; remaining: number } {
    if (zeroCooldown) {
      return { ok: true, remaining: 0 };
    }
    const slot = this.slots.get(key);
    if (!slot) return { ok: true, remaining: 0 };

    if (slot.maxCharges > 1) {
      if (slot.charges <= 0) {
        return { ok: false, reason: 'no_charges', remaining: slot.remaining };
      }
      if (slot.internalRemaining > 0) {
        return { ok: false, reason: 'internal', remaining: slot.internalRemaining };
      }
      return { ok: true, remaining: 0 };
    }

    if (slot.remaining > 0) {
      return { ok: false, reason: 'cooldown', remaining: slot.remaining };
    }
    return { ok: true, remaining: 0 };
  }

  public consume(key: SkillCooldownKey, zeroCooldown: boolean): boolean {
    const slot = this.slots.get(key);
    if (!slot) return true;

    if (zeroCooldown) {
      slot.remaining = 0;
      slot.internalRemaining = 0;
      slot.charges = slot.maxCharges;
      return true;
    }

    if (slot.maxCharges > 1) {
      if (slot.charges <= 0 || slot.internalRemaining > 0) return false;
      slot.charges -= 1;
      slot.internalRemaining = slot.internalMax;
      if (slot.remaining <= 0) {
        slot.remaining = slot.maxCooldown;
      }
      this.notify();
      return true;
    }

    if (slot.remaining > 0) return false;
    slot.charges = 0;
    slot.remaining = slot.maxCooldown;
    this.notify();
    return true;
  }

  public update(delta: number, zeroCooldown: boolean): void {
    if (zeroCooldown) {
      this.forceZeroAll();
      return;
    }
    if (delta <= 0) return;

    this.slots.forEach((slot) => {
      if (slot.readyFlashTimer > 0) {
        slot.readyFlashTimer = Math.max(0, slot.readyFlashTimer - delta);
      }

      if (slot.maxCharges > 1) {
        if (slot.internalRemaining > 0) {
          slot.internalRemaining = Math.max(0, slot.internalRemaining - delta);
        }
        if (slot.charges < slot.maxCharges) {
          slot.remaining -= delta;
          while (slot.remaining <= 0 && slot.charges < slot.maxCharges) {
            slot.charges += 1;
            slot.readyFlashTimer = 0.25;
            if (slot.charges < slot.maxCharges) {
              slot.remaining += slot.maxCooldown;
            } else {
              slot.remaining = 0;
            }
          }
        }
      } else if (slot.remaining > 0) {
        slot.remaining = Math.max(0, slot.remaining - delta);
        if (slot.remaining === 0) {
          slot.charges = 1;
          slot.readyFlashTimer = 0.25;
        }
      }
    });
  }

  public hasAnyActive(): boolean {
    for (const slot of this.slots.values()) {
      if (
        slot.remaining > 0 ||
        slot.internalRemaining > 0 ||
        slot.charges < slot.maxCharges ||
        slot.readyFlashTimer > 0
      ) {
        return true;
      }
    }
    return false;
  }

  public getState(key: SkillCooldownKey): HudSkillCooldownSlotState {
    const slot = this.slots.get(key);
    if (!slot) {
      return {
        key,
        remaining: 0,
        maxCooldown: 1,
        charges: 1,
        maxCharges: 1,
        internalRemaining: 0,
        internalMax: 0,
        readyFlash: false,
      };
    }
    return {
      key: slot.key,
      remaining: slot.remaining,
      maxCooldown: slot.maxCooldown,
      charges: slot.charges,
      maxCharges: slot.maxCharges,
      internalRemaining: slot.internalRemaining,
      internalMax: slot.internalMax,
      readyFlash: slot.readyFlashTimer > 0,
    };
  }

  public getHudMap(charClass: CharacterClass, hunterWeaponMode: 'dagger' | 'bow'): HudSkillCooldownMap {
    if (charClass === 'warrior') {
      return {
        skill1: this.getState('warrior_q'),
        skill2: this.getState('warrior_ult'),
        skill3: this.getState('warrior_r'),
        dash: this.getState('warrior_dash'),
      };
    }
    if (charClass === 'mage') {
      return {
        skill1: this.getState('mage_q'),
        skill2: this.getState('mage_e'),
        skill3: this.getState('mage_r'),
        skill4: this.getState('mage_f'),
      };
    }
    return {
      skill1: this.getState(hunterWeaponMode === 'bow' ? 'rogue_bow_q' : 'rogue_dagger_q'),
      skill2: this.getState('rogue_dash'),
      skill3: this.getState('rogue_smoke_r'),
      skill4: this.getState(hunterWeaponMode === 'bow' ? 'rogue_bow_f' : 'rogue_dagger_f'),
    };
  }
}
