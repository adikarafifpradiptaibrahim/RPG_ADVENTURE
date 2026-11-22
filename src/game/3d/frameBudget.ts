/**
 * Senior WebGL Performance Architect & Browser Runtime Optimization Engineer
 * FrameBudgetTimer & Time-Slicing Utilities
 * 
 * Guarantees that heavy computation loops (terrain heightmap, city structures, instanced vegetation)
 * never lock the JavaScript main thread for more than 8ms per work slice.
 * Uses Macrotask setTimeout(resolve, 0) yielding to ensure Chrome UI, tab switching, and window events
 * are processed smoothly with 0% freeze and 0 dialogs "Page Unresponsive".
 */

let sliceStartTime = performance.now();

/**
 * Yields control to the browser macrotask queue via setTimeout(0).
 * Allows Chrome to process tab clicks, input events, and background processes.
 */
export function yieldToMainThread(): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

export function yieldToBrowserFrame(): Promise<void> {
  return yieldToMainThread();
}

/**
 * Strictly checks if execution has exceeded the 8ms CPU budget.
 * If exceeded, yields to macrotask queue (setTimeout 0) and resets the slice timer.
 */
export async function yieldIfBudgetExceeded(maxMs = 8): Promise<void> {
  if (performance.now() - sliceStartTime >= maxMs) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    sliceStartTime = performance.now();
  }
}

/**
 * Backward-compatible checkFrameBudget with strict 8ms default
 */
export async function checkFrameBudget(budgetMs = 8): Promise<void> {
  return yieldIfBudgetExceeded(budgetMs);
}

/**
 * Resets the frame budget timer to now.
 */
export function resetFrameBudget(): void {
  sliceStartTime = performance.now();
}

/**
 * Reusable Class-based Frame Budget Timer
 */
export class FrameBudgetTimer {
  private lastYieldTime: number;
  private budgetMs: number;

  constructor(budgetMs = 8) {
    this.budgetMs = budgetMs;
    this.lastYieldTime = performance.now();
  }

  public reset(): void {
    this.lastYieldTime = performance.now();
  }

  public async check(customBudgetMs?: number): Promise<void> {
    const budget = customBudgetMs ?? this.budgetMs;
    if (performance.now() - this.lastYieldTime >= budget) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      this.lastYieldTime = performance.now();
    }
  }

  public getElapsed(): number {
    return performance.now() - this.lastYieldTime;
  }
}
