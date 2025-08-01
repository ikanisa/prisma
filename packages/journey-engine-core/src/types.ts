// Shared types for the journey engine

export type JourneyStepStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface JourneyContext {
  /**
   * Arbitrary mutable state that a step can read & write to.
   */
  state: Record<string, unknown>;
}

export interface JourneyStep<Result = unknown> {
  /**
   * Human-readable identifier for the step.
   */
  id: string;

  /**
   * A short description of what the step does (for logging / debugging).
   */
  description?: string;

  /**
   * The executor function for the step. It receives the current journey context
   * and returns (or resolves to) a result. If the function throws an error the
   * step will be marked as `failed` and execution will stop.
   */
  action: (ctx: JourneyContext) => Promise<Result> | Result;
}

export interface JourneyExecutionResult {
  /** The overall status of the journey. */
  success: boolean;
  /** Step-level results, in the same order they were executed. */
  steps: Array<{ id: string; status: JourneyStepStatus; result?: unknown; error?: Error }>;
  /** The reward calculated by the Reward engine (0-1 range by default). */
  reward: number;
  /** Final mutable state. */
  state: Record<string, unknown>;
}

