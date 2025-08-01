import { EventEmitter } from 'events';
import { Planner } from './planner';
import { RewardEngine } from './reward';
import { JourneyContext, JourneyExecutionResult, JourneyStepStatus } from './types';

export interface ExecutorOptions {
  /** If true execution will stop on first failed step (default: true) */
  haltOnError?: boolean;
  /** Optional shared mutable state passed to every step. */
  initialState?: Record<string, unknown>;
  /** Custom reward engine to use. */
  rewardEngine?: RewardEngine;
}

export declare interface Executor {
  on(event: 'step:start', listener: (stepId: string) => void): this;
  on(event: 'step:success', listener: (stepId: string, result: unknown) => void): this;
  on(event: 'step:failure', listener: (stepId: string, error: Error) => void): this;
  on(event: 'finish', listener: (result: JourneyExecutionResult) => void): this;
}

export class Executor extends EventEmitter {
  private readonly ctx: JourneyContext;
  private readonly reward: RewardEngine;
  private readonly haltOnError: boolean;

  constructor(private readonly planner: Planner, options: ExecutorOptions = {}) {
    super();
    this.haltOnError = options.haltOnError ?? true;
    this.ctx = { state: options.initialState ?? {} };
    this.reward = options.rewardEngine ?? new RewardEngine();
  }

  /**
   * Runs the journey plan to completion (or until an unrecoverable error
   * occurs) and returns an aggregated result.
   */
  async run(): Promise<JourneyExecutionResult> {
    const stepResults: JourneyExecutionResult['steps'] = [];
    let successful = 0;
    let failed = 0;

    while (this.planner.hasNext()) {
      const step = this.planner.nextStep()!; // Non-null because hasNext()

      this.emit('step:start', step.id);

      let status: JourneyStepStatus = 'pending';
      let result: unknown;
      let error: Error | undefined;

      try {
        status = 'in_progress';
        result = await step.action(this.ctx);
        status = 'completed';
        successful++;
        this.emit('step:success', step.id, result);
      } catch (err) {
        status = 'failed';
        error = err as Error;
        failed++;
        this.emit('step:failure', step.id, error);
        if (this.haltOnError) {
          // Push current result before breaking.
          stepResults.push({ id: step.id, status, error });
          break;
        }
      }

      stepResults.push({ id: step.id, status, result, error });
    }

    const rewardScore = this.reward.compute(successful, failed, {
      totalSteps: successful + failed,
    });

    const finalResult: JourneyExecutionResult = {
      success: failed === 0,
      steps: stepResults,
      reward: rewardScore,
      state: { ...this.ctx.state },
    };

    this.emit('finish', finalResult);
    return finalResult;
  }
}
