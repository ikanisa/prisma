import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '../../../../lib/supabase-server';
import { createWalkthroughSchema } from '../../../../lib/audit/schemas';
import { logAuditActivity } from '../../../../lib/audit/activity-log';

export async function POST(request: Request) {
  const supabase = getServiceSupabaseClient();
  let payload;

  try {
    payload = createWalkthroughSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const { orgId, controlId, userId, date, notes, result } = payload;

  const { data, error } = await supabase
    .from('control_walkthroughs')
    .insert({
      org_id: orgId,
      control_id: controlId,
      walkthrough_date: date,
      notes: notes ?? null,
      result,
      created_by: userId,
    })
    .select()
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed to record walkthrough.' }, { status: 500 });
  }

  await logAuditActivity(supabase, {
    orgId,
    userId,
    action: 'CTRL_WALKTHROUGH_DONE',
    entityId: controlId,
    metadata: {
      walkthroughId: data.id,
      result: data.result,
      date: data.walkthrough_date,
    },
  });

  return NextResponse.json({ walkthrough: data });
}
