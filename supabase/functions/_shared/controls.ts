import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Database } from '../../src/integrations/supabase/types.ts';

export type ControlRecord = Database['public']['Tables']['controls']['Row'];
export type ControlWalkthroughRecord = Database['public']['Tables']['control_walkthroughs']['Row'];
export type ControlTestRecord = Database['public']['Tables']['control_tests']['Row'];
export type DeficiencyRecord = Database['public']['Tables']['deficiencies']['Row'];
export type ItgcGroupRecord = Database['public']['Tables']['itgc_groups']['Row'];

export interface ControlWithDetails extends ControlRecord {
  walkthroughs: ControlWalkthroughRecord[];
  tests: ControlTestRecord[];
  deficiencies: DeficiencyRecord[];
}

export async function listControls(
  client: SupabaseClient<Database>,
  orgId: string,
  engagementId: string,
): Promise<ControlWithDetails[]> {
  const { data, error } = await client
    .from('controls')
    .select('*, walkthroughs:control_walkthroughs(*), tests:control_tests(*), deficiencies:deficiencies(*)')
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .order('cycle', { ascending: true })
    .order('objective', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    ...(row as unknown as ControlRecord & {
      walkthroughs: ControlWalkthroughRecord[] | null;
      tests: ControlTestRecord[] | null;
      deficiencies: DeficiencyRecord[] | null;
    }),
    walkthroughs: ((row as any).walkthroughs ?? []) as ControlWalkthroughRecord[],
    tests: ((row as any).tests ?? []) as ControlTestRecord[],
    deficiencies: ((row as any).deficiencies ?? []) as DeficiencyRecord[],
  }));
}

export async function listItgcGroups(
  client: SupabaseClient<Database>,
  orgId: string,
  engagementId: string,
): Promise<ItgcGroupRecord[]> {
  const { data, error } = await client
    .from('itgc_groups')
    .select('*')
    .eq('org_id', orgId)
    .or(`engagement_id.eq.${engagementId},engagement_id.is.null`)
    .order('type', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}
