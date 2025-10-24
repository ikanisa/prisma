import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getServiceSupabaseClientMock = vi.fn();
const upsertAuditModuleRecordMock = vi.fn();
const logAuditActivityMock = vi.fn();
const queueManagerReviewMock = vi.fn();
const createApiGuardMock = vi.fn();

vi.mock('@/lib/supabase-server', () => ({
  getServiceSupabaseClient: () => getServiceSupabaseClientMock(),
}), { virtual: true });

vi.mock('@/lib/audit/module-records', () => ({
  upsertAuditModuleRecord: (...args: unknown[]) => upsertAuditModuleRecordMock(...args),
}), { virtual: true });

vi.mock('@/lib/audit/activity-log', () => ({
  logAuditActivity: (...args: unknown[]) => logAuditActivityMock(...args),
}), { virtual: true });

vi.mock('@/lib/audit/approvals', () => ({
  queueManagerReview: (...args: unknown[]) => queueManagerReviewMock(...args),
}), { virtual: true });

vi.mock('@/app/lib/api-guard', () => ({
  createApiGuard: (...args: unknown[]) => createApiGuardMock(...args),
}), { virtual: true });

import { GET as getServiceOrgs, POST as postServiceOrg } from '../../apps/web/app/api/soc/service-orgs/route';
import { POST as postSocReport } from '../../apps/web/app/api/soc/report/route';
import { POST as postCuec } from '../../apps/web/app/api/soc/cuec/route';

const ORG_ID = '10000000-0000-0000-0000-000000000001';
const ENGAGEMENT_ID = '10000000-0000-0000-0000-000000000002';
const SERVICE_ORG_ID = '10000000-0000-0000-0000-000000000003';
const USER_ID = '10000000-0000-0000-0000-000000000004';

type GuardOverrides = Partial<{
  rateLimitResponse: Response | undefined;
  replayResponse: Response | undefined;
}>;

function buildGuard(overrides: GuardOverrides = {}) {
  return {
    requestId: 'req-123',
    idempotencyKey: null,
    rateLimitResponse: overrides.rateLimitResponse,
    replayResponse: overrides.replayResponse,
    json: (body: unknown, init?: ResponseInit) => NextResponse.json(body, init),
    respond: async (body: Record<string, unknown>, init?: ResponseInit) =>
      NextResponse.json(body, init),
  };
}

function createRateAllowedSupabase(overrides: Record<string, unknown> = {}) {
  return {
    rpc: vi.fn().mockResolvedValue({ data: [{ allowed: true, request_count: 1 }], error: null }),
    ...overrides,
  };
}

