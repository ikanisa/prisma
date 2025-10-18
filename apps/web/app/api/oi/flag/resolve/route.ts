import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

import { getServiceSupabaseClient } from '@/lib/supabase-server';
import { queueManagerReview } from '@/lib/audit/approvals';
import { logAuditActivity } from '@/lib/audit/activity-log';
import { attachRequestId, getOrCreateRequestId } from '@/app/lib/observability';
import { createApiGuard } from '@/app/lib/api-guard';

const resolveSchema = z.object({
  orgId: z.string().uuid(),
  engagementId: z.string().uuid(),
  flagId: z.string().uuid(),
  resolutionNote: z.string().optional(),
  userId: z.string().uuid(),
});

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = await getServiceSupabaseClient();
  let payload;
  try {
    payload = resolveSchema.parse(await request.json());
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
    resource: `oi:flag:resolve:${payload.flagId}`,
    rateLimit: { limit: 60, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const { data: flag } = await supabase
    .from('other_information_flags')
    .select('id, document_id')
    .eq('id', payload.flagId)
    .eq('org_id', payload.orgId)
    .maybeSingle();

  if (!flag) {
    return guard.json({ error: 'Flag not found.' }, { status: 404 });
  }

  const { error } = await supabase
    .from('other_information_flags')
    .update({
      status: 'RESOLVED',
      resolved_by_user_id: payload.userId,
      resolved_at: new Date().toISOString(),
      resolution_note: payload.resolutionNote ?? null,
    })
    .eq('id', payload.flagId);

  if (error) {
    return guard.json({ error: error.message ?? 'Failed to resolve flag.' }, { status: 500 });
  }

  const { data: openFlags } = await supabase
    .from('other_information_flags')
    .select('id')
    .eq('document_id', flag.document_id)
    .eq('status', 'OPEN');

  if (!openFlags || openFlags.length === 0) {
    await supabase
      .from('other_information_docs')
      .update({ status: 'IN_REVIEW' })
      .eq('id', flag.document_id);

    try {
      await queueManagerReview(supabase, {
        orgId: payload.orgId,
        engagementId: payload.engagementId,
        moduleCode: 'OI1',
        recordRef: flag.document_id,
        title: 'Other information flag resolved',
        metadata: {
          flagId: flag.id,
          resolutionNote: payload.resolutionNote,
          requestId,
        },
        updatedByUserId: payload.userId,
      });
    } catch (moduleError) {
      return guard.json(
        { error: moduleError instanceof Error ? moduleError.message : 'Failed to queue review after resolution.' },
        { status: 500 },
      );
    }
  }

  await logAuditActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.userId,
    action: 'OI_RESOLVED',
    entityType: 'AUDIT_OTHER_INFORMATION',
    entityId: payload.flagId,
    metadata: {
      documentId: flag.document_id,
      resolutionNote: payload.resolutionNote,
      requestId,
    },
  });

  return guard.respond({ success: true });
}
