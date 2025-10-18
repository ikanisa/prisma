import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceSupabaseClient } from '@/lib/supabase-server';
import { attachRequestId, getOrCreateRequestId } from '@/app/lib/observability';

export async function GET(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId');
  const engagementId = searchParams.get('engagementId');

  if (!orgId || !engagementId) {
    return NextResponse.json(
      { error: 'orgId and engagementId query parameters are required.' },
      attachRequestId({ status: 400 }, requestId),
    );
  }

  const supabase = await getServiceSupabaseClient();
  const supabaseUnsafe = supabase as SupabaseClient;

  const { data, error } = await supabaseUnsafe
    .from('group_components')
    .select(
      `
        *,
        instructions:group_instructions(*),
        reviews:group_reviews(*),
        workpapers:group_workpapers(*)
      `,
    )
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .order('significance', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message ?? 'Failed to load group components.' },
      attachRequestId({ status: 500 }, requestId),
    );
  }

  return NextResponse.json({ components: data ?? [] }, attachRequestId({ status: 200 }, requestId));
}
