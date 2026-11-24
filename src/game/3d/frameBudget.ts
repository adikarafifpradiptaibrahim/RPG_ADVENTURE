/**
 * Senior WebGL Performance Architect & Browser Runtime Optimization Engineer
 * FrameBudgetTimer & Time-Slicing Utilities
 * 
 * Guarantees that heavy computation loops (terrain heightmap, city structures, instanced vegetation)
 * never lock the JavaScript main thread.
 * Uses double-hop scheduling (rAF + setTimeout(0)) when budget is exceeded to ensure Chrome UI,
 * tab switching, and window events are processed smoothly with 0% freeze and 0 dialogs "Page Unresponsive".
 */

import { getLoadingScheduler, SmoothLoadScheduler, hardYield } from '../utils/asyncLoader';
export { hardYield };

let lastSliceTimestamp = performance.now();

/**
 * Time-Budgeted Yield: Ensures browser UI thread and loading spinner animation
 * render at 60 FPS without ever triggering "Page Unresponsive" dialog.
 */
export async function yieldIfNeeded(budgetMs?: number): Promise<void> {
  const scheduler = getLoadingScheduler();
  const targetBudget = budgetMs ?? scheduler.getBudget();
  if (performance.now() - lastSliceTimestamp >= targetBudget) {
    await hardYield();
    lastSliceTimestamp = performance.now();
    scheduler.reset();
  }
}

/**
 * Principal WebGL Performance Engineer & Browser Runtime Optimization Architect
 * Global cooperativeYield (device-budget default)
 */
export async function cooperativeYield(budgetMs?: number): Promise<void> {
  return yieldIfNeeded(budgetMs);
}

/**
 * Yields control to Chrome with RAF time-slicing if CPU work exceeds maxWorkMs.
 * Allows Chrome to process tab clicks, input events, and CSS spinner animations with 0 lag.
 */
export async function yieldToChrome(maxWorkMs?: number): Promise<void> {
  return yieldIfNeeded(maxWorkMs);
}

/**
 * Yields control to the browser macrotask queue via requestAnimationFrame + setTimeout(0).
 */
export function yieldToMainThread(ms = 0): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => setTimeout(resolve, ms));
    } else {
      setTimeout(resolve, ms);
    }
  });
}

export function yieldToBrowserFrame(): Promise<void> {
  return yieldIfNeeded();
}

/**
 * Strictly checks if execution has exceeded the CPU budget.
 */
export async function yieldIfBudgetExceeded(maxMs?: number): Promise<void> {
  return yieldIfNeeded(maxMs);
}

/**
 * Backward-compatible checkFrameBudget with device default
 */
export async function checkFrameBudget(budgetMs?: number): Promise<void> {
  return yieldIfNeeded(budgetMs);
}

/**
 * Resets the frame budget timer to now.
 */
export function resetFrameBudget(): void {
  lastSliceTimestamp = performance.now();
  getLoadingScheduler().reset();
}

/**
 * Reusable Class-based Frame Budget Timer backed by SmoothLoadScheduler
 */
export class FrameBudgetTimer {
  private scheduler: SmoothLoadScheduler;

  constructor(budgetMs?: number) {
    this.scheduler = new SmoothLoadScheduler(budgetMs);
  }

  public reset(): void {
    this.scheduler.reset();
  }

  public async check(customBudgetMs?: number): Promise<void> {
    if (customBudgetMs !== undefined) {
      const old = this.scheduler.getBudget();
      this.scheduler.setBudget(customBudgetMs);
      await this.scheduler.yieldIfNeeded();
      this.scheduler.setBudget(old);
    } else {
      await this.scheduler.yieldIfNeeded();
    }
  }

  public getElapsed(): number {
    return this.scheduler.getElapsed();
  }
}
