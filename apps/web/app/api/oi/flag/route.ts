import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';
import { queueManagerReview } from '../../../../../lib/audit/approvals';
import { logAuditActivity } from '../../../../../lib/audit/activity-log';
import { attachRequestId, getOrCreateRequestId } from '../../../lib/observability';
import { createApiGuard } from '../../../lib/api-guard';

const createFlagSchema = z.object({
  orgId: z.string().uuid(),
  engagementId: z.string().uuid(),
  documentId: z.string().uuid(),
  description: z.string().min(1),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('LOW'),
  userId: z.string().uuid(),
});

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = getServiceSupabaseClient();
  let payload;
  try {
    payload = createFlagSchema.parse(await request.json());
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
    resource: `oi:flag:${payload.documentId}`,
    rateLimit: { limit: 60, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const { data: doc } = await supabase
    .from('other_information_docs')
    .select('id')
    .eq('id', payload.documentId)
    .eq('org_id', payload.orgId)
    .maybeSingle();
  if (!doc) {
    return guard.json({ error: 'Other information document not found.' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('other_information_flags')
    .insert({
      org_id: payload.orgId,
      document_id: payload.documentId,
      description: payload.description,
      severity: payload.severity,
      status: 'OPEN',
      raised_by_user_id: payload.userId,
    })
    .select()
    .maybeSingle();

  if (error || !data) {
    return guard.json({ error: error?.message ?? 'Failed to raise flag.' }, { status: 500 });
  }

  await supabase
    .from('other_information_docs')
    .update({ status: 'IN_REVIEW' })
    .eq('id', payload.documentId);

  try {
    await queueManagerReview(supabase, {
      orgId: payload.orgId,
      engagementId: payload.engagementId,
      moduleCode: 'OI1',
      recordRef: payload.documentId,
      title: 'Other information flag raised',
      metadata: {
        flagId: data.id,
        description: data.description,
        severity: data.severity,
      },
      updatedByUserId: payload.userId,
    });
  } catch (moduleError) {
    return guard.json(
      { error: moduleError instanceof Error ? moduleError.message : 'Failed to queue other information review.' },
      { status: 500 },
    );
  }

  await logAuditActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.userId,
    action: 'OI_FLAGGED',
    entityType: 'AUDIT_OTHER_INFORMATION',
    entityId: data.id,
    metadata: {
      documentId: payload.documentId,
      severity: data.severity,
      description: data.description,
      requestId,
    },
  });

  return guard.respond({ flag: data });
}
