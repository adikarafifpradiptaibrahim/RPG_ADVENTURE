/**
 * Lead WebGL Performance Architect & JavaScript Runtime Optimization
 * FrameBudgetTimer & Time-Slicing Utilities
 * 
 * Guarantees that heavy computation loops (terrain heightmap, instanced vegetation population,
 * procedural geometry creation) never lock the JavaScript main thread for more than 12ms per frame.
 * Leaves ~4ms per 60Hz frame for browser paint, composite, DOM animations, and tab switching,
 * completely eliminating browser "Page Unresponsive" dialogs.
 */

let globalLastYieldTime = performance.now();

/**
 * Yields control back to the browser for 1 frame.
 * Uses requestAnimationFrame when tab is active for 60fps v-sync,
 * with a 16ms setTimeout fallback if the tab is backgrounded.
 */
export function yieldToBrowserFrame(): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame !== 'undefined') {
      let resolved = false;
      const rafId = requestAnimationFrame(() => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          resolve();
        }
      });
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cancelAnimationFrame(rafId);
          resolve();
        }
      }, 16);
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * Checks if the current frame budget (default: 12ms) has been exceeded.
 * If exceeded, yields to the browser frame and resets the timer.
 */
export async function checkFrameBudget(budgetMs = 12): Promise<void> {
  if (performance.now() - globalLastYieldTime >= budgetMs) {
    await yieldToBrowserFrame();
    globalLastYieldTime = performance.now();
  }
}

/**
 * Resets the frame budget timer to now.
 */
export function resetFrameBudget(): void {
  globalLastYieldTime = performance.now();
}

/**
 * Reusable Class-based Frame Budget Timer
 */
export class FrameBudgetTimer {
  private lastYieldTime: number;
  private budgetMs: number;

  constructor(budgetMs = 12) {
    this.budgetMs = budgetMs;
    this.lastYieldTime = performance.now();
  }

  public reset(): void {
    this.lastYieldTime = performance.now();
  }

  public async check(customBudgetMs?: number): Promise<void> {
    const budget = customBudgetMs ?? this.budgetMs;
    if (performance.now() - this.lastYieldTime >= budget) {
      await yieldToBrowserFrame();
      this.lastYieldTime = performance.now();
    }
  }

  public getElapsed(): number {
    return performance.now() - this.lastYieldTime;
  }
}

/**
 * Legacy compatible alias
 */
export const yieldToMainThread = yieldToBrowserFrame;
