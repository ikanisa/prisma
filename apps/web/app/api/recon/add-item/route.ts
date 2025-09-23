import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';
import { addReconciliationItemSchema } from '../../../../../lib/accounting/schemas';

export async function POST(request: Request) {
  const supabase = getServiceSupabaseClient();
  let payload;
  try {
    payload = addReconciliationItemSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { data: recon } = await supabase
    .from('reconciliations')
    .select('id')
    .eq('id', payload.reconciliationId)
    .eq('org_id', payload.orgId)
    .maybeSingle();

  if (!recon) {
    return NextResponse.json({ error: 'Reconciliation not found' }, { status: 404 });
  }

  const { error } = await supabase.from('reconciliation_items').insert({
    org_id: payload.orgId,
    reconciliation_id: payload.reconciliationId,
    category: payload.item.category,
    amount: payload.item.amount,
    reference: payload.item.reference ?? null,
    note: payload.item.note ?? null,
    resolved: payload.item.resolved ?? false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: 1 });
}
