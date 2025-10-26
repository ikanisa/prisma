import type { Database } from '../../../src/integrations/supabase/types.ts';

export type ActivityLogRow = Database['public']['Tables']['activity_log']['Insert'];

export interface ActivityLogClient {
  from(table: 'activity_log'): {
    insert(record: ActivityLogRow): Promise<{ error: { message?: string } | null }>;
  };
}

export async function logActivity(
  client: ActivityLogClient,
  params: { orgId: string; userId: string; action: string; entityId: string; metadata?: Record<string, unknown> },
) {
  const { error } = await client.from('activity_log').insert({
    org_id: params.orgId,
    user_id: params.userId,
    action: params.action,
    entity_type: 'TAX_MT_CALC',
    entity_id: params.entityId,
    metadata: params.metadata ?? {},
  });

  if (error) {
    console.error('activity_log_error', error);
  }
}
