import { ensureAuditRecordApprovalStage, upsertAuditModuleRecord, type AuditModuleCode } from './module-records';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function queueManagerReview(
  client: SupabaseClient,
  params: {
    orgId: string;
    engagementId: string;
    moduleCode: AuditModuleCode;
    recordRef: string;
    title: string;
    metadata?: Record<string, unknown>;
    preparedByUserId?: string | null;
    updatedByUserId?: string | null;
  },
) {
  await upsertAuditModuleRecord(client, {
    orgId: params.orgId,
    engagementId: params.engagementId,
    moduleCode: params.moduleCode,
    recordRef: params.recordRef,
    title: params.title,
    recordStatus: 'READY_FOR_REVIEW',
    approvalState: 'SUBMITTED',
    currentStage: 'MANAGER',
    metadata: params.metadata,
    preparedByUserId: params.preparedByUserId,
    updatedByUserId: params.updatedByUserId,
  });

  await ensureAuditRecordApprovalStage(client, {
    orgId: params.orgId,
    engagementId: params.engagementId,
    moduleCode: params.moduleCode,
    recordRef: params.recordRef,
    stage: 'MANAGER',
    decision: 'PENDING',
    metadata: params.metadata,
    userId: params.updatedByUserId ?? params.preparedByUserId ?? null,
  });
}
