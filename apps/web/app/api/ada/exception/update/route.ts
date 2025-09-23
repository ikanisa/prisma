import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { logAuditActivity } from '../../../../../../lib/audit/activity-log';
import { updateAdaExceptionSchema } from '../../../../../../lib/audit/schemas';
import { getServiceSupabaseClient } from '../../../../../../lib/supabase-server';

export async function POST(request: Request) {
  let payload;
  try {
    payload = updateAdaExceptionSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const { orgId, userId, exceptionId, disposition, note, misstatementId } = payload;
  const supabase = getServiceSupabaseClient();

  const { data: existingException, error: fetchError } = await supabase
    .from('ada_exceptions')
    .select('id, run_id, disposition, note, misstatement_id')
    .eq('id', exceptionId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message ?? 'Unable to load exception.' }, { status: 500 });
  }

  if (!existingException) {
    return NextResponse.json({ error: 'Exception not found.' }, { status: 404 });
  }

  const { data: runRow, error: runError } = await supabase
    .from('ada_runs')
    .select('id, org_id')
    .eq('id', existingException.run_id)
    .maybeSingle();

  if (runError) {
    return NextResponse.json({ error: runError.message ?? 'Unable to verify analytics run.' }, { status: 500 });
  }

  if (!runRow || runRow.org_id !== orgId) {
    return NextResponse.json({ error: 'You do not have access to update this exception.' }, { status: 403 });
  }

  const updates: Record<string, unknown> = {
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  if (typeof disposition !== 'undefined') {
    updates.disposition = disposition;
  }
  if (typeof note !== 'undefined') {
    updates.note = note ?? null;
  }
  if (typeof misstatementId !== 'undefined') {
    updates.misstatement_id = misstatementId ?? null;
  }

  const { data: updatedException, error: updateError } = await supabase
    .from('ada_exceptions')
    .update(updates)
    .eq('id', exceptionId)
    .select('*, ada_runs!inner(org_id, engagement_id)')
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: updateError.message ?? 'Failed to update exception.' }, { status: 500 });
  }

  if (!updatedException) {
    return NextResponse.json({ error: 'Exception update returned no record.' }, { status: 500 });
  }

  if (updatedException.disposition === 'RESOLVED') {
    await logAuditActivity(supabase, {
      orgId,
      userId,
      action: 'ADA_EXCEPTION_RESOLVED',
      entityType: 'AUDIT_ANALYTICS',
      entityId: existingException.run_id,
      metadata: {
        exceptionId,
        misstatementId: updatedException.misstatement_id,
      },
    });
  }

  return NextResponse.json({ exception: updatedException });
}
