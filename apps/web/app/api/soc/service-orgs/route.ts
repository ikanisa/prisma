import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';
import { upsertAuditModuleRecord } from '../../../../../lib/audit/module-records';
import { logAuditActivity } from '../../../../../lib/audit/activity-log';
import { attachRequestId, getOrCreateRequestId } from '../../../lib/observability';
import { createApiGuard } from '../../../lib/api-guard';

const createSchema = z.object({
  orgId: z.string().uuid(),
  engagementId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  serviceType: z.string().optional(),
  relianceAssessed: z.boolean().optional(),
  residualRisk: z.string().optional(),
  userId: z.string().uuid(),
});

export async function GET(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId');
  const engagementId = searchParams.get('engagementId');

  if (!orgId || !engagementId) {
    return NextResponse.json(
      { error: 'orgId and engagementId query parameters are required.' },
      attachRequestId({ status: 400 }, requestId),
    );
  }

  const supabase = await getServiceSupabaseClient();
  const { data, error } = await supabase
    .from('service_organisations')
    .select(
      `
        *,
        reports:soc_reports(*),
        cuecs:cuec_controls(*)
      `,
    )
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message ?? 'Failed to load service organisations.' },
      attachRequestId({ status: 500 }, requestId),
    );
  }

  return NextResponse.json({ serviceOrgs: data ?? [] }, attachRequestId({ status: 200 }, requestId));
}

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = await getServiceSupabaseClient();
  let payload;
  try {
    payload = createSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.flatten() },
        attachRequestId({ status: 400 }, requestId),
      );
    }
    return NextResponse.json(
      { error: 'Invalid JSON payload.' },
      attachRequestId({ status: 400 }, requestId),
    );
  }

  const guard = await createApiGuard({
    request,
    supabase,
    requestId,
    orgId: payload.orgId,
    resource: `soc:service-org:create:${payload.engagementId}`,
    rateLimit: { limit: 60, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const { data, error } = await supabase
    .from('service_organisations')
    .insert({
      org_id: payload.orgId,
      engagement_id: payload.engagementId,
      name: payload.name,
      description: payload.description ?? null,
      service_type: payload.serviceType ?? null,
      residual_risk: payload.residualRisk ?? null,
      reliance_assessed: payload.relianceAssessed ?? false,
    })
    .select()
    .maybeSingle();

  if (error || !data) {
    return guard.json(
      { error: error?.message ?? 'Failed to create service organisation.' },
      { status: 500 },
    );
  }

  try {
    await upsertAuditModuleRecord(supabase, {
      orgId: payload.orgId,
      engagementId: payload.engagementId,
      moduleCode: 'SOC1',
      recordRef: data.id,
      title: `${data.name} service org`,
      recordStatus: 'IN_PROGRESS',
      approvalState: 'DRAFT',
      currentStage: 'PREPARER',
      preparedByUserId: payload.userId,
      metadata: {
        serviceType: data.service_type,
        residualRisk: data.residual_risk,
      },
      userId: payload.userId,
    });
  } catch (moduleError) {
    return guard.json(
      { error: moduleError instanceof Error ? moduleError.message : 'Failed to register service organisation in audit module records.' },
      { status: 500 },
    );
  }

  await logAuditActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.userId,
    action: 'SOC_CREATED',
    entityType: 'AUDIT_SOC',
    entityId: data.id,
    metadata: {
      serviceType: data.service_type,
      residualRisk: data.residual_risk,
      relianceAssessed: data.reliance_assessed,
      requestId,
    },
  });

  return guard.respond({ serviceOrg: data });
}
