import { describe, expect, it } from 'vitest';

import { runAnalytics } from '../../apps/web/lib/audit/analytics-engine';

describe('analytics engine', () => {
  it('computes journal entry analytics with deterministic hash and exceptions', () => {
    const entries = Array.from({ length: 30 }, (_, index) => ({
      id: `JE-${index + 1}`,
      postedAt: index === 0 ? '2025-02-02T10:00:00Z' : `2025-01-${String((index % 28) + 1).padStart(2, '0')}T12:00:00Z`,
      amount: index % 5 === 0 ? 10000 : 150 + index,
      account: index % 2 === 0 ? '4000' : '4800',
      description: index % 4 === 0 ? 'Manual posting' : 'Automated',
    }));

    const result = runAnalytics('JE', {
      entries,
      periodEnd: '2025-01-31',
      latePostingDays: 3,
      roundAmountThreshold: 1000,
      weekendFlag: true,
    });

    expect(result.summary.kind).toBe('JE');
    expect(result.summary.datasetHash).toMatch(/^[0-9a-f]+$/);
    expect(result.summary.totals.entries).toBe(entries.length);
    expect(result.summary.totals.flagged).toBeGreaterThan(0);
    expect(result.exceptions.length).toBeGreaterThan(0);
  });

  it('returns ratio analytics with variance flags', () => {
    const result = runAnalytics('RATIO', {
      metrics: [
        { name: 'Gross margin', numerator: 180000, denominator: 250000, prior: 0.6, thresholdPct: 5 },
        { name: 'Operating margin', numerator: 40000, denominator: 250000, prior: 0.25, thresholdPct: 5 },
      ],
    });

    expect(result.summary.kind).toBe('RATIO');
    expect(result.summary.totals.metrics).toBe(2);
    expect(result.summary.datasetHash).toBeDefined();
  });
});
