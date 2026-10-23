/**
 * Native Controls & Input Manager
 * 
 * Manages raw window and DOM keyboard and touch/joystick events directly.
 * 
 * CRITICAL PERFORMANCE GUARANTEE:
 * 1. Bypasses React state completely to prevent 60 FPS component re-renders.
 * 2. Stores keystrokes in a flat, boolean lookup table for zero-latency checks.
 * 3. Immediately clears keys on blur/visibilitychange to prevent ghost walking.
 */

export interface JoystickInputVector {
  x: number;
  y: number;
}

export class ControlsManager {
  private keys: Record<string, boolean> = Object.create(null);
  private joystick: JoystickInputVector = { x: 0, y: 0 };
  private isLocked: boolean = false;
  private isPaused: boolean = false;

  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;
  private onBlurBound: () => void;
  private onVisibilityChangeBound: () => void;

  constructor() {
    this.onKeyDownBound = this.handleKeyDown.bind(this);
    this.onKeyUpBound = this.handleKeyUp.bind(this);
    this.onBlurBound = this.resetKeys.bind(this);
    this.onVisibilityChangeBound = () => {
      if (document.hidden) this.resetKeys();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.onKeyDownBound, { passive: false });
      window.addEventListener('keyup', this.onKeyUpBound, { passive: true });
      window.addEventListener('blur', this.onBlurBound);
      window.addEventListener('focus', this.onBlurBound);
      document.addEventListener('visibilitychange', this.onVisibilityChangeBound);
    }
  }

  private handleKeyDown(e: KeyboardEvent) {
    // If typing in chat or input fields, bypass game input
    const activeEl = document.activeElement as HTMLElement | null;
    const tag = (activeEl?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || Boolean(activeEl?.isContentEditable)) {
      return;
    }

    if (this.isLocked || this.isPaused) {
      this.resetKeys();
      return;
    }

    const key = e.key.toLowerCase();
    const code = e.code.toLowerCase();

    this.keys[key] = true;
    this.keys[code] = true;

    // Prevent default scroll behavior for game navigation keys
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'space'].includes(code)) {
      e.preventDefault();
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    const key = e.key.toLowerCase();
    const code = e.code.toLowerCase();

    delete this.keys[key];
    delete this.keys[code];
  }

  public setJoystickVector(x: number, y: number) {
    this.joystick.x = x;
    this.joystick.y = y;
  }

  public getJoystickVector(): JoystickInputVector {
    return this.joystick;
  }

  public isKeyPressed(...names: string[]): boolean {
    if (this.isLocked || this.isPaused) return false;
    for (let i = 0; i < names.length; i++) {
      const n = names[i].toLowerCase();
      if (this.keys[n]) return true;
    }
    return false;
  }

  /**
   * Evaluates horizontal movement inputs instantly without object allocations.
   * Returns forward/back (-1 to +1) and right/left (-1 to +1).
   */
  public getMovementInput(): { forward: number; right: number } {
    if (this.isLocked || this.isPaused) {
      return { forward: 0, right: 0 };
    }

    let forward = 0;
    let right = 0;

    if (this.isKeyPressed('w', 'keyw', 'arrowup')) forward += 1;
    if (this.isKeyPressed('s', 'keys', 'arrowdown')) forward -= 1;
    if (this.isKeyPressed('d', 'keyd', 'arrowright')) right += 1;
    if (this.isKeyPressed('a', 'keya', 'arrowleft')) right -= 1;

    // Add joystick input
    if (Math.abs(this.joystick.x) > 0.04) right += this.joystick.x;
    if (Math.abs(this.joystick.y) > 0.04) forward -= this.joystick.y; // Y is inverted in screen space

    return { forward, right };
  }

  public resetKeys() {
    this.keys = Object.create(null);
    this.joystick.x = 0;
    this.joystick.y = 0;
  }

  public setLocked(locked: boolean) {
    this.isLocked = locked;
    if (locked) this.resetKeys();
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    if (paused) this.resetKeys();
  }

  public destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.onKeyDownBound);
      window.removeEventListener('keyup', this.onKeyUpBound);
      window.removeEventListener('blur', this.onBlurBound);
      window.removeEventListener('focus', this.onBlurBound);
      document.removeEventListener('visibilitychange', this.onVisibilityChangeBound);
    }
    this.resetKeys();
  }
}
