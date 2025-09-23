import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';
import { createJournalBatchSchema } from '../../../../../lib/accounting/schemas';
import { logActivity } from '../../../../../lib/accounting/activity-log';

export async function POST(request: Request) {
  const supabase = getServiceSupabaseClient();
  let payload;
  try {
    payload = createJournalBatchSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('journal_batches')
    .insert({
      org_id: payload.orgId,
      entity_id: payload.entityId,
      period_id: payload.periodId ?? null,
      prepared_by_user_id: payload.preparedByUserId,
      ref: payload.ref ?? null,
      note: payload.note ?? null,
      attachment_id: payload.attachmentId ?? null,
    })
    .select()
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create batch' }, { status: 500 });
  }

  await logActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.preparedByUserId,
    action: 'JE_BATCH_CREATED',
    entityType: 'JOURNAL_BATCH',
    entityId: data.id,
    metadata: { ref: data.ref ?? undefined },
  });

  return NextResponse.json({ batch: data });
}
