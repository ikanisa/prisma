import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';
import { ensureEvidenceDocument, buildEvidenceManifest } from '../../../../../lib/audit/evidence';
import { upsertAuditModuleRecord } from '../../../../../lib/audit/module-records';
import { logAuditActivity } from '../../../../../lib/audit/activity-log';
import { attachRequestId, getOrCreateRequestId } from '../../../lib/observability';
import { createApiGuard } from '../../../lib/api-guard';

const uploadSchema = z.object({
  orgId: z.string().uuid(),
  engagementId: z.string().uuid(),
  title: z.string().min(1),
  summary: z.string().optional(),
  documentBucket: z.string().min(1),
  documentPath: z.string().min(1),
  documentName: z.string().min(1),
  userId: z.string().uuid(),
});

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = getServiceSupabaseClient();
  let payload;
  try {
    payload = uploadSchema.parse(await request.json());
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
    resource: `oi:doc:${payload.engagementId}`,
    rateLimit: { limit: 30, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  let documentId: string;
  let signedUrl: string;
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
      { error: error instanceof Error ? error.message : 'Failed to register other information document.' },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from('other_information_docs')
    .insert({
      org_id: payload.orgId,
      engagement_id: payload.engagementId,
      title: payload.title,
      summary: payload.summary ?? null,
      document_id: documentId,
      uploaded_by_user_id: payload.userId,
      status: 'UPLOADED',
    })
    .select()
    .maybeSingle();

  if (error || !data) {
    return guard.json({ error: error?.message ?? 'Failed to create other information document.' }, { status: 500 });
  }

  const manifest = buildEvidenceManifest({
    moduleCode: 'OI1',
    recordRef: data.id,
    attachments: [
      {
        documentId,
        url: signedUrl,
        name: payload.documentName,
        kind: 'OTHER_INFORMATION',
      },
    ],
    metadata: {
      title: payload.title,
      summary: payload.summary,
    },
  });

  try {
    await upsertAuditModuleRecord(supabase, {
      orgId: payload.orgId,
      engagementId: payload.engagementId,
      moduleCode: 'OI1',
      recordRef: data.id,
      title: payload.title,
      recordStatus: 'IN_PROGRESS',
      approvalState: 'DRAFT',
      currentStage: 'PREPARER',
      preparedByUserId: payload.userId,
      metadata: {
        summary: payload.summary,
        documentId,
        manifest,
      },
      userId: payload.userId,
    });
  } catch (moduleError) {
    return guard.json(
      { error: moduleError instanceof Error ? moduleError.message : 'Failed to register other information document in audit tracker.' },
      { status: 500 },
    );
  }

  await logAuditActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.userId,
    action: 'OI_UPLOADED',
    entityType: 'AUDIT_OTHER_INFORMATION',
    entityId: data.id,
    metadata: {
      title: payload.title,
      summary: payload.summary,
      documentId,
      requestId,
    },
  });

  return guard.respond({ document: data, signedUrl });
}
