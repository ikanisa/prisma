import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

import {
  loadRunbookDefinition,
  simulateQuarterlyReview,
} from '../../ops/runbooks/automation/incident-integrations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runbookPath = path.resolve(
  __dirname,
  '../../ops/runbooks/database-outage.yaml',
);

describe('runbook automation simulations', () => {
  it('performs quarterly simulations in dry-run mode by default', async () => {
    const fetchMock = vi.fn();

    const result = await simulateQuarterlyReview(runbookPath, {
      fetchImpl: fetchMock,
    });

    expect(result.runbook.metadata.name).toBe('Restore Primary Database Service');
    expect(result.nextReviewDate).toBe('2025-04-15');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.automation.pagerduty?.request.incident.service.id).toBe('P123456');
    expect(result.automation.firehydrant?.request.team_id).toBe(
      'team-production-sre',
    );
  });

  it('executes PagerDuty and FireHydrant automation when not in dry-run mode', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('pagerduty')) {
        return new Response(JSON.stringify({ incident: { id: 'PD123' } }), {
          status: 202,
        });
      }

      if (url.includes('firehydrant')) {
        return new Response(JSON.stringify({ incident: { id: 'FH123' } }), {
          status: 201,
        });
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    const { automation, runbook } = await simulateQuarterlyReview(runbookPath, {
      dryRun: false,
      fetchImpl: fetchMock,
    });

    expect(runbook.automation?.pagerduty?.title_template).toContain('Database');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const pagerDutyCall = fetchMock.mock.calls.find(([url]) =>
      url.includes('pagerduty'),
    );
    const fireHydrantCall = fetchMock.mock.calls.find(([url]) =>
      url.includes('firehydrant'),
    );

    expect(pagerDutyCall).toBeDefined();
    expect(fireHydrantCall).toBeDefined();

    const pagerDutyHeaders = pagerDutyCall?.[1]?.headers as Record<string, string>;
    const fireHydrantHeaders = fireHydrantCall?.[1]?.headers as Record<string, string>;

    expect(pagerDutyHeaders.Authorization).toBe(
      'Token token=PAGERDUTY_API_TOKEN_PLACEHOLDER',
    );
    expect(pagerDutyHeaders.From).toBe('oncall@example.com');
    expect(fireHydrantHeaders.Authorization).toBe(
      'Bearer FIREHYDRANT_API_TOKEN_PLACEHOLDER',
    );

    expect(automation.pagerduty?.response?.status).toBe(202);
    expect(automation.firehydrant?.response?.status).toBe(201);
  });
});

it('exposes runbook definitions for additional inspection', async () => {
  const definition = await loadRunbookDefinition(runbookPath);

  expect(definition.playbook?.steps).toHaveLength(4);
  expect(definition.review.frequency).toBe('quarterly');
});
