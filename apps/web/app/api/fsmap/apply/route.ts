import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';
import { fsMapApplySchema } from '../../../../../lib/accounting/schemas';
import { logActivity } from '../../../../../lib/accounting/activity-log';
import { attachRequestId, getOrCreateRequestId } from '../../../lib/observability';
import { createApiGuard } from '../../../lib/api-guard';

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = getServiceSupabaseClient();

  let payload;
  try {
    payload = fsMapApplySchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, attachRequestId({ status: 400 }, requestId));
    }
    return NextResponse.json({ error: 'Invalid JSON body' }, attachRequestId({ status: 400 }, requestId));
  }

  const guard = await createApiGuard({
    request,
    supabase,
    requestId,
    orgId: payload.orgId,
    resource: `fsmap:apply:${payload.entityId}`,
    rateLimit: { limit: 60, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const rows = payload.mappings.map((mapping) => ({
    org_id: payload.orgId,
    entity_id: payload.entityId,
    account_id: mapping.accountId,
    fs_line_id: mapping.fsLineId,
    basis: payload.basis,
    effective_from: mapping.effectiveFrom ?? null,
    effective_to: mapping.effectiveTo ?? null,
  }));

  const { error } = await supabase.from('coa_map').upsert(rows, {
    onConflict: 'org_id,entity_id,account_id,basis',
  });

  if (error) {
    return guard.json({ error: error.message }, { status: 500 });
  }

  await logActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.userId,
    action: 'FS_MAPPING_APPLIED',
    entityType: 'FINANCIAL_STATEMENT',
    entityId: payload.entityId,
    metadata: { count: rows.length, basis: payload.basis, requestId },
  });

  return guard.respond({ mapped: rows.length });
}
