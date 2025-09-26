import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';
import { upsertAuditModuleRecord } from '../../../../../lib/audit/module-records';
import { logAuditActivity } from '../../../../../lib/audit/activity-log';
import { attachRequestId, getOrCreateRequestId } from '../../../lib/observability';
import { createApiGuard } from '../../../lib/api-guard';

const reportSchema = z.object({
  orgId: z.string().uuid(),
  engagementId: z.string().uuid(),
  serviceOrgId: z.string().uuid(),
  reportType: z.enum(['TYPE_1', 'TYPE_2']).optional(),
  scope: z.enum(['SOC1', 'SOC2', 'SOC3']).optional(),
  periodStart: z.string().date().optional(),
  periodEnd: z.string().date().optional(),
  issuedAt: z.string().date().optional(),
  auditor: z.string().optional(),
  notes: z.string().optional(),
  userId: z.string().uuid(),
});

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = getServiceSupabaseClient();
  let payload;
  try {
    payload = reportSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, attachRequestId({ status: 400 }, requestId));
    }
    return NextResponse.json({ error: 'Invalid JSON payload.' }, attachRequestId({ status: 400 }, requestId));
  }

  const guard = await createApiGuard({
    request,
    supabase,
    requestId,
    orgId: payload.orgId,
    resource: `soc:report:${payload.serviceOrgId}`,
    rateLimit: { limit: 60, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const { data: serviceOrg, error: serviceOrgError } = await supabase
    .from('service_organisations')
    .select('id, name, org_id')
    .eq('id', payload.serviceOrgId)
    .eq('org_id', payload.orgId)
    .maybeSingle();
  if (serviceOrgError) {
    return guard.json({ error: serviceOrgError.message }, { status: 500 });
  }
  if (!serviceOrg) {
    return guard.json({ error: 'Service organisation not found.' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('soc_reports')
    .insert({
      org_id: payload.orgId,
      engagement_id: payload.engagementId,
      service_org_id: payload.serviceOrgId,
      report_type: payload.reportType ?? 'TYPE_2',
      scope: payload.scope ?? 'SOC1',
      period_start: payload.periodStart ?? null,
      period_end: payload.periodEnd ?? null,
      issued_at: payload.issuedAt ?? null,
      auditor: payload.auditor ?? null,
      notes: payload.notes ?? null,
    })
    .select()
    .maybeSingle();

  if (error || !data) {
    return guard.json({ error: error?.message ?? 'Failed to record SOC report.' }, { status: 500 });
  }

  try {
    await upsertAuditModuleRecord(supabase, {
      orgId: payload.orgId,
      engagementId: payload.engagementId,
      moduleCode: 'SOC1',
      recordRef: payload.serviceOrgId,
      title: `${serviceOrg.name} SOC report`,
      metadata: {
        reportId: data.id,
        scope: data.scope,
        reportType: data.report_type,
        issuedAt: data.issued_at,
      },
      updatedByUserId: payload.userId,
    });
  } catch (moduleError) {
    return guard.json(
      { error: moduleError instanceof Error ? moduleError.message : 'Failed to update audit module metadata for report.' },
      { status: 500 },
    );
  }

  await logAuditActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.userId,
    action: 'SOC_REPORT_ADDED',
    entityType: 'AUDIT_SOC',
    entityId: data.id,
    metadata: {
      serviceOrgId: payload.serviceOrgId,
      reportType: data.report_type,
      scope: data.scope,
      periodStart: data.period_start,
      periodEnd: data.period_end,
      requestId,
    },
  });

  return guard.respond({ report: data });
}
