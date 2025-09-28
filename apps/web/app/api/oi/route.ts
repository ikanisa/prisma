import { NextResponse } from 'next/server';

import { getServiceSupabaseClient } from '../../../../lib/supabase-server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId');
  const engagementId = searchParams.get('engagementId');

  if (!orgId || !engagementId) {
    return NextResponse.json({ error: 'orgId and engagementId query parameters are required.' }, { status: 400 });
  }

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
    return NextResponse.json({ error: error.message ?? 'Failed to load other information documents.' }, { status: 500 });
  }

  return NextResponse.json({ documents: data ?? [] });
}
