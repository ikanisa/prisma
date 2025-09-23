import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';
import { submitJournalSchema } from '../../../../../lib/accounting/schemas';
import { evaluateAndPersistJournalAlerts } from '../../../../../lib/accounting/journal';
import { logActivity } from '../../../../../lib/accounting/activity-log';

export async function POST(request: Request) {
  const supabase = getServiceSupabaseClient();
  let payload;
  try {
    payload = submitJournalSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from('journal_batches')
    .select('id, status, entity_id')
    .eq('id', payload.batchId)
    .eq('org_id', payload.orgId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
  }

  const { data: entries } = await supabase
    .from('ledger_entries')
    .select('id')
    .eq('batch_id', payload.batchId)
    .limit(1);

  if (!entries || entries.length === 0) {
    return NextResponse.json({ error: 'Journal batch has no lines' }, { status: 422 });
  }

  const { error } = await supabase
    .from('journal_batches')
    .update({ status: 'SUBMITTED', submitted_at: new Date().toISOString() })
    .eq('id', payload.batchId)
    .eq('org_id', payload.orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const alerts = await evaluateAndPersistJournalAlerts(supabase, {
    orgId: payload.orgId,
    batchId: payload.batchId,
    userId: payload.userId,
  });

  await logActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.userId,
    action: 'JE_SUBMITTED',
    entityType: 'JOURNAL_BATCH',
    entityId: payload.batchId,
    metadata: { alerts: alerts.map((a) => a.rule) },
  });

  return NextResponse.json({ status: 'SUBMITTED', alerts });
}
