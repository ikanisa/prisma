import { describe, expect, it } from 'vitest';

import { buildAutonomyStatusSnapshot } from '../autonomy-status.js';

describe('buildAutonomyStatusSnapshot', () => {
  it('clamps autonomy and maps telemetry, approvals, and jobs', () => {
    const status = buildAutonomyStatusSnapshot({
      orgAutonomyLevel: 'L3',
      autonomyFloor: 'L1',
      autonomyCeiling: 'L2',
      telemetryAlerts: [
        {
          id: 'alert-1',
          alert_type: 'DETERMINISTIC_MANIFEST_MISSING',
          severity: 'CRITICAL',
          message: 'Missing manifest',
          created_at: '2025-01-01T00:00:00Z',
        },
      ],
      approvals: [
        {
          id: 'approval-1',
          kind: 'close.lock',
          requested_by_user_id: 'user-1',
          requested_at: '2025-01-02T00:00:00Z',
          context_json: { entity: 'close_cycle' },
        },
      ],
      jobs: [
        {
          id: 'job-1',
          kind: 'extract_documents',
          status: 'PENDING',
          scheduled_at: '2025-01-03T00:00:00Z',
          payload: {
            lastRun: {
              result: {
                domain: 'close',
                domainLabel: 'Accounting Close',
                summary: 'Staged close steps',
                approvals: { pending: 1 },
                telemetry: { open: 0 },
                run: { steps: { remaining: 1 } },
              },
            },
          },
        },
      ],
    });

    expect(status.autonomy.level).toBe('L2');
    expect(status.autonomy.allowedJobs.length).toBeGreaterThan(0);
    expect(status.evidence.open).toBe(1);
    expect(status.approvals.pending).toBe(1);
    expect(status.autopilot.domains[0]?.domain).toBe('close');
    expect(status.autopilot.next && status.autopilot.next.kind).toBe('extract_documents');
    expect(status.suggestions.length).toBeGreaterThan(0);
  });
});
