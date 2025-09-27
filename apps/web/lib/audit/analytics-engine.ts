import { createHash } from 'crypto';

type JournalEntry = {
  id: string;
  postedAt: string;
  amount: number;
  account: string;
  description?: string;
  createdAt?: string;
  createdBy?: string;
  approvedBy?: string;
};

type JournalParams = {
  periodEnd: string;
  latePostingDays: number;
  roundAmountThreshold: number;
  weekendFlag: boolean;
  entries: JournalEntry[];
};

type RatioMetric = {
  name: string;
  numerator: number;
  denominator: number;
  prior?: number;
  thresholdPct?: number;
};

type VarianceSeries = {
  name: string;
  actual: number;
  benchmark: number;
  thresholdAbs?: number;
  thresholdPct?: number;
};

type DuplicateTransaction = {
  id: string;
  amount: number;
  date: string;
  reference?: string;
  counterparty?: string;
};

type DuplicateParams = {
  transactions: DuplicateTransaction[];
  matchOn: Array<'amount' | 'date' | 'reference' | 'counterparty'>;
  tolerance?: number;
};

type BenfordParams = {
  figures: number[];
};

type AnalyticsSummary = {
  kind: 'JE' | 'RATIO' | 'VARIANCE' | 'DUPLICATE' | 'BENFORD';
  datasetHash: string;
  parameters: Record<string, unknown>;
  totals: Record<string, number>;
  details: unknown;
};

type AnalyticsException = {
  recordRef: string;
  score: number;
  reason: string;
};

type AnalyticsResult = {
  summary: AnalyticsSummary;
  exceptions: AnalyticsException[];
};

function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const sortedEntries = Object.entries(val as Record<string, unknown>).sort(([a], [b]) =>
        a.localeCompare(b),
      );
      return sortedEntries.reduce<Record<string, unknown>>((acc, [key, nested]) => {
        acc[key] = nested;
        return acc;
      }, {});
    }
    return val;
  });
}

export function hashDataset(value: unknown): string {
  const hash = createHash('sha256');
  hash.update(stableStringify(value));
  return hash.digest('hex');
}

function runJournalAnalytics(params: JournalParams, datasetHash: string): AnalyticsResult {
  const periodEnd = new Date(params.periodEnd);
  const toleranceMs = params.latePostingDays * 24 * 60 * 60 * 1000;
  const results = params.entries.map(entry => {
    const postedAt = new Date(entry.postedAt);
    const createdAt = entry.createdAt ? new Date(entry.createdAt) : postedAt;
    const flags: string[] = [];
    let score = 0;

    if (postedAt.getTime() > periodEnd.getTime() + toleranceMs) {
      flags.push('LATE_POSTING');
      score += 40;
    }

    if (params.weekendFlag && [0, 6].includes(createdAt.getUTCDay())) {
      flags.push('WEEKEND_ENTRY');
      score += 25;
    }

    const absAmount = Math.abs(entry.amount);
    if (absAmount >= params.roundAmountThreshold && absAmount % params.roundAmountThreshold === 0) {
      flags.push('ROUND_AMOUNT');
      score += 20;
    }

    if (entry.description && /manual/i.test(entry.description)) {
      flags.push('MANUAL_REFERENCE');
      score += 15;
    }

    return {
      id: entry.id,
      account: entry.account,
      amount: entry.amount,
      postedAt: entry.postedAt,
      createdAt: entry.createdAt ?? entry.postedAt,
      createdBy: entry.createdBy ?? null,
      approvedBy: entry.approvedBy ?? null,
      flags,
      score,
    };
  });

  const flagged = results.filter(item => item.flags.length > 0);
  const ordered = [...results].sort((a, b) => b.score - a.score);
  const sample = ordered.filter(item => item.flags.length > 0).slice(0, Math.min(25, ordered.length));
  const exceptions = ordered
    .filter(item => item.score >= 50)
    .map(item => ({
      recordRef: item.id,
      score: item.score,
      reason: item.flags.join(', ') || 'High risk scoring',
    }));

  const summary: AnalyticsSummary = {
    kind: 'JE',
    datasetHash,
    parameters: {
      periodEnd: params.periodEnd,
      latePostingDays: params.latePostingDays,
      roundAmountThreshold: params.roundAmountThreshold,
      weekendFlag: params.weekendFlag,
    },
    totals: {
      entries: params.entries.length,
      flagged: flagged.length,
      exceptions: exceptions.length,
    },
    details: {
      riskScores: ordered,
      sample,
    },
  };

  return { summary, exceptions };
}

