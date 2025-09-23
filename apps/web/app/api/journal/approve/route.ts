import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';
import { approveJournalSchema } from '../../../../../lib/accounting/schemas';
import { logActivity } from '../../../../../lib/accounting/activity-log';

export async function POST(request: Request) {
  const supabase = getServiceSupabaseClient();
  let payload;
  try {
    payload = approveJournalSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { data: batch } = await supabase
    .from('journal_batches')
    .select('id, status, entity_id')
    .eq('id', payload.batchId)
    .eq('org_id', payload.orgId)
    .maybeSingle();

  if (!batch) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
  }

  if (batch.status !== 'SUBMITTED') {
    return NextResponse.json({ error: 'Only submitted batches can be approved' }, { status: 409 });
  }

  const { data: unresolved } = await supabase
    .from('je_control_alerts')
    .select('id, rule')
    .eq('batch_id', payload.batchId)
    .eq('severity', 'HIGH')
    .eq('resolved', false);

  if (unresolved && unresolved.length > 0) {
    return NextResponse.json(
      { error: 'High severity alerts must be resolved before approval', alerts: unresolved },
      { status: 422 }
    );
  }

  const { error } = await supabase
    .from('journal_batches')
    .update({
      status: 'APPROVED',
      approved_at: new Date().toISOString(),
      approved_by_user_id: payload.userId,
    })
    .eq('id', payload.batchId)
    .eq('org_id', payload.orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.userId,
    action: 'JE_APPROVED',
    entityType: 'JOURNAL_BATCH',
    entityId: payload.batchId,
  });

  return NextResponse.json({ status: 'APPROVED' });
}
