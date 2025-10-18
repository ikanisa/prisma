import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

import { getServiceSupabaseClient } from '@/lib/supabase-server';
import { upsertAuditModuleRecord } from '@/lib/audit/module-records';
import { queueManagerReview } from '@/lib/audit/approvals';
import { logAuditActivity } from '@/lib/audit/activity-log';
import { attachRequestId, getOrCreateRequestId } from '@/app/lib/observability';
import { createApiGuard } from '@/app/lib/api-guard';

const cuecSchema = z.object({
  orgId: z.string().uuid(),
  engagementId: z.string().uuid(),
  serviceOrgId: z.string().uuid(),
  description: z.string().min(1),
  status: z.enum(['NOT_ASSESSED', 'ADEQUATE', 'DEFICIENCY']).optional(),
  tested: z.boolean().optional(),
  exceptionNote: z.string().optional(),
  compensatingControl: z.string().optional(),
  userId: z.string().uuid(),
});

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = await getServiceSupabaseClient();
  let payload;
  try {
    payload = cuecSchema.parse(await request.json());
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
    resource: `soc:cuec:${payload.serviceOrgId}`,
    rateLimit: { limit: 45, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const { data: cuec, error } = await supabase
    .from('cuec_controls')
    .insert({
      org_id: payload.orgId,
      engagement_id: payload.engagementId,
      service_org_id: payload.serviceOrgId,
      description: payload.description,
      status: payload.status ?? 'NOT_ASSESSED',
      tested: payload.tested ?? false,
      exception_note: payload.exceptionNote ?? null,
      compensating_control: payload.compensatingControl ?? null,
    })
    .select()
    .maybeSingle();

  if (error || !cuec) {
    return guard.json({ error: error?.message ?? 'Failed to record CUEC.' }, { status: 500 });
  }

  try {
    await upsertAuditModuleRecord(supabase, {
      orgId: payload.orgId,
      engagementId: payload.engagementId,
      moduleCode: 'SOC1',
      recordRef: payload.serviceOrgId,
      title: 'SOC CUECs',
      metadata: {
        cuecId: cuec.id,
        status: cuec.status,
        tested: cuec.tested,
        exceptionNote: cuec.exception_note,
      },
      updatedByUserId: payload.userId,
    });

    if (cuec.status === 'DEFICIENCY' || cuec.exception_note) {
      await queueManagerReview(supabase, {
        orgId: payload.orgId,
        engagementId: payload.engagementId,
        moduleCode: 'SOC1',
        recordRef: payload.serviceOrgId,
        title: 'SOC CUEC exception',
        metadata: {
          cuecId: cuec.id,
          status: cuec.status,
          exceptionNote: cuec.exception_note,
        },
        updatedByUserId: payload.userId,
      });

      await logAuditActivity(supabase, {
        orgId: payload.orgId,
        userId: payload.userId,
        action: 'SOC_EXCEPTION_ESCALATED',
        entityType: 'AUDIT_SOC',
        entityId: cuec.id,
        metadata: {
          serviceOrgId: payload.serviceOrgId,
          status: cuec.status,
          exceptionNote: cuec.exception_note,
          compensatingControl: cuec.compensating_control,
          requestId,
        },
      });
    }
  } catch (moduleError) {
    return guard.json(
      { error: moduleError instanceof Error ? moduleError.message : 'Failed to update SOC approval metadata.' },
      { status: 500 },
    );
  }

  await logAuditActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.userId,
    action: 'SOC_CUEC_TESTED',
    entityType: 'AUDIT_SOC',
    entityId: cuec.id,
    metadata: {
      serviceOrgId: payload.serviceOrgId,
      status: cuec.status,
      tested: cuec.tested,
      exceptionNote: cuec.exception_note,
      requestId,
    },
  });

  return guard.respond({ cuec });
}
