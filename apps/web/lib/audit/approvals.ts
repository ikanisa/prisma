import { ensureAuditRecordApprovalStage, upsertAuditModuleRecord } from './module-records';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../../src/integrations/supabase/types';

export async function queueManagerReview(
  client: SupabaseClient<Database>,
  params: {
    orgId: string;
    engagementId: string;
    moduleCode: Database['public']['Enums']['audit_module_code'];
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
