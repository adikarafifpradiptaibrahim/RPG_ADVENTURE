/**
 * Principal WebGL Performance Engineer & Browser Architecture Specialist
 * Anti-Freeze Smooth Loading Scheduler
 * 
 * Uses double-hop scheduling (requestAnimationFrame + setTimeout(0)) to ensure
 * the browser's compositor, paint pipeline, and UI macrotask queue run smoothly
 * throughout 0% - 100% world loading.
 */

import { getDeviceProfile } from './deviceProfiler';

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
      // Combination of rAF + setTimeout(0) guarantees:
      // 1. Browser executes layout, paint, and CSS spinner animations smoothly.
      // 2. Macrotask queue runs: tab switching, window events, and user clicks are processed.
      // 3. Completely eliminates "Page Unresponsive" dialogs.
      await new Promise<void>((resolve) => {
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(() => setTimeout(resolve, 0));
        } else {
          setTimeout(resolve, 0);
        }
      });
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