describe('SOC-1 API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServiceSupabaseClientMock.mockReset();
    upsertAuditModuleRecordMock.mockResolvedValue(undefined);
    logAuditActivityMock.mockResolvedValue(undefined);
    queueManagerReviewMock.mockResolvedValue(undefined);
    createApiGuardMock.mockImplementation(async () => buildGuard());
  });

  describe('GET /api/soc/service-orgs', () => {
    it('returns service organisations with nested data', async () => {
      const orderMock = vi.fn().mockResolvedValue({
        data: [
          {
            id: SERVICE_ORG_ID,
            org_id: ORG_ID,
            engagement_id: ENGAGEMENT_ID,
            name: 'Payroll processor',
            reports: [{ id: 'report-1' }],
            cuecs: [{ id: 'cuec-1' }],
          },
        ],
        error: null,
      });
      const eqSecondMock = vi.fn(() => ({ order: orderMock }));
      const eqFirstMock = vi.fn(() => ({ eq: eqSecondMock }));
      const selectMock = vi.fn(() => ({ eq: eqFirstMock }));

      const supabase = createRateAllowedSupabase({
        from: vi.fn(() => ({ select: selectMock })),
      });

      getServiceSupabaseClientMock.mockReturnValue(supabase);

      const response = await getServiceOrgs(
        new Request(
          `https://example.com/api/soc/service-orgs?orgId=${ORG_ID}&engagementId=${ENGAGEMENT_ID}`,
        ),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.serviceOrgs).toHaveLength(1);
      expect(body.serviceOrgs[0].reports[0].id).toBe('report-1');
      expect(selectMock).toHaveBeenCalled();
      expect(createApiGuardMock).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: `soc:service-org:list:${ENGAGEMENT_ID}`,
        }),
      );
    });
  });

  describe('POST /api/soc/service-orgs', () => {
    it('creates a service organisation and logs activity', async () => {
      const insertedRow = {
        id: SERVICE_ORG_ID,
        org_id: ORG_ID,
        engagement_id: ENGAGEMENT_ID,
        name: 'Payroll processor',
        service_type: 'PAYROLL',
        residual_risk: 'Moderate',
        reliance_assessed: true,
        contact_email: 'ops@example.com',
        contact_phone: '1234',
      };

      const maybeSingleMock = vi.fn().mockResolvedValue({ data: insertedRow, error: null });
      const selectMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
      const insertMock = vi.fn(() => ({ select: selectMock }));

      const supabase = createRateAllowedSupabase({
        from: vi.fn((table: string) => {
          if (table === 'service_organisations') {
            return { insert: insertMock };
          }
          throw new Error(`Unexpected table ${table}`);
        }),
      });

      getServiceSupabaseClientMock.mockReturnValue(supabase);

      const response = await postServiceOrg(
        new Request('https://example.com/api/soc/service-orgs', {
          method: 'POST',
          body: JSON.stringify({
            orgId: ORG_ID,
            engagementId: ENGAGEMENT_ID,
            name: 'Payroll processor',
            serviceType: 'PAYROLL',
            residualRisk: 'Moderate',
            relianceAssessed: true,
            contactEmail: 'ops@example.com',
            contactPhone: '1234',
            userId: USER_ID,
          }),
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.serviceOrg.id).toBe(SERVICE_ORG_ID);

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          org_id: ORG_ID,
          engagement_id: ENGAGEMENT_ID,
          name: 'Payroll processor',
        }),
      );
      expect(upsertAuditModuleRecordMock).toHaveBeenCalledWith(
        supabase,
        expect.objectContaining({
          moduleCode: 'SOC1',
          recordRef: SERVICE_ORG_ID,
          preparedByUserId: USER_ID,
        }),
      );
      expect(logAuditActivityMock).toHaveBeenCalledWith(
        supabase,
        expect.objectContaining({
          action: 'SOC_CREATED',
          entityId: SERVICE_ORG_ID,
        }),
      );
    });

    it('returns a rate limit response when guard blocks the request', async () => {
      const rateLimited = NextResponse.json({ error: 'rate_limit_exceeded' }, { status: 429 });
      createApiGuardMock.mockResolvedValueOnce(buildGuard({ rateLimitResponse: rateLimited }));

      const supabase = createRateAllowedSupabase({
        from: vi.fn(),
      });
      getServiceSupabaseClientMock.mockReturnValue(supabase);

      const response = await postServiceOrg(
        new Request('https://example.com/api/soc/service-orgs', {
          method: 'POST',
          body: JSON.stringify({
            orgId: ORG_ID,
            engagementId: ENGAGEMENT_ID,
            name: 'Should not create',
            userId: USER_ID,
          }),
        }),
      );

      expect(response.status).toBe(429);
      expect(upsertAuditModuleRecordMock).not.toHaveBeenCalled();
      expect(logAuditActivityMock).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/soc/report', () => {
    it('records a SOC report and updates metadata', async () => {
      const serviceOrgMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: { id: SERVICE_ORG_ID, name: 'Payroll processor', org_id: ORG_ID }, error: null });
      const serviceOrgSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: serviceOrgMaybeSingle })),
        })),
      }));

      const reportMaybeSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'report-1',
          report_type: 'TYPE_2',
          scope: 'SOC1',
          period_start: '2024-01-01',
          period_end: '2024-03-31',
        },
        error: null,
      });
      const reportSelect = vi.fn(() => ({ maybeSingle: reportMaybeSingle }));
      const reportInsert = vi.fn(() => ({ select: reportSelect }));

      const supabase = createRateAllowedSupabase({
        from: vi.fn((table: string) => {
          if (table === 'service_organisations') {
            return { select: serviceOrgSelect };
          }
          if (table === 'soc_reports') {
            return { insert: reportInsert };
          }
          throw new Error(`Unexpected table ${table}`);
        }),
      });

      getServiceSupabaseClientMock.mockReturnValue(supabase);

      const response = await postSocReport(
        new Request('https://example.com/api/soc/report', {
          method: 'POST',
          body: JSON.stringify({
            orgId: ORG_ID,
            engagementId: ENGAGEMENT_ID,
            serviceOrgId: SERVICE_ORG_ID,
            periodStart: '2024-01-01',
            periodEnd: '2024-03-31',
            userId: USER_ID,
          }),
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.report.id).toBe('report-1');
      expect(upsertAuditModuleRecordMock).toHaveBeenCalledWith(
        supabase,
        expect.objectContaining({
          recordRef: SERVICE_ORG_ID,
          metadata: expect.objectContaining({ reportId: 'report-1', scope: 'SOC1' }),
        }),
      );
      expect(logAuditActivityMock).toHaveBeenCalledWith(
        supabase,
        expect.objectContaining({
          action: 'SOC_REPORT_ADDED',
          metadata: expect.objectContaining({ serviceOrgId: SERVICE_ORG_ID }),
        }),
      );
    });
  });

  describe('POST /api/soc/cuec', () => {
    it('records a CUEC deficiency and queues review', async () => {
      const cuecRow = {
        id: 'cuec-1',
        status: 'DEFICIENCY',
        tested: true,
        exception_note: 'Exception observed',
        compensating_control: 'Add monitoring',
      };
      const cuecMaybeSingle = vi.fn().mockResolvedValue({ data: cuecRow, error: null });
      const cuecSelect = vi.fn(() => ({ maybeSingle: cuecMaybeSingle }));
      const cuecInsert = vi.fn(() => ({ select: cuecSelect }));

      const supabase = createRateAllowedSupabase({
        from: vi.fn((table: string) => {
          if (table === 'cuec_controls') {
            return { insert: cuecInsert };
          }
          throw new Error(`Unexpected table ${table}`);
        }),
      });

      getServiceSupabaseClientMock.mockReturnValue(supabase);

      const response = await postCuec(
        new Request('https://example.com/api/soc/cuec', {
          method: 'POST',
          body: JSON.stringify({
            orgId: ORG_ID,
            engagementId: ENGAGEMENT_ID,
            serviceOrgId: SERVICE_ORG_ID,
            description: 'Review SOC complementary control',
            status: 'DEFICIENCY',
            tested: true,
            exceptionNote: 'Exception observed',
            userId: USER_ID,
          }),
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.cuec.id).toBe('cuec-1');

      expect(upsertAuditModuleRecordMock).toHaveBeenCalledWith(
        supabase,
        expect.objectContaining({
          metadata: expect.objectContaining({ cuecId: 'cuec-1', status: 'DEFICIENCY' }),
        }),
      );
      expect(queueManagerReviewMock).toHaveBeenCalledWith(
        supabase,
        expect.objectContaining({
          metadata: expect.objectContaining({ cuecId: 'cuec-1', exceptionNote: 'Exception observed' }),
        }),
      );
      expect(logAuditActivityMock).toHaveBeenCalledWith(
        supabase,
        expect.objectContaining({
          action: 'SOC_EXCEPTION_ESCALATED',
          entityId: 'cuec-1',
        }),
      );
    });
  });
});
