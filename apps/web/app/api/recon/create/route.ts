import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';
import { createReconciliationSchema } from '../../../../../lib/accounting/schemas';
import { logActivity } from '../../../../../lib/accounting/activity-log';

export async function POST(request: Request) {
  const supabase = getServiceSupabaseClient();
  let payload;
  try {
    payload = createReconciliationSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let glBalance = 0;
  if (payload.controlAccountId) {
    const { data: entries } = await supabase
      .from('ledger_entries')
      .select('debit, credit')
      .eq('account_id', payload.controlAccountId)
      .eq('org_id', payload.orgId)
      .eq('entity_id', payload.entityId)
      .eq('period_id', payload.periodId);
    glBalance = (entries ?? []).reduce((sum, entry) => sum + entry.debit - entry.credit, 0);
  }

  const difference = glBalance - payload.externalBalance;

  const { data, error } = await supabase
    .from('reconciliations')
    .insert({
      org_id: payload.orgId,
      entity_id: payload.entityId,
      period_id: payload.periodId,
      type: payload.type,
      control_account_id: payload.controlAccountId ?? null,
      gl_balance: glBalance,
      external_balance: payload.externalBalance,
      difference,
      prepared_by_user_id: payload.preparedByUserId,
      status: 'IN_PROGRESS',
    })
    .select()
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create reconciliation' }, { status: 500 });
  }

  await logActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.preparedByUserId,
    action: 'RECON_CREATED',
    entityType: 'RECONCILIATION',
    entityId: data.id,
    metadata: { type: payload.type, difference },
  });

  return NextResponse.json({ reconciliation: data });
}
