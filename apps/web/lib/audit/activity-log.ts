import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../../src/integrations/supabase/types';

export async function logAuditActivity(
  supabase: SupabaseClient<Database>,
  params: {
    orgId: string;
    userId: string;
    action:
      | 'CTRL_ADDED'
      | 'CTRL_UPDATED'
      | 'CTRL_WALKTHROUGH_DONE'
      | 'CTRL_TEST_RUN'
      | 'CTRL_DEFICIENCY_RAISED'
      | 'ADA_RUN_STARTED'
      | 'ADA_RUN_COMPLETED'
      | 'ADA_EXCEPTION_ADDED'
      | 'ADA_EXCEPTION_RESOLVED';
    entityType?: string | null;
    entityId?: string | null;
    metadata?: Record<string, unknown> | null;
  },
) {
  const { orgId, userId, action, entityType, entityId, metadata } = params;
  await supabase.from('activity_log').insert({
    org_id: orgId,
    user_id: userId,
    action,
    entity_type: entityType ?? 'AUDIT_CONTROL',
    entity_id: entityId ?? null,
    metadata: metadata ?? null,
  });
}
