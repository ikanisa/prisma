import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Database } from '../../src/integrations/supabase/types.ts';

export type PbcRequestRecord = Database['public']['Tables']['pbc_requests']['Row'];
export type PbcDeliveryRecord = Database['public']['Tables']['pbc_deliveries']['Row'];

export interface PbcRequestWithDeliveries extends PbcRequestRecord {
  deliveries: PbcDeliveryRecord[];
}

export async function listPbcRequests(
  client: SupabaseClient<Database>,
  orgId: string,
  engagementId: string,
): Promise<PbcRequestWithDeliveries[]> {
  const { data, error } = await client
    .from('pbc_requests')
    .select('*, deliveries:pbc_deliveries(*)')
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .order('due_at', { ascending: true, nullsLast: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    ...(row as unknown as PbcRequestRecord & { deliveries: PbcDeliveryRecord[] | null }),
    deliveries: ((row as any).deliveries ?? []) as PbcDeliveryRecord[],
  }));
}
