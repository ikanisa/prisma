import { verifyPromptChecksums, loadPromptById, type AgentPlanDocument, type AgentRole } from '@prisma-glow/agents';

import { enforceToolPolicy, type ToolPolicyResult } from '../policy/tool-policy.js';

const INJECTION_PATTERNS = [
  /ignore (all|any) previous instructions/i,
  /disable (?:all )?guardrails/i,
  /override (?:the )?policy/i,
  /drop hitl/i,
];

export interface PromptInjectionEvaluation {
  attempt: string;
  flagged: boolean;
  matchedPattern?: string;
}

export interface GoldenTaskOptions {
  plan: AgentPlanDocument;
  userRole: AgentRole;
}

export class AgentGuardrailHarness {
  readonly prompts: Record<string, string>;

  constructor() {
    const checksumFailures = verifyPromptChecksums();
    if (checksumFailures.length > 0) {
      const details = checksumFailures.map((failure) => `${failure.id} (${failure.path})`).join(', ');
      throw new Error(`Prompt checksum verification failed: ${details}`);
    }

    this.prompts = Object.fromEntries(
      ['director.system', 'director.request'].map((id) => {
        const prompt = loadPromptById(id);
        return [id, prompt.contents];
      }),
    );
  }

  evaluatePromptInjection(attempt: string): PromptInjectionEvaluation {
    const lowered = attempt.toLowerCase();
    const pattern = INJECTION_PATTERNS.find((candidate) => candidate.test(lowered));
    return {
      attempt,
      flagged: Boolean(pattern),
      matchedPattern: pattern?.source,
    };
  }

  runGoldenTask(options: GoldenTaskOptions): ToolPolicyResult {
    return enforceToolPolicy({
      plan: options.plan,
      userRole: options.userRole,
      requestContext: options.plan.requestContext,
    });
  }
}
