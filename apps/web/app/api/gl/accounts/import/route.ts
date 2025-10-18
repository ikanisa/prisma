import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '@/lib/supabase-server';
import { accountImportSchema } from '@/lib/accounting/schemas';
import { logActivity } from '@/lib/accounting/activity-log';
import { attachRequestId, getOrCreateRequestId } from '@/app/lib/observability';
import { createApiGuard } from '@/app/lib/api-guard';

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = await getServiceSupabaseClient();

  let parsedBody;
  try {
    parsedBody = accountImportSchema.parse(await request.json());
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
    orgId: parsedBody.orgId,
    resource: `gl:accounts:import:${parsedBody.orgId}:${parsedBody.entityId}`,
    rateLimit: { limit: 30, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const rows = parsedBody.accounts.map((account) => ({
    org_id: parsedBody.orgId,
    entity_id: parsedBody.entityId,
    code: account.code,
    name: account.name,
    type: account.type,
    currency: account.currency,
    active: account.active ?? true,
    parent_account_id: account.parentAccountId ?? null,
  }));

  const { error } = await supabase.from('ledger_accounts').upsert(rows, {
    onConflict: 'org_id,entity_id,code',
  });

  if (error) {
    return guard.json({ error: error.message }, { status: 500 });
  }

  await logActivity(supabase, {
    orgId: parsedBody.orgId,
    userId: parsedBody.userId,
    action: 'GL_ACCOUNTS_IMPORTED',
    entityType: 'LEDGER',
    entityId: parsedBody.entityId,
    metadata: { count: parsedBody.accounts.length },
  });

  return guard.respond({ inserted: parsedBody.accounts.length });
}
