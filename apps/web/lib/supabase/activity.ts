import type { SupabaseClient } from '@supabase/supabase-js';

type DatabaseClient = SupabaseClient;

interface ActivityInput {
  orgId: string;
  userId: string;
  action: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export async function recordSpecialistActivity(
  client: DatabaseClient,
  input: ActivityInput,
): Promise<void> {
  const { error } = await client.from('activity_log').insert({
    org_id: input.orgId,
    user_id: input.userId,
    action: input.action,
    entity_type: 'audit_specialist',
    entity_id: input.entityId,
    metadata: input.metadata ?? null,
  });

  if (error) {
    console.error('Failed to record specialist activity', error);
  }
}
