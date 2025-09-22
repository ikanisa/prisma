/**
 * Very small reward engine. For the first iteration we compute a numeric score
 * between 0 and 1 representing the ratio of successful steps over the total
 * number of executed steps.
 *
 * The algorithm can be swapped later on by implementing the same interface.
 */

export interface RewardStrategy {
  compute(successfulSteps: number, failedSteps: number, metadata?: Record<string, unknown>): number;
}

export class SimpleRatioReward implements RewardStrategy {
  compute(successfulSteps: number, failedSteps: number): number {
    const total = successfulSteps + failedSteps;
    if (total === 0) return 0;
    return successfulSteps / total;
  }
}

/**
 * The Reward engine is just a thin wrapper around a strategy so that the
 * concrete implementation can be injected. This keeps the public contract
 * stable while allowing future customisation.
 */
export class RewardEngine {
  constructor(private readonly strategy: RewardStrategy = new SimpleRatioReward()) {}

  compute(successfulSteps: number, failedSteps: number, metadata?: Record<string, unknown>): number {
    return this.strategy.compute(successfulSteps, failedSteps, metadata);
  }
}

