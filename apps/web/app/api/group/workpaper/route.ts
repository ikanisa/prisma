import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceSupabaseClient } from '@/lib/supabase-server';
import { ensureEvidenceDocument } from '@/lib/audit/evidence';
import { upsertAuditModuleRecord } from '@/lib/audit/module-records';
import { logAuditActivity } from '@/lib/audit/activity-log';
import { attachRequestId, getOrCreateRequestId } from '@/app/lib/observability';
import { createApiGuard } from '@/app/lib/api-guard';

const workpaperSchema = z.object({
  orgId: z.string().uuid(),
  engagementId: z.string().uuid(),
  componentId: z.string().uuid(),
  instructionId: z.string().uuid().optional(),
  documentBucket: z.string().min(1),
  documentPath: z.string().min(1),
  documentName: z.string().min(1),
  note: z.string().optional(),
  userId: z.string().uuid(),
});

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = await getServiceSupabaseClient();
  const supabaseUnsafe = supabase as SupabaseClient;
  let payload;
  try {
    payload = workpaperSchema.parse(await request.json());
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
    resource: `group:workpaper:${payload.componentId}`,
    rateLimit: { limit: 120, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  let documentId: string | null = null;
  let signedUrl: string | null = null;

  try {
    const ensured = await ensureEvidenceDocument({
      client: supabase,
      orgId: payload.orgId,
      engagementId: payload.engagementId,
      userId: payload.userId,
      bucket: payload.documentBucket,
      objectPath: payload.documentPath,
      documentName: payload.documentName,
    });
    documentId = ensured.documentId;
    signedUrl = ensured.signedUrl;
  } catch (error) {
    return guard.json(
      { error: error instanceof Error ? error.message : 'Failed to register workpaper document.' },
      { status: 500 },
    );
  }

  const { data, error } = await supabaseUnsafe
    .from('group_workpapers')
    .insert({
      org_id: payload.orgId,
      engagement_id: payload.engagementId,
      component_id: payload.componentId,
      instruction_id: payload.instructionId ?? null,
      document_id: documentId,
      title: payload.documentName,
      uploaded_by_user_id: payload.userId,
      notes: payload.note ?? null,
    })
    .select()
    .maybeSingle();

  if (error || !data) {
    return guard.json(
      { error: error?.message ?? 'Failed to create workpaper.' },
      { status: 500 },
    );
  }

  try {
    await upsertAuditModuleRecord(supabase, {
      orgId: payload.orgId,
      engagementId: payload.engagementId,
      moduleCode: 'GRP1',
      recordRef: payload.componentId,
      title: 'Component workpapers',
      metadata: {
        lastWorkpaperId: data.id,
        documentId,
        signedUrl,
        note: payload.note,
      },
      updatedByUserId: payload.userId,
    });
  } catch (moduleError) {
    return guard.json(
      { error: moduleError instanceof Error ? moduleError.message : 'Failed to update audit module records for workpaper.' },
      { status: 500 },
    );
  }

  await logAuditActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.userId,
    action: 'GRP_WORKPAPER_RECEIVED',
    entityType: 'AUDIT_GROUP',
    entityId: data.id,
    metadata: {
      componentId: payload.componentId,
      instructionId: payload.instructionId,
      documentId,
      note: payload.note,
      requestId,
    },
  });

  return guard.respond({ workpaper: data, signedUrl });
}
