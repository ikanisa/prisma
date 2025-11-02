import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceSupabaseClient } from '@/lib/supabase-server';
import { withRouteCache } from '@/lib/cache/route-cache';
import { attachRequestId, getOrCreateRequestId } from '@/app/lib/observability';

class RouteDataError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

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

  try {
    const payload = await withRouteCache('groupComponents', [orgId, engagementId], async () => {
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
        throw new RouteDataError(error.message ?? 'Failed to load group components.', 500);
      }

      return { components: data ?? [] };
    });

    return NextResponse.json(payload, attachRequestId({ status: 200 }, requestId));
  } catch (error) {
    if (error instanceof RouteDataError) {
      return NextResponse.json({ error: error.message }, attachRequestId({ status: error.status }, requestId));
    }
    throw error;
  }
}