function runRatioAnalytics(params: { metrics: RatioMetric[] }, datasetHash: string): AnalyticsResult {
  const metrics = params.metrics.map(metric => {
    const ratio = metric.denominator === 0 ? null : metric.numerator / metric.denominator;
    const prior = metric.prior ?? null;
    const deltaPct = prior && prior !== 0 && ratio !== null ? ((ratio - prior) / prior) * 100 : null;
    const threshold = metric.thresholdPct ?? null;
    const flagged = deltaPct !== null && threshold !== null ? Math.abs(deltaPct) > threshold : false;
    return {
      name: metric.name,
      ratio,
      prior,
      deltaPct,
      threshold,
      flagged,
    };
  });

  const exceptions = metrics
    .filter(metric => metric.flagged)
    .map(metric => ({
      recordRef: metric.name,
      score: Math.abs(metric.deltaPct ?? 0),
      reason: `Variance ${metric.deltaPct?.toFixed(2) ?? '0'}% exceeds threshold ${metric.threshold ?? 'n/a'}%`,
    }));

  const summary: AnalyticsSummary = {
    kind: 'RATIO',
    datasetHash,
    parameters: {},
    totals: {
      metrics: metrics.length,
      exceptions: exceptions.length,
    },
    details: { metrics },
  };

  return { summary, exceptions };
}

function runVarianceAnalytics(params: { series: VarianceSeries[] }, datasetHash: string): AnalyticsResult {
  const series = params.series.map(item => {
    const delta = item.actual - item.benchmark;
    const absDelta = Math.abs(delta);
    const pctDelta = item.benchmark === 0 ? null : (delta / item.benchmark) * 100;
    const thresholdAbs = item.thresholdAbs ?? null;
    const thresholdPct = item.thresholdPct ?? null;
    const exceedsAbs = thresholdAbs !== null ? absDelta > thresholdAbs : false;
    const exceedsPct = thresholdPct !== null && pctDelta !== null ? Math.abs(pctDelta) > thresholdPct : false;
    const flagged = exceedsAbs || exceedsPct;
    return {
      name: item.name,
      actual: item.actual,
      benchmark: item.benchmark,
      delta,
      pctDelta,
      thresholdAbs,
      thresholdPct,
      flagged,
    };
  });

  const exceptions = series
    .filter(item => item.flagged)
    .map(item => ({
      recordRef: item.name,
      score: Math.max(Math.abs(item.delta), Math.abs(item.pctDelta ?? 0)),
      reason: 'Variance exceeds defined threshold',
    }));

  const summary: AnalyticsSummary = {
    kind: 'VARIANCE',
    datasetHash,
    parameters: {},
    totals: {
      series: series.length,
      exceptions: exceptions.length,
    },
    details: { series },
  };

  return { summary, exceptions };
}

function normaliseAmount(amount: number, tolerance?: number): number {
  if (!tolerance || tolerance <= 0) {
    return Number(amount.toFixed(2));
  }
  const buckets = Math.round(amount / tolerance);
  return Number((buckets * tolerance).toFixed(2));
}

