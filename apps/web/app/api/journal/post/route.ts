import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';
import { postJournalSchema } from '../../../../../lib/accounting/schemas';
import { logActivity } from '../../../../../lib/accounting/activity-log';

export async function POST(request: Request) {
  const supabase = getServiceSupabaseClient();
  let payload;
  try {
    payload = postJournalSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { data: batch } = await supabase
    .from('journal_batches')
    .select('id, status')
    .eq('id', payload.batchId)
    .eq('org_id', payload.orgId)
    .maybeSingle();

  if (!batch) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
  }

  if (batch.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Only approved batches can be posted' }, { status: 409 });
  }

  const { error } = await supabase
    .from('journal_batches')
    .update({ status: 'POSTED', posted_at: new Date().toISOString() })
    .eq('id', payload.batchId)
    .eq('org_id', payload.orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.userId,
    action: 'JE_POSTED',
    entityType: 'JOURNAL_BATCH',
    entityId: payload.batchId,
  });

  return NextResponse.json({ status: 'POSTED' });
}
