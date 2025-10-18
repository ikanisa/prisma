import type { SupabaseClient } from '@supabase/supabase-js';

export type AuditModuleCode = string;
export type AuditRecordStatus = string;
export type AuditApprovalState = string;
export type AuditApprovalStage = string;
export type AuditApprovalDecision = string;

type TypedClient = SupabaseClient;

type UpsertRecordParams = {
  orgId: string;
  engagementId: string;
  moduleCode: AuditModuleCode;
  recordRef: string;
  title?: string;
  metadata?: Record<string, unknown>;
  recordStatus?: AuditRecordStatus;
  approvalState?: AuditApprovalState;
  currentStage?: AuditApprovalStage;
  preparedByUserId?: string | null;
  ownerUserId?: string | null;
  currentReviewerUserId?: string | null;
  lockedAt?: string | null;
  approvals?: unknown[];
  userId?: string | null;
  updatedByUserId?: string | null;
};

type EnsureApprovalStageParams = {
  orgId: string;
  engagementId: string;
  moduleCode: AuditModuleCode;
  recordRef: string;
  stage: AuditApprovalStage;
  decision?: AuditApprovalDecision;
  decidedByUserId?: string | null;
  decidedAt?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown>;
  userId?: string | null;
};

async function fetchModuleRecord(
  client: TypedClient,
  params: Pick<UpsertRecordParams, 'orgId' | 'engagementId' | 'moduleCode' | 'recordRef'>,
) {
  const { data, error } = await client
    .from('audit_module_records')
    .select('id, title, record_status, approval_state, current_stage, prepared_by_user_id, owner_user_id, current_reviewer_user_id, locked_at, approvals, metadata, created_by_user_id, updated_by_user_id')
    .match({
      org_id: params.orgId,
      engagement_id: params.engagementId,
      module_code: params.moduleCode,
      record_ref: params.recordRef,
    })
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load audit module record: ${error.message}`);
  }

  return data ?? null;
}

function mergeMetadata(existing: unknown, next?: Record<string, unknown>) {
  const base = (existing && typeof existing === 'object') ? (existing as Record<string, unknown>) : {};
  return next ? { ...base, ...next } : base;
}

export async function upsertAuditModuleRecord(client: TypedClient, params: UpsertRecordParams) {
  const existing = await fetchModuleRecord(client, params);

  const resolvedTitle = params.title ?? existing?.title ?? 'Untitled';
  const resolvedStatus = params.recordStatus ?? existing?.record_status ?? 'NOT_STARTED';
  const resolvedApprovalState = params.approvalState ?? existing?.approval_state ?? 'DRAFT';
  const resolvedStage = params.currentStage ?? existing?.current_stage ?? 'PREPARER';
  const resolvedPreparedBy =
    params.preparedByUserId !== undefined ? params.preparedByUserId : existing?.prepared_by_user_id ?? null;
  const resolvedOwner = params.ownerUserId !== undefined ? params.ownerUserId : existing?.owner_user_id ?? null;
  const resolvedReviewer =
    params.currentReviewerUserId !== undefined
      ? params.currentReviewerUserId
      : existing?.current_reviewer_user_id ?? null;
  const resolvedLockedAt = params.lockedAt !== undefined ? params.lockedAt : existing?.locked_at ?? null;
  const resolvedApprovals = params.approvals ?? (Array.isArray(existing?.approvals) ? existing?.approvals : []);
  const resolvedMetadata = mergeMetadata(existing?.metadata, params.metadata);
  const resolvedUpdatedBy = params.updatedByUserId ?? params.userId ?? existing?.updated_by_user_id ?? null;

  const payload = {
    title: resolvedTitle,
    record_status: resolvedStatus,
    approval_state: resolvedApprovalState,
    current_stage: resolvedStage,
    prepared_by_user_id: resolvedPreparedBy,
    owner_user_id: resolvedOwner,
    current_reviewer_user_id: resolvedReviewer,
    locked_at: resolvedLockedAt,
    approvals: resolvedApprovals,
    metadata: resolvedMetadata,
    updated_by_user_id: resolvedUpdatedBy,
  };

  if (existing) {
    const { data, error } = await client
      .from('audit_module_records')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .maybeSingle();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to update audit module record');
    }

    return data;
  }

  const insertPayload = {
    org_id: params.orgId,
    engagement_id: params.engagementId,
    module_code: params.moduleCode,
    record_ref: params.recordRef,
    ...payload,
    created_by_user_id: params.userId ?? resolvedPreparedBy ?? null,
  };

  const { data, error } = await client
    .from('audit_module_records')
    .insert(insertPayload)
    .select()
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create audit module record');
  }

  return data;
}

export async function ensureAuditRecordApprovalStage(
  client: TypedClient,
  params: EnsureApprovalStageParams,
) {
  const record = await fetchModuleRecord(client, params);
  if (!record) {
    throw new Error('Audit module record not found for approval stage');
  }

  const { data: existing, error: fetchError } = await client
    .from('audit_record_approvals')
    .select('id, metadata')
    .match({ record_id: record.id, stage: params.stage })
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to load approval stage: ${fetchError.message}`);
  }

  const resolvedDecision = params.decision ?? 'PENDING';
  const resolvedMetadata = mergeMetadata(existing?.metadata, params.metadata);
  const resolvedUserId = params.userId ?? null;

  if (existing) {
    const { error } = await client
      .from('audit_record_approvals')
      .update({
        decision: resolvedDecision,
        decided_by_user_id: params.decidedByUserId ?? null,
        decided_at: params.decidedAt ?? null,
        note: params.note ?? null,
        metadata: resolvedMetadata,
        updated_by_user_id: resolvedUserId,
      })
      .eq('id', existing.id);

    if (error) {
      throw new Error(error.message ?? 'Failed to update approval stage');
    }

    return existing.id;
  }

  const { data, error } = await client
    .from('audit_record_approvals')
    .insert({
      record_id: record.id,
      stage: params.stage,
      decision: resolvedDecision,
      decided_by_user_id: params.decidedByUserId ?? null,
      decided_at: params.decidedAt ?? null,
      note: params.note ?? null,
      metadata: resolvedMetadata,
      created_by_user_id: resolvedUserId,
      updated_by_user_id: resolvedUserId,
    })
    .select('id')
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to insert approval stage');
  }

  return data.id;
}
