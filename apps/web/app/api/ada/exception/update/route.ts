import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { logAuditActivity } from '../../../../../../lib/audit/activity-log';
import { updateAdaExceptionSchema } from '../../../../../../lib/audit/schemas';
import { getServiceSupabaseClient } from '../../../../../../lib/supabase-server';
import { attachRequestId, getOrCreateRequestId } from '../../../../lib/observability';
import { createApiGuard } from '../../../../lib/api-guard';

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  let payload;
  try {
    payload = updateAdaExceptionSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, attachRequestId({ status: 400 }, requestId));
    }
    return NextResponse.json({ error: 'Invalid JSON payload.' }, attachRequestId({ status: 400 }, requestId));
  }

  const { orgId, userId, exceptionId, disposition, note, misstatementId } = payload;
  const supabase = getServiceSupabaseClient();

  const guard = await createApiGuard({
    request,
    supabase,
    requestId,
    orgId,
    resource: `ada:exception:${exceptionId}`,
    rateLimit: { limit: 60, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const { data: existingException, error: fetchError } = await supabase
    .from('ada_exceptions')
    .select('id, run_id, disposition, note, misstatement_id')
    .eq('id', exceptionId)
    .maybeSingle();

  if (fetchError) {
    return guard.json({ error: fetchError.message ?? 'Unable to load exception.' }, { status: 500 });
  }

  if (!existingException) {
    return guard.json({ error: 'Exception not found.' }, { status: 404 });
  }

  const { data: runRow, error: runError } = await supabase
    .from('ada_runs')
    .select('id, org_id')
    .eq('id', existingException.run_id)
    .maybeSingle();

  if (runError) {
    return guard.json({ error: runError.message ?? 'Unable to verify analytics run.' }, { status: 500 });
  }

  if (!runRow || runRow.org_id !== orgId) {
    return guard.json({ error: 'You do not have access to update this exception.' }, { status: 403 });
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
    return guard.json({ error: updateError.message ?? 'Failed to update exception.' }, { status: 500 });
  }

  if (!updatedException) {
    return guard.json({ error: 'Exception update returned no record.' }, { status: 500 });
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
        requestId,
      },
    });
  }

  return guard.respond({ exception: updatedException });
}
