import { NextResponse } from 'next/server';

import { getServiceSupabaseClient } from '@/lib/supabase-server';
import { withRouteCache } from '@/lib/cache/route-cache';

class RouteDataError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId');
  const engagementId = searchParams.get('engagementId');

  if (!orgId || !engagementId) {
    return NextResponse.json({ error: 'orgId and engagementId query parameters are required.' }, { status: 400 });
  }

  try {
    const payload = await withRouteCache('otherInformationDocs', [orgId, engagementId], async () => {
      const supabase = await getServiceSupabaseClient();

      const { data, error } = await supabase
        .from('other_information_docs')
        .select(
          `
            *,
            flags:other_information_flags(*),
            comparatives:other_information_comparatives(*)
          `,
        )
        .eq('org_id', orgId)
        .eq('engagement_id', engagementId)
        .order('uploaded_at', { ascending: true });

      if (error) {
        throw new RouteDataError(error.message ?? 'Failed to load other information documents.', 500);
      }

      return { documents: data ?? [] };
    });

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof RouteDataError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
