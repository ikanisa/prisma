import {
  hasSufficientRole,
  roleFromString,
  type AgentPlanDocument,
  type AgentPlanGenerationResult,
  type AgentPlanRefusal,
  type AgentPlanStep,
  type AgentPlanToolIntent,
  type AgentRequestContext,
  type AgentRequestTool,
  type GenerateAgentPlanInput,
} from './types.js';

const PLAN_SCHEMA_VERSION = '2025-01-15.v1';
const POLICY_PACK_VERSION = process.env.AGENT_POLICY_PACK_VERSION ?? 'policy-pack.v1';
const PERSONA_VERSIONS: Record<GenerateAgentPlanInput['agentType'], string> = {
  CLOSE: 'close-controller.v1',
  TAX: 'tax-lead.v1',
  AUDIT: 'audit-partner.v1',
  ADVISORY: 'advisory-lead.v1',
  CLIENT: 'client-collab.v1',
};
const DEFAULT_PLANNER_MODEL = process.env.AGENT_PLANNER_MODEL ?? process.env.AGENT_MODEL ?? 'gpt-5-mini';
const MAX_GENERATION_ATTEMPTS = 2;

export async function generateAgentPlan(options: GenerateAgentPlanInput): Promise<AgentPlanGenerationResult> {
  const personaVersion = PERSONA_VERSIONS[options.agentType];
  const policyPackVersion = POLICY_PACK_VERSION;
  const model = DEFAULT_PLANNER_MODEL;

  const minRoleRequired = options.requestContext?.minRoleRequired;
  if (minRoleRequired && !hasSufficientRole(options.userRole, minRoleRequired)) {
    return {
      status: 'refused',
      refusal: {
        reason: 'insufficient_role',
        message: `This request requires ${minRoleRequired} permissions.`,
        code: 'insufficient_role',
        requiredRole: minRoleRequired,
      },
      personaVersion,
      policyPackVersion,
      model,
      attempts: 0,
      isFallback: false,
    };
  }

  const fallbackPlan = buildFallbackPlan(options);

  if (!options.openai || typeof options.openai.responses?.create !== 'function') {
    return {
      status: 'success',
      plan: fallbackPlan,
      personaVersion,
      policyPackVersion,
      model,
      attempts: 0,
      isFallback: true,
      lastError: 'planner_model_unavailable',
    };
  }

  let attempts = 0;
  let lastError: string | undefined;
  let usage: Record<string, unknown> | undefined;

  while (attempts < MAX_GENERATION_ATTEMPTS) {
    attempts += 1;
    try {
      const plannerMessages = buildPlannerMessages(options);
      const responsePrompt = plannerMessages
        .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
        .join('\n\n');

      const response = await options.openai.responses.create({
        model,
        input: responsePrompt,
        ...(options.abortSignal ? { signal: options.abortSignal } : {}),
      });
      await options.debugLogger?.({
        endpoint: 'responses.create',
        response,
        requestPayload: plannerMessages,
        metadata: { agentType: options.agentType, attempt: attempts },
      });

      usage = response?.usage ? { ...response.usage } : undefined;

      const parsed = parsePlannerResponse(response);
      if (!parsed) {
        lastError = 'empty_plan_response';
        continue;
      }

      const refusal = extractRefusal(parsed);
      if (refusal) {
        return {
          status: 'refused',
          refusal,
          personaVersion,
          policyPackVersion,
          model,
          attempts,
          isFallback: false,
          usage,
        };
      }

      const normalised = sanitisePlanDocument(parsed, options);
      if (normalised.steps.length === 0) {
        lastError = 'plan_missing_steps';
        continue;
      }

      return {
        status: 'success',
        plan: normalised,
        personaVersion,
        policyPackVersion,
        model,
        attempts,
        isFallback: false,
        usage,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  return {
    status: 'success',
    plan: fallbackPlan,
    personaVersion,
    policyPackVersion,
    model,
    attempts,
    isFallback: true,
    usage,
    lastError,
  };
}

function buildFallbackPlan(options: GenerateAgentPlanInput): AgentPlanDocument {
  const createdAt = new Date().toISOString();
  const summary = options.requestContext?.description?.trim() ?? 'No description supplied.';
  const requiresCitations = options.enforceCitations;

  const steps: AgentPlanStep[] = [
    {
      stepIndex: 0,
      title: 'Frame the engagement',
      summary: `Confirm scope, assumptions, and risk factors for the ${options.agentType.toLowerCase()} workflow. Capture relevant policy flags and user objectives.`,
      exitCriteria: 'Documented summary including key controls/risks and confirmation of scope.',
    },
    {
      stepIndex: 1,
      title: 'Gather authoritative evidence',
      summary: 'Collect knowledge base excerpts, prior memos, and control documentation that support the request.',
      exitCriteria: 'At least two high-quality evidence sources curated for downstream drafting.',
      toolIntents: [
        {
          toolKey: 'rag.search',
          purpose: 'Retrieve relevant knowledge base content to ground the agent response.',
          inputs: {
            query: summary,
            topK: requiresCitations ? 8 : 5,
          },
        },
      ],
    },
    {
      stepIndex: 2,
      title: 'Draft proposed answer and controls',
      summary:
        'Synthesize findings into a structured response, highlighting required approvals, downstream tasks, and open questions.',
      exitCriteria: 'Draft response including action items, approvals required, and explicit references to evidence.',
    },
    {
      stepIndex: 3,
      title: 'Prepare user delivery',
      summary:
        'Package the answer, queue any notifications, and call attention to outstanding approvals or filings before closing the loop with the user.',
      exitCriteria: 'User-ready summary or notification queued with acknowledgements of pending follow-ups.',
      toolIntents: [
        {
          toolKey: 'notify.user',
          purpose: 'Send a summary notification or capture next actions for the requestor.',
        },
      ],
    },
  ];

  attachRequestedTools(steps, options.requestContext);

  return {
    planVersion: PLAN_SCHEMA_VERSION,
    agentType: options.agentType,
    createdAt,
    createdByRole: options.userRole,
    requiresCitations,
    steps,
    notes: summary,
    requestContext: options.requestContext,
  };
}

function attachRequestedTools(steps: AgentPlanStep[], context?: AgentRequestContext) {
  if (!context?.requestedTools?.length) return;
  const knownTools = new Set<string>();
  for (const step of steps) {
    for (const intent of step.toolIntents ?? []) {
      knownTools.add(intent.toolKey);
    }
  }

  const pending = (context.requestedTools as AgentRequestTool[]).filter(
    (tool) => Boolean(tool?.toolKey) && !knownTools.has(tool.toolKey),
  );
  if (pending.length === 0) {
    return;
  }

  const target = steps[steps.length - 1];
  if (!target.toolIntents) {
    target.toolIntents = [];
  }

  for (const tool of pending) {
    target.toolIntents.push({
      toolKey: tool.toolKey,
      purpose: 'Explicitly requested by the user context.',
      inputs: {},
      minRole: tool.minRole,
    });
  }
}

function buildPlannerMessages(options: GenerateAgentPlanInput) {
  const description = options.requestContext?.description?.trim() ?? 'No additional description provided.';
  const flags = options.requestContext?.flags ?? {};
  const flagSummary = Object.keys(flags).length
    ? Object.entries(flags)
        .map(([key, value]) => `${key}: ${value ? 'true' : 'false'}`)
        .join(', ')
    : 'none';
  const requestedTools = options.requestContext?.requestedTools ?? [];
  const toolSummary = requestedTools.length
    ? requestedTools
        .map((tool) => `${tool.toolKey}${tool.minRole ? ` (min role: ${tool.minRole})` : ''}`)
        .join(', ')
    : 'none';

  return [
    {
      role: 'system',
      content:
        'You are an engagement planner for regulated finance/audit/tax workflows. Produce a concise JSON plan describing 3-6 ordered steps that an autonomous agent should execute. Each step should have: stepIndex (number), title, summary, optional exitCriteria, and optional toolIntents array. Every toolIntent must specify toolKey, purpose, and optional inputs object. Use only valid tool keys referenced by the user or the canonical set: rag.search, docs.sign_url, notify.user, trial_balance.get. Never include executable code or free-form prose outside the JSON object. If the request is unsafe or requires a manager role the user lacks, return {"status":"refused","reason":"...","message":"..."}.',
    },
    {
      role: 'user',
      content: `Agent type: ${options.agentType}\nUser role: ${options.userRole}\nRequires citations: ${options.enforceCitations}\nContext description: ${description}\nPolicy flags: ${flagSummary}\nRequested tools: ${toolSummary}`,
    },
  ];
}

function parsePlannerResponse(response: any): any {
  const text = extractText(response);
  if (!text) return null;
  const trimmed = text.trim();
  const fencedMatch = /```json\s*([\s\S]+?)```/i.exec(trimmed);
  const candidate = fencedMatch ? fencedMatch[1] : trimmed;
  const jsonStart = candidate.indexOf('{');
  const jsonEnd = candidate.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    return null;
  }
  const jsonString = candidate.slice(jsonStart, jsonEnd + 1);
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return null;
  }
}

function extractText(response: any): string {
  if (!response) return '';
  if (typeof response.output_text === 'string') {
    return response.output_text;
  }
  if (Array.isArray(response.output)) {
    const parts: string[] = [];
    for (const item of response.output) {
      if (item?.content && Array.isArray(item.content)) {
        for (const part of item.content) {
          if (typeof part?.text === 'string') {
            parts.push(part.text);
          }
        }
      }
      if (typeof item?.text === 'string') {
        parts.push(item.text);
      }
    }
    if (parts.length) {
      return parts.join('\n');
    }
  }
  const choices = (response as any)?.choices;
  if (Array.isArray(choices) && typeof choices[0]?.message?.content === 'string') {
    return choices[0].message.content;
  }
  return '';
}

function extractRefusal(payload: any): AgentPlanRefusal | null {
  if (!payload || typeof payload !== 'object') return null;
  const status = typeof payload.status === 'string' ? payload.status.toLowerCase() : null;
  if (status !== 'refused') {
    return null;
  }
  const reason = typeof payload.reason === 'string' ? payload.reason : 'refused';
  const message = typeof payload.message === 'string' ? payload.message : 'The planner declined to provide a plan.';
  const requiredRoleRaw = payload.requiredRole ?? payload.required_role ?? payload.minRoleRequired;
  const requiredRole = roleFromString(requiredRoleRaw);
  return {
    reason,
    message,
    code: typeof payload.code === 'string' ? payload.code : undefined,
    requiredRole: requiredRole ?? undefined,
  };
}

function sanitisePlanDocument(payload: any, options: GenerateAgentPlanInput): AgentPlanDocument {
  const createdAt = typeof payload.createdAt === 'string' ? payload.createdAt : new Date().toISOString();
  const requiresCitations = typeof payload.requiresCitations === 'boolean'
    ? payload.requiresCitations
    : options.enforceCitations;

  const rawSteps = Array.isArray(payload.steps) ? (payload.steps as unknown[]) : [];
  const normalisedSteps: AgentPlanStep[] = rawSteps
    .map((step, index) => normaliseStep(step, index))
    .filter((step): step is AgentPlanStep => Boolean(step));

  attachRequestedTools(normalisedSteps, options.requestContext);

  return {
    planVersion: typeof payload.planVersion === 'string' ? payload.planVersion : PLAN_SCHEMA_VERSION,
    agentType: options.agentType,
    createdAt,
    createdByRole: options.userRole,
    requiresCitations,
    steps: normalisedSteps,
    notes: typeof payload.notes === 'string' ? payload.notes : undefined,
    requestContext: options.requestContext,
  };
}

function normaliseStep(step: unknown, fallbackIndex: number): AgentPlanStep | undefined {
  if (!step || typeof step !== 'object') return undefined;
  const record = step as Record<string, unknown>;
  const titleRaw = record.title ?? record.name ?? record.heading;
  const summaryRaw = record.summary ?? record.description ?? record.intent;
  if (typeof titleRaw !== 'string' || typeof summaryRaw !== 'string') {
    return undefined;
  }

  const stepIndex = typeof record.stepIndex === 'number' ? record.stepIndex : fallbackIndex;
  const exitCriteria = typeof record.exitCriteria === 'string' ? record.exitCriteria : undefined;
  const dependsOn = Array.isArray(record.dependsOn)
    ? (record.dependsOn as unknown[])
        .filter((value) => Number.isInteger(value as number))
        .map((value) => Number(value))
    : undefined;

  const toolIntents = Array.isArray(record.toolIntents)
    ? (record.toolIntents as unknown[])
        .map((intent) => normaliseToolIntent(intent))
        .filter((intent): intent is AgentPlanToolIntent => Boolean(intent))
    : undefined;

  return {
    stepIndex,
    title: titleRaw.trim(),
    summary: summaryRaw.trim(),
    exitCriteria,
    dependsOn,
    toolIntents,
  };
}

// Approved tool keys that agents are allowed to use
const APPROVED_TOOL_KEYS = [
  'rag.search',
  'docs.sign_url',
  'notify.user',
  'trial_balance.get',
  'ledger.query',
  'analytics.export',
] as const;

function normaliseToolIntent(intent: unknown): AgentPlanToolIntent | undefined {
  if (!intent || typeof intent !== 'object') return undefined;
  const record = intent as Record<string, unknown>;
  const toolKey = typeof record.toolKey === 'string'
    ? record.toolKey
    : typeof record.key === 'string'
    ? record.key
    : undefined;
  if (!toolKey) return undefined;

  // Enforce tool allowlist - reject unknown tools
  if (!APPROVED_TOOL_KEYS.includes(toolKey as any)) {
    console.warn(`agent.planner.rejected_tool: Tool key "${toolKey}" is not in the approved allowlist`);
    return undefined;
  }

  const purposeRaw = record.purpose ?? record.reason ?? record.summary;
  const purpose = typeof purposeRaw === 'string' ? purposeRaw.trim() : 'Run tool for this step.';

  const inputs = record.inputs && typeof record.inputs === 'object' && !Array.isArray(record.inputs)
    ? (record.inputs as Record<string, unknown>)
    : undefined;

  const minRole = roleFromString(record.minRole ?? record.requiresRole ?? record.min_role ?? record.requires_role);

  return {
    toolKey,
    purpose,
    inputs,
    notes: typeof record.notes === 'string' ? record.notes : undefined,
    minRole: minRole ?? undefined,
  };
}
