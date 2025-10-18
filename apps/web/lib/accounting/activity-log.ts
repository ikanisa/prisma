import type { SupabaseClient } from '@supabase/supabase-js';

export async function logActivity(
  supabase: SupabaseClient,
  params: {
    orgId: string;
    userId: string;
    action: string;
    entityType?: string | null;
    entityId?: string | null;
    metadata?: Record<string, unknown> | null;
  }
) {
  const { orgId, userId, action, entityType, entityId, metadata } = params;
  await supabase.from('activity_log').insert({
    org_id: orgId,
    user_id: userId,
    action,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    metadata: metadata ?? null,
  });
}
