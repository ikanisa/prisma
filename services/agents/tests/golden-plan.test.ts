import { describe, expect, it } from 'vitest';

import type { AgentPlanDocument } from '@prisma-glow/agents';

import { AgentGuardrailHarness } from './harness.js';

const basePlan: AgentPlanDocument = {
  planVersion: 'test.v1',
  agentType: 'AUDIT',
  createdAt: '2025-01-15T00:00:00.000Z',
  createdByRole: 'MANAGER',
  requiresCitations: true,
  steps: [
    {
      stepIndex: 0,
      title: 'Collect source evidence',
      summary: 'Use RAG search to gather relevant documentation and assess risk.',
      toolIntents: [
        {
          toolKey: 'rag.search',
          purpose: 'Retrieve policy bound knowledge.',
        },
        {
          toolKey: 'risk.assess',
          purpose: 'Score risk posture for controls.',
        },
      ],
    },
    {
      stepIndex: 1,
      title: 'Coordinate approvals',
      summary: 'Handle signature workflows and notify stakeholders.',
      toolIntents: [
        {
          toolKey: 'docs.sign_url',
          purpose: 'Send a signature link to the external filer.',
        },
        {
          toolKey: 'notify.user',
          purpose: 'Broadcast filing complete.',
        },
      ],
    },
    {
      stepIndex: 2,
      title: 'Reconcile ledgers',
      summary: 'Pull trial balance data and review adjustments.',
      toolIntents: [
        {
          toolKey: 'trial_balance.get',
          purpose: 'Fetch ledger balances with calculator override engaged.',
        },
        {
          toolKey: 'unknown.tool',
          purpose: 'Attempt to run an unsupported tool.',
        },
      ],
    },
  ],
  requestContext: {
    flags: {
      externalFiling: true,
      calculatorOverride: true,
    },
  },
};

describe('AgentGuardrailHarness golden task evaluation', () => {
  it('returns a sanitised plan with guardrail telemetry metadata', () => {
    const harness = new AgentGuardrailHarness();
    const result = harness.runGoldenTask({ plan: basePlan, userRole: 'MANAGER' });

    expect(result.allowedTools).toEqual(['docs.sign_url', 'rag.search', 'risk.assess']);
    expect(result.blockedTools).toEqual(['notify.user', 'trial_balance.get', 'unknown.tool']);
    expect(result.violations).toHaveLength(3);

    const stepOne = result.plan.steps[0];
    expect(stepOne.toolIntents?.map((intent) => intent.toolKey)).toEqual(['rag.search', 'risk.assess']);

    const stepTwo = result.plan.steps[1];
    expect(stepTwo.toolIntents?.map((intent) => intent.toolKey)).toEqual(['docs.sign_url']);

    const stepThree = result.plan.steps[2];
    expect(stepThree.toolIntents).toBeUndefined();
  });

  it('escalates when the caller role is insufficient', () => {
    const harness = new AgentGuardrailHarness();
    const result = harness.runGoldenTask({ plan: basePlan, userRole: 'EMPLOYEE' });

    const violationCodes = result.violations.map((violation) => violation.code);
    expect(violationCodes).toContain('insufficient_role');
    expect(result.allowedTools).toEqual(['rag.search']);
  });
});
