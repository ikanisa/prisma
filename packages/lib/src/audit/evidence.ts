import type { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import { getSignedUrlTTL, sanitizeMetadata } from '../security/signed-url-policy.js';
import type { AuditModuleCode } from './module-records.js';

type TypedClient = SupabaseClient;

export type EvidenceManifest = {
  id: string;
  moduleCode: AuditModuleCode;
  recordRef: string;
  generatedAt: string;
  dataset?: {
    ref?: string;
    hash?: string;
    parameters?: Record<string, unknown>;
  };
  sampling?: {
    planId?: string;
    size?: number;
    source?: string;
    items?: Array<{ id: string; populationRef?: string | null; description?: string | null; stratum?: string | null }>;
  };
  attachments?: Array<{
    documentId?: string;
    url?: string;
    name?: string;
    kind?: string;
  }>;
  metadata?: Record<string, unknown>;
};

export function buildEvidenceManifest(input: {
  moduleCode: AuditModuleCode;
  recordRef: string;
  dataset?: {
    ref?: string;
    hash?: string;
    parameters?: Record<string, unknown>;
  };
  sampling?: EvidenceManifest['sampling'];
  attachments?: EvidenceManifest['attachments'];
  metadata?: Record<string, unknown>;
}): EvidenceManifest {
  const generatedAt = new Date().toISOString();
  const manifestId = crypto.createHash('sha256').update(`${input.moduleCode}:${input.recordRef}:${generatedAt}`).digest('hex');

  return {
    id: `manifest_${manifestId.slice(0, 16)}`,
    moduleCode: input.moduleCode,
    recordRef: input.recordRef,
    generatedAt,
    dataset: input.dataset,
    sampling: input.sampling,
    attachments: input.attachments,
    metadata: input.metadata ? sanitizeMetadata(input.metadata) : undefined,
  } satisfies EvidenceManifest;
}

type EnsureDocumentParams = {
  client: TypedClient;
  orgId: string;
  engagementId?: string | null;
  userId: string;
  bucket: string;
  objectPath: string;
  documentName: string;
  mimeType?: string | null;
  fileSize?: number | null;
  expiresInSeconds?: number;
};

export async function ensureEvidenceDocument(params: EnsureDocumentParams) {
  const { client, orgId, engagementId, userId, bucket, objectPath, documentName, mimeType, fileSize } = params;

  const { data: existingDocument, error: lookupError } = await client
    .from('documents')
    .select('id')
    .eq('org_id', orgId)
    .eq('file_path', objectPath)
    .maybeSingle<{ id: string }>();

  if (lookupError && lookupError.code !== 'PGRST116') {
    throw new Error(`Failed to lookup document: ${lookupError.message}`);
  }

  let documentId = existingDocument?.id ?? null;

  if (!documentId) {
    const insertPayload = {
      org_id: orgId,
      engagement_id: engagementId ?? null,
      name: documentName,
      file_path: objectPath,
      file_type: mimeType ?? null,
      file_size: fileSize ?? null,
      uploaded_by: userId,
    };

    const { data, error } = await client.from('documents').insert(insertPayload).select('id').maybeSingle();
    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create document record');
    }
    documentId = data.id;
  }

  const expiresInSeconds = params.expiresInSeconds ?? getSignedUrlTTL('evidence');
  const { data: signedUrl, error: signedError } = await client.storage.from(bucket).createSignedUrl(objectPath, expiresInSeconds);

  if (signedError || !signedUrl?.signedUrl) {
    throw new Error(signedError?.message ?? 'Failed to generate signed URL for evidence document');
  }

  if (!documentId) {
    throw new Error('Document identifier was not created');
  }

  return { documentId, signedUrl: signedUrl.signedUrl };
}
