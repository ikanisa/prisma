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

  it('computes variance analytics and flags where thresholds exceeded', () => {
    const result = runAnalytics('VARIANCE', {
      series: [
        { name: 'Revenue', actual: 1050, benchmark: 1000, thresholdAbs: 25 },
        { name: 'COGS', actual: 800, benchmark: 700, thresholdPct: 10 },
      ],
    });

    expect(result.summary.kind).toBe('VARIANCE');
    expect(result.summary.totals.series).toBe(2);
    expect(result.exceptions.length).toBeGreaterThanOrEqual(1);
  });

  it('identifies duplicate transactions using match fields and tolerance', () => {
    const result = runAnalytics('DUPLICATE', {
      transactions: [
        { id: '1', amount: 100.02, date: '2025-01-02', reference: 'INV-1', counterparty: 'A' },
        { id: '2', amount: 100.04, date: '2025-01-02', reference: 'INV-1', counterparty: 'A' },
        { id: '3', amount: 200.00, date: '2025-01-03', reference: 'INV-2', counterparty: 'B' },
      ],
      matchOn: ['amount', 'date', 'reference', 'counterparty'],
      // With 10c tolerance, 100.02 and 100.04 bucket to the same group
      tolerance: 0.1,
    });

    expect(result.summary.kind).toBe('DUPLICATE');
    expect(result.summary.totals.transactions).toBe(3);
    // There should be one duplicate group containing the first two entries
    expect(result.summary.totals.duplicateGroups).toBe(1);
    expect(result.exceptions.length).toBe(2);
  });

  it('performs Benford analysis and returns variance-based exceptions', () => {
    const figures = [123, 145, 167, 189, 245, 267, 289, 311, 333, 355, 377, 399, 412, 434, 456, 478, 499];
    const result = runAnalytics('BENFORD', { figures });
    expect(result.summary.kind).toBe('BENFORD');
    expect(result.summary.totals.figures).toBe(figures.length);
    expect(result.summary.datasetHash).toBeDefined();
  });
});
