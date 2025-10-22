import { describe, expect, it, vi } from 'vitest';
import { AuditExecutionAgent, type AuditExecutionContext } from '../audit-execution';

const stubContext: AuditExecutionContext = {
  orgId: 'org-123',
  orgSlug: 'acme-co',
  engagementId: 'eng-456',
  userId: 'user-789',
};

describe('AuditExecutionAgent.generateAuditPlan', () => {
  it('logs a parse failure and returns null when JSON parsing fails', async () => {
    const rawResponse = {
      output_text: 'not-json',
    };
    const logError = vi.fn();
    const agent = new AuditExecutionAgent({
      supabase: { from: vi.fn() },
      openai: { responses: { create: vi.fn().mockResolvedValue(rawResponse) } },
      logInfo: vi.fn(),
      logError,
    });

    const result = await agent.generateAuditPlan(stubContext, 'Provide the audit plan.');

    expect(result.plan).toBeNull();
    expect(logError).toHaveBeenCalledWith('audit_execution.plan_parse_failed', expect.anything(), { raw: 'not-json' });
    expect(logError.mock.calls[0]?.[1]).toBeInstanceOf(Error);
  });

  it('returns the parsed plan and skips logging when valid JSON is returned', async () => {
    const structuredPlan = {
      risk: ['inherent risk review'],
      procedures: ['substantive testing'],
      analytics: [],
      sampling: { approach: 'random' },
      governance: { approvals: ['engagement partner'] },
    };
    const logError = vi.fn();
    const agent = new AuditExecutionAgent({
      supabase: { from: vi.fn() },
      openai: {
        responses: {
          create: vi.fn().mockResolvedValue({
            output: [
              {
                type: 'message',
                content: [
                  {
                    type: 'output_text',
                    text: JSON.stringify(structuredPlan),
                  },
                ],
              },
            ],
          }),
        },
      },
      logInfo: vi.fn(),
      logError,
    });

    const result = await agent.generateAuditPlan(stubContext, 'Provide the audit plan.');

    expect(result.plan).toEqual(structuredPlan);
    expect(logError).not.toHaveBeenCalled();
  });

  it('logs a parse failure when the plan is not an object', async () => {
    const logError = vi.fn();
    const agent = new AuditExecutionAgent({
      supabase: { from: vi.fn() },
      openai: {
        responses: {
          create: vi.fn().mockResolvedValue({
            output_text: JSON.stringify(['step-one', 'step-two']),
          }),
        },
      },
      logInfo: vi.fn(),
      logError,
    });

    const result = await agent.generateAuditPlan(stubContext, 'Provide the audit plan.');

    expect(result.plan).toBeNull();
    expect(logError).toHaveBeenCalledWith(
      'audit_execution.plan_parse_failed',
      expect.any(Error),
      { raw: JSON.stringify(['step-one', 'step-two']) },
    );
    expect(logError.mock.calls[0]?.[1]).toBeInstanceOf(Error);
  });
});
