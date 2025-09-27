import { describe, expect, it } from 'vitest';

import { assessDac6 } from '@/lib/tax/dac6';

describe('DAC6 assessment', () => {
  it('flags Category C hallmarks without main benefit test', () => {
    const assessment = assessDac6({
      arrangementReference: 'DAC6-001',
      participants: [],
      hallmarks: [{ category: 'C', code: 'C1', description: 'Cross-border payment to low-tax jurisdiction' }],
    });

    expect(assessment.reportingRequired).toBe(true);
    expect(assessment.primaryHallmarks).toHaveLength(1);
    expect(assessment.mainBenefitTestMet).toBe(false);
  });

  it('requires main benefit test for Category A hallmarks', () => {
    const assessment = assessDac6({
      arrangementReference: 'DAC6-002',
      participants: [],
      hallmarks: [{ category: 'A', code: 'A3', mainBenefitTest: false }],
      mainBenefitIndicators: { standardizedDocumentation: false },
    });

    expect(assessment.reportingRequired).toBe(false);
    expect(assessment.mainBenefitTestMet).toBe(false);
  });

  it('meets main benefit test due to standardized documentation', () => {
    const assessment = assessDac6({
      arrangementReference: 'DAC6-003',
      participants: [],
      hallmarks: [{ category: 'A', code: 'A3' }],
      mainBenefitIndicators: { standardizedDocumentation: true },
    });

    expect(assessment.reportingRequired).toBe(true);
    expect(assessment.mainBenefitTestMet).toBe(true);
  });
});
