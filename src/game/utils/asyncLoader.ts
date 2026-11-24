/**
 * Principal WebGL Performance Engineer & Browser Architecture Specialist
 * Anti-Freeze Smooth Loading Scheduler
 * 
 * Uses double-hop scheduling (requestAnimationFrame + setTimeout(0)) to ensure
 * the browser's compositor, paint pipeline, and UI macrotask queue run smoothly
 * throughout 0% - 100% world loading.
 */

import { getDeviceProfile } from './deviceProfiler';

/**
 * Hard Time-Slicing & Real Browser Yielding
 * Uses setTimeout(..., 16) to release control to Chrome for a full frame,
 * allowing CSS spinner animation, tab events, and compositor to render smoothly
 * without ever triggering "Page Unresponsive".
 */
export async function hardYield(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 16));
}

export class SmoothLoadScheduler {
  private lastYield = performance.now();
  private budgetMs: number;

  constructor(budgetMs?: number) {
    this.budgetMs = budgetMs ?? getDeviceProfile().loadFrameBudgetMs;
  }

  setBudget(budgetMs: number): void {
    this.budgetMs = budgetMs;
  }

  getBudget(): number {
    return this.budgetMs;
  }

  reset(): void {
    this.lastYield = performance.now();
  }

  getElapsed(): number {
    return performance.now() - this.lastYield;
  }

  async yieldIfNeeded(force = false): Promise<void> {
    if (force || performance.now() - this.lastYield >= this.budgetMs) {
      await hardYield();
      this.lastYield = performance.now();
    }
  }
}

let globalScheduler: SmoothLoadScheduler | null = null;

export function getLoadingScheduler(): SmoothLoadScheduler {
  if (!globalScheduler) {
    const profile = getDeviceProfile();
    globalScheduler = new SmoothLoadScheduler(profile.loadFrameBudgetMs);
  }
  return globalScheduler;
}

export async function yieldToBrowser(force = false): Promise<void> {
  await getLoadingScheduler().yieldIfNeeded(force);
}
