import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';
import { closeReconciliationSchema } from '../../../../../lib/accounting/schemas';
import { logActivity } from '../../../../../lib/accounting/activity-log';

export async function POST(request: Request) {
  const supabase = getServiceSupabaseClient();
  let payload;
  try {
    payload = closeReconciliationSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { data: recon } = await supabase
    .from('reconciliations')
    .select('id, org_id, entity_id, difference, status')
    .eq('id', payload.reconciliationId)
    .eq('org_id', payload.orgId)
    .maybeSingle();

  if (!recon) {
    return NextResponse.json({ error: 'Reconciliation not found' }, { status: 404 });
  }

  const { data: items } = await supabase
    .from('reconciliation_items')
    .select('amount, resolved')
    .eq('reconciliation_id', payload.reconciliationId);

  const adjustments = (items ?? []).filter((item) => item.resolved).reduce((sum, item) => sum + item.amount, 0);
  const remaining = recon.difference - adjustments;

  if (Math.abs(remaining) > 0.01) {
    return NextResponse.json(
      { error: 'Reconciliation difference must be cleared or supported', remaining },
      { status: 422 }
    );
  }

  const { error } = await supabase
    .from('reconciliations')
    .update({
      status: 'CLOSED',
      reviewed_by_user_id: payload.userId,
      closed_at: new Date().toISOString(),
      schedule_document_id: payload.scheduleDocumentId ?? null,
    })
    .eq('id', payload.reconciliationId)
    .eq('org_id', payload.orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.userId,
    action: 'RECON_CLOSED',
    entityType: 'RECONCILIATION',
    entityId: payload.reconciliationId,
    metadata: { adjustments, remaining },
  });

  return NextResponse.json({ status: 'CLOSED' });
}
