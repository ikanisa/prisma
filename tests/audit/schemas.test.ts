import { describe, expect, it } from 'vitest';

import {
  createControlSchema,
  runControlTestSchema,
  runAdaSchema,
} from '../../apps/web/lib/audit/schemas';

function makeAttributes(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `attr-${i + 1}`,
    description: `Attribute ${i + 1}`,
    passed: i % 2 === 0,
  }));
}

describe('audit schemas', () => {
  it('createControlSchema sets sensible defaults', () => {
    const parsed = createControlSchema.parse({
      orgId: 'org-1',
      engagementId: 'eng-1',
      userId: 'user-1',
      cycle: 'Revenue',
      objective: 'Completeness',
      description: 'All shipped orders are invoiced.',
    });
    expect(parsed.frequency).toBe('MONTHLY');
    expect(parsed.key).toBe(false);
  });

  it('runControlTestSchema enforces min sample size and exception rationale', () => {
    const base = {
      orgId: 'org-1',
      engagementId: 'eng-1',
      controlId: 'ctrl-1',
      userId: 'user-1',
    };

    const smallSample = { ...base, attributes: makeAttributes(10), result: 'PASS' as const };
    const resSmall = runControlTestSchema.safeParse(smallSample);
    expect(resSmall.success).toBe(false);

    const noRationale = {
      ...base,
      attributes: makeAttributes(25),
      result: 'EXCEPTIONS' as const,
    };
    const resNoRationale = runControlTestSchema.safeParse(noRationale);
    expect(resNoRationale.success).toBe(false);

    const valid = {
      ...base,
      attributes: makeAttributes(30),
      result: 'EXCEPTIONS' as const,
      deficiencyRecommendation: 'Tighten approval workflow and add segregation of duties.',
      deficiencySeverity: 'HIGH' as const,
    };
    const resValid = runControlTestSchema.safeParse(valid);
    expect(resValid.success).toBe(true);
  });

  it('runAdaSchema accepts JE and BENFORD variants and rejects invalid kind', () => {
    const je = runAdaSchema.safeParse({
      kind: 'JE' as const,
      orgId: 'org-1',
      engagementId: 'eng-1',
      userId: 'user-1',
      datasetRef: 'ds-1',
      params: {
        periodEnd: '2025-01-31',
        latePostingDays: 3,
        roundAmountThreshold: 1000,
        weekendFlag: true,
        entries: [
          { id: '1', postedAt: '2025-01-30', amount: 100, account: '4000' },
        ],
      },
    });
    expect(je.success).toBe(true);

    const benford = runAdaSchema.safeParse({
      kind: 'BENFORD' as const,
      orgId: 'org-1',
      engagementId: 'eng-1',
      userId: 'user-1',
      datasetRef: 'ds-2',
      params: { figures: [1234, 2345, 3456, 4567] },
    });
    expect(benford.success).toBe(true);

    const invalid = runAdaSchema.safeParse({ kind: 'XYZ', orgId: 'o', engagementId: 'e', userId: 'u', datasetRef: 'd' });
    expect(invalid.success).toBe(false);
  });
});

