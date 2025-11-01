import type {
  AgentPlanDocument,
  AgentPlanStep,
  AgentPlanToolIntent,
  AgentRequestContext,
  AgentRole,
} from '@prisma-glow/agents';

import { getAllowListEntry } from './allow-list.js';
import { emitGuardrailTelemetry, type GuardrailTelemetryOptions } from './telemetry.js';

export interface ToolPolicyViolation {
  toolKey: string;
  stepIndex: number;
  reason: string;
  code: 'not_allow_listed' | 'insufficient_role' | 'flag_required' | 'flag_denied';
  requiredRole?: AgentRole;
}

export interface ToolPolicyResult {
  plan: AgentPlanDocument;
  allowedTools: string[];
  blockedTools: string[];
  violations: ToolPolicyViolation[];
}

export interface EnforceToolPolicyOptions {
  plan: AgentPlanDocument;
  userRole: AgentRole;
  requestContext?: AgentRequestContext;
  telemetry?: GuardrailTelemetryOptions;
}

export function enforceToolPolicy(options: EnforceToolPolicyOptions): ToolPolicyResult {
  const { plan, userRole, requestContext, telemetry } = options;
  const flags = requestContext?.flags ?? {};
  const allowedTools = new Set<string>();
  const blockedTools = new Set<string>();
  const violations: ToolPolicyViolation[] = [];

  const sanitisedSteps: AgentPlanStep[] = plan.steps.map((step) => ({
    ...step,
    toolIntents: step.toolIntents ? [...step.toolIntents] : undefined,
  }));

  for (const step of sanitisedSteps) {
    if (!step.toolIntents?.length) continue;
    const retainedIntents: AgentPlanToolIntent[] = [];

    step.toolIntents.forEach((intent) => {
      const entry = getAllowListEntry(intent.toolKey);
      if (!entry) {
        blockedTools.add(intent.toolKey);
        violations.push({
          toolKey: intent.toolKey,
          stepIndex: step.stepIndex,
          reason: 'Tool is not on the allow list.',
          code: 'not_allow_listed',
        });
        return;
      }

      if (!entry.allowedRoles.includes(userRole)) {
        blockedTools.add(intent.toolKey);
        violations.push({
          toolKey: intent.toolKey,
          stepIndex: step.stepIndex,
          reason: `Tool requires ${entry.allowedRoles.join(' or ')} privileges.`,
          code: 'insufficient_role',
          requiredRole: entry.allowedRoles[0],
        });
        return;
      }

      if (entry.requiresFlags?.length) {
        const missing = entry.requiresFlags.filter((flag) => flags[flag] !== true);
        if (missing.length > 0) {
          blockedTools.add(intent.toolKey);
          violations.push({
            toolKey: intent.toolKey,
            stepIndex: step.stepIndex,
            reason: `Missing required flags: ${missing.join(', ')}.`,
            code: 'flag_required',
          });
          return;
        }
      }

      if (entry.denyFlags?.length) {
        const denied = entry.denyFlags.filter((flag) => flags[flag]);
        if (denied.length > 0) {
          blockedTools.add(intent.toolKey);
          violations.push({
            toolKey: intent.toolKey,
            stepIndex: step.stepIndex,
            reason: `Tool cannot run when flags are asserted: ${denied.join(', ')}.`,
            code: 'flag_denied',
          });
          return;
        }
      }

      allowedTools.add(intent.toolKey);
      retainedIntents.push({ ...intent });
    });

    step.toolIntents = retainedIntents.length ? retainedIntents : undefined;
  }

  const sanitisedPlan: AgentPlanDocument = {
    ...plan,
    steps: sanitisedSteps,
  };

  const result: ToolPolicyResult = {
    plan: sanitisedPlan,
    allowedTools: Array.from(allowedTools).sort(),
    blockedTools: Array.from(blockedTools).sort(),
    violations,
  };

  emitGuardrailTelemetry(result, telemetry);

  return result;
}
