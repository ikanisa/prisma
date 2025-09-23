import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';
import { advanceCloseSchema } from '../../../../../lib/accounting/schemas';
import { logActivity } from '../../../../../lib/accounting/activity-log';

const transitions: Record<string, string> = {
  OPEN: 'SUBSTANTIVE_REVIEW',
  SUBSTANTIVE_REVIEW: 'READY_TO_LOCK',
};

export async function POST(request: Request) {
  const supabase = getServiceSupabaseClient();
  let payload;
  try {
    payload = advanceCloseSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { data: period } = await supabase
    .from('close_periods')
    .select('id, status')
    .eq('id', payload.periodId)
    .eq('org_id', payload.orgId)
    .maybeSingle();

  if (!period) {
    return NextResponse.json({ error: 'Period not found' }, { status: 404 });
  }

  const expected = transitions[period.status];
  if (!expected || expected !== payload.nextStatus) {
    return NextResponse.json({ error: `Cannot advance from ${period.status} to ${payload.nextStatus}` }, { status: 409 });
  }

  const { error } = await supabase
    .from('close_periods')
    .update({ status: payload.nextStatus })
    .eq('id', payload.periodId)
    .eq('org_id', payload.orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.userId,
    action: 'CLOSE_ADVANCED',
    entityType: 'CLOSE_PERIOD',
    entityId: payload.periodId,
    metadata: { to: payload.nextStatus },
  });

  return NextResponse.json({ status: payload.nextStatus });
}
