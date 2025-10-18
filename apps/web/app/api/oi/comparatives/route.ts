import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

import { getServiceSupabaseClient } from '@/lib/supabase-server';
import { logAuditActivity } from '@/lib/audit/activity-log';
import { attachRequestId, getOrCreateRequestId } from '@/app/lib/observability';
import { createApiGuard } from '@/app/lib/api-guard';

const comparisonSchema = z.object({
  orgId: z.string().uuid(),
  engagementId: z.string().uuid(),
  documentId: z.string().uuid(),
  comparativeTitle: z.string().min(1),
  varianceNote: z.string().optional(),
  userId: z.string().uuid(),
});

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = await getServiceSupabaseClient();
  let payload;
  try {
    payload = comparisonSchema.parse(await request.json());
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
    resource: `oi:comparatives:${payload.documentId}`,
    rateLimit: { limit: 60, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const { data: comparison, error } = await supabase
    .from('other_information_comparatives')
    .insert({
      org_id: payload.orgId,
      engagement_id: payload.engagementId,
      document_id: payload.documentId,
      comparative_title: payload.comparativeTitle,
      variance_note: payload.varianceNote ?? null,
      created_by_user_id: payload.userId,
    })
    .select()
    .maybeSingle();

  if (error || !comparison) {
    return guard.json({ error: error?.message ?? 'Failed to record comparative.' }, { status: 500 });
  }

  await logAuditActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.userId,
    action: 'OI_UPLOADED',
    entityType: 'AUDIT_OTHER_INFORMATION',
    entityId: comparison.id,
    metadata: {
      documentId: payload.documentId,
      comparativeTitle: payload.comparativeTitle,
      varianceNote: payload.varianceNote ?? null,
      requestId,
    },
  });

  return guard.respond({ comparative: comparison });
}
