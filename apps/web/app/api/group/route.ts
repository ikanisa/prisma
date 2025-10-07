import { NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '../../../../lib/supabase-server';
import { attachRequestId, getOrCreateRequestId } from '../../lib/observability';
import { authenticateGroupRequest } from '../../lib/group/request';

export async function GET(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const { searchParams } = new URL(request.url);
  const engagementId = searchParams.get('engagementId');

  if (!engagementId) {
    return NextResponse.json(
      { error: 'orgId and engagementId query parameters are required.' },
      attachRequestId({ status: 400 }, requestId),
    );
  }

  const supabase = await getServiceSupabaseClient();

  const auth = await authenticateGroupRequest({
    request,
    supabase,
    orgIdCandidate: searchParams.get('orgId'),
    userErrorMessage: 'Authentication required',
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, attachRequestId({ status: auth.status }, requestId));
  }

  const { orgId } = auth;

  const { data, error } = await supabase
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