function runDuplicateAnalytics(params: DuplicateParams, datasetHash: string): AnalyticsResult {
  const groupMap = new Map<string, DuplicateTransaction[]>();
  params.transactions.forEach(transaction => {
    const bucketedAmount = normaliseAmount(transaction.amount, params.tolerance);
    const keyParts = params.matchOn.map(field => {
      if (field === 'amount') {
        return bucketedAmount;
      }
      return (transaction as Record<string, unknown>)[field] ?? null;
    });
    const key = JSON.stringify(keyParts);
    const existing = groupMap.get(key) ?? [];
    existing.push(transaction);
    groupMap.set(key, existing);
  });

  const duplicateGroups = Array.from(groupMap.entries())
    .map(([key, transactions]) => ({ key, transactions }))
    .filter(group => group.transactions.length > 1);

  const exceptions: AnalyticsException[] = [];
  duplicateGroups.forEach(group => {
    const baseReason = `Duplicate pattern across ${group.transactions.length} entries`;
    group.transactions.forEach(transaction => {
      exceptions.push({
        recordRef: transaction.id,
        score: group.transactions.length,
        reason: baseReason,
      });
    });
  });

  const summary: AnalyticsSummary = {
    kind: 'DUPLICATE',
    datasetHash,
    parameters: {
      matchOn: params.matchOn,
      tolerance: params.tolerance ?? null,
    },
    totals: {
      transactions: params.transactions.length,
      duplicateGroups: duplicateGroups.length,
      exceptions: exceptions.length,
    },
    details: {
      groups: duplicateGroups,
    },
  };

  return { summary, exceptions };
}

function runBenfordAnalytics(params: BenfordParams, datasetHash: string): AnalyticsResult {
  const digits = Array.from({ length: 9 }, (_, index) => index + 1);
  const counts = new Map<number, number>();
  digits.forEach(digit => counts.set(digit, 0));

  params.figures.forEach(value => {
    const firstDigitMatch = String(Math.abs(value)).match(/^[0]*([1-9])/);
    if (firstDigitMatch) {
      const digit = Number(firstDigitMatch[1]);
      counts.set(digit, (counts.get(digit) ?? 0) + 1);
    }
  });

  const total = params.figures.length;
  const rows = digits.map(digit => {
    const observed = counts.get(digit) ?? 0;
    const observedPct = total === 0 ? 0 : observed / total;
    const expectedPct = Math.log10(1 + 1 / digit);
    const variance = observedPct - expectedPct;
    return {
      digit,
      observed,
      observedPct,
      expectedPct,
      variance,
    };
  });

  const threshold = 0.05; // 5% variance trigger
  const exceptions = rows
    .filter(row => Math.abs(row.variance) > threshold)
    .map(row => ({
      recordRef: row.digit.toString(),
      score: Math.abs(row.variance),
      reason: `First-digit variance ${row.variance.toFixed(4)} exceeds 5% tolerance`,
    }));

  const summary: AnalyticsSummary = {
    kind: 'BENFORD',
    datasetHash,
    parameters: {},
    totals: {
      figures: params.figures.length,
      exceptions: exceptions.length,
    },
    details: { rows },
  };

  return { summary, exceptions };
}

export function runAnalytics(
  kind: 'JE' | 'RATIO' | 'VARIANCE' | 'DUPLICATE' | 'BENFORD',
  params: JournalParams | { metrics: RatioMetric[] } | { series: VarianceSeries[] } | DuplicateParams | BenfordParams,
): AnalyticsResult {
  const datasetHash = hashDataset(params);

  switch (kind) {
    case 'JE':
      return runJournalAnalytics(params as JournalParams, datasetHash);
    case 'RATIO':
      return runRatioAnalytics(params as { metrics: RatioMetric[] }, datasetHash);
    case 'VARIANCE':
      return runVarianceAnalytics(params as { series: VarianceSeries[] }, datasetHash);
    case 'DUPLICATE':
      return runDuplicateAnalytics(params as DuplicateParams, datasetHash);
    case 'BENFORD':
      return runBenfordAnalytics(params as BenfordParams, datasetHash);
    default:
      throw new Error(`Unsupported ADA run kind: ${kind}`);
  }
}

export type { AnalyticsResult, AnalyticsSummary, AnalyticsException, JournalParams };
