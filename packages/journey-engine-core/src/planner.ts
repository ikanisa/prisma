import { JourneyStep } from './types';

/**
 * The Planner is responsible for transforming a high-level goal (string or
 * structured object) into an ordered list of JourneySteps. In the initial
 * implementation the consumer can directly provide the steps, but a helper
 * `fromSteps` is available for convenience.
 *
 * The implementation purposefully stays minimal to keep the public surface
 * backwards-compatible while allowing more sophisticated planning strategies
 * (LLM-based, rule-based, graph search, …) to be plugged in later on.
 */

export class Planner {
  private readonly steps: JourneyStep[];

  /**
   * Create a planner from an already-prepared list of steps.
   */
  static fromSteps(steps: JourneyStep[]): Planner {
    return new Planner(steps);
  }

  /**
   * The constructor is intentionally kept private – this forces callers to use
   * explicit factory helpers (e.g. `fromSteps`, `fromGoal`) and leaves room for
   * additional params without breaking callers.
   */
  private constructor(steps: JourneyStep[]) {
    // We clone to avoid accidental external mutations.
    this.steps = [...steps];
  }

  /**
   * Get the ordered list of steps. A shallow clone is returned so callers
   * cannot accidentally mutate the internal representation.
   */
  getPlan(): JourneyStep[] {
    return [...this.steps];
  }

  /**
   * Pop the first remaining step from the plan. Returns `undefined` if the
   * plan is exhausted.
   */
  nextStep(): JourneyStep | undefined {
    return this.steps.shift();
  }

  /**
   * Whether there are any steps left to execute.
   */
  hasNext(): boolean {
    return this.steps.length > 0;
  }
}

