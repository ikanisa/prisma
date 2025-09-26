import { NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '../../lib/supabase-server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId');
  const entityId = searchParams.get('entityId');
  const periodId = searchParams.get('periodId');

  if (!orgId) {
    return NextResponse.json({ error: 'orgId query parameter is required.' }, { status: 400 });
  }

  const supabase = await getServiceSupabaseClient();

  let query = supabase
    .from('reconciliations')
    .select(
      `
        id,
        org_id,
        entity_id,
        period_id,
        type,
        control_account_id,
        gl_balance,
        external_balance,
        difference,
        status,
        prepared_by_user_id,
        reviewed_by_user_id,
        closed_at,
        schedule_document_id,
        created_at,
        updated_at,
        items:reconciliation_items(*)
      `,
    )
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (entityId) {
    query = query.eq('entity_id', entityId);
  }

  if (periodId) {
    query = query.eq('period_id', periodId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message ?? 'Failed to load reconciliations.' }, { status: 500 });
  }

  return NextResponse.json({ reconciliations: data ?? [] });
}
