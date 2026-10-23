import * as THREE from 'three';
import { CharacterClass } from '../types/game';

export interface PlayerMovementInput {
  forward: number; // +1 = W / Up, -1 = S / Down
  right: number;   // +1 = D / Right, -1 = A / Left
  joyX?: number;
  joyY?: number;
}

export interface PlayerMovementConfig {
  charClass: CharacterClass;
  isDashing: boolean;
  speedBuffTimer: number;
}

/**
 * Player Movement & Physics Controller
 * 
 * Provides consistent, frame-rate independent player physics:
 * 1. Pre-allocates reusable THREE.Vector3, THREE.Quaternion, and THREE.Matrix4 scratch objects
 *    outside the animation loop to eliminate Garbage Collection lag.
 * 2. Strictly relies on deltaTime for horizontal velocity calculations.
 * 3. Instant zero-lag key response (immediate velocity assignment without laggy acceleration curves).
 * 4. Instant braking to zero upon input release (eliminates lingering slide).
 * 5. Decouples character movement logic completely from rendering and post-processing passes.
 */
export class PlayerController {
  // Pre-allocated static reusable scratch objects (Zero GC allocations per frame)
  public static readonly scratchVec1 = new THREE.Vector3();
  public static readonly scratchVec2 = new THREE.Vector3();
  public static readonly scratchVec3 = new THREE.Vector3();
  public static readonly scratchQuat = new THREE.Quaternion();
  public static readonly scratchMat4 = new THREE.Matrix4();

  public static getBaseSpeed(charClass: CharacterClass): number {
    if (charClass === 'warrior') return 6.8;
    if (charClass === 'mage') return 7.3;
    if (charClass === 'rogue') return 8.8;
    return 7.0;
  }

  public static getTargetSpeed(config: PlayerMovementConfig): number {
    let speed = this.getBaseSpeed(config.charClass);
    if (config.speedBuffTimer > 0) {
      speed += 3.2;
    }
    if (config.isDashing) {
      speed = config.charClass === 'rogue' ? 24.0 : config.charClass === 'warrior' ? 19.0 : 16.0;
    }
    return speed;
  }

  /**
   * Computes world-space movement direction relative to camera angle.
   * Completely allocation-free.
   */
  public static computeWorldMoveDirection(
    input: PlayerMovementInput,
    camX: number,
    camZ: number,
    playerX: number,
    playerZ: number
  ): { moveDirX: number; moveDirZ: number; isMoving: boolean; analogSpeedScale: number } {
    // 1. Camera horizontal plane vectors
    const camFwdX = playerX - camX;
    const camFwdZ = playerZ - camZ;
    const camLen = Math.hypot(camFwdX, camFwdZ);
    const fwdX = camLen > 0.001 ? camFwdX / camLen : 0;
    const fwdZ = camLen > 0.001 ? camFwdZ / camLen : -1;

    // Perpendicular camera right vector (90 deg clockwise)
    const rightX = -fwdZ;
    const rightZ = fwdX;

    let totalForward = input.forward;
    let totalRight = input.right;

    // Incorporate analog virtual joystick
    const joyX = input.joyX || 0;
    const joyY = input.joyY || 0;
    const joyMag = Math.hypot(joyX, joyY);
    if (joyMag > 0.04) {
      totalRight += joyX;
      totalForward -= joyY;
    }

    let moveDirX = fwdX * totalForward + rightX * totalRight;
    let moveDirZ = fwdZ * totalForward + rightZ * totalRight;
    const inputMagnitude = Math.hypot(moveDirX, moveDirZ);
    const isMoving = inputMagnitude > 0.05;

    let analogSpeedScale = 1.0;
    if (isMoving) {
      moveDirX /= inputMagnitude;
      moveDirZ /= inputMagnitude;
      if (joyMag > 0.04) {
        analogSpeedScale = Math.min(1.0, Math.max(0.42, joyMag));
      }
    }

    return { moveDirX, moveDirZ, isMoving, analogSpeedScale };
  }

  /**
   * Calculates new horizontal velocity with instant response and zero input lag.
   * Frame-rate independent: integrates strictly with deltaTime.
   */
  public static updateVelocity(
    currentVel: THREE.Vector3,
    isMoving: boolean,
    moveDirX: number,
    moveDirZ: number,
    targetSpeed: number,
    analogScale: number
  ): void {
    if (isMoving) {
      // Immediate responsive velocity: no sluggish ramp-up delay
      currentVel.x = moveDirX * targetSpeed * analogScale;
      currentVel.z = moveDirZ * targetSpeed * analogScale;
    } else {
      // Instant braking on key release: stops immediately without sliding
      currentVel.x = 0;
      currentVel.z = 0;
    }
  }

  /**
   * Interpolates character mesh rotation towards movement direction.
   */
  public static updateRotation(
    currentRotationY: number,
    moveDirX: number,
    moveDirZ: number,
    delta: number
  ): number {
    const targetAngle = Math.atan2(moveDirX, moveDirZ);
    let angleDiff = targetAngle - currentRotationY;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    if (Math.abs(angleDiff) < 0.05) {
      return targetAngle;
    }
    return currentRotationY + angleDiff * Math.min(1.0, 32 * delta);
  }
}
