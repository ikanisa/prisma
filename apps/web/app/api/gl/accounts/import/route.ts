import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';
import { accountImportSchema } from '../../../../../lib/accounting/schemas';
import { logActivity } from '../../../../../lib/accounting/activity-log';

export async function POST(request: Request) {
  const supabase = getServiceSupabaseClient();

  let parsedBody;
  try {
    const json = await request.json();
    parsedBody = accountImportSchema.parse(json);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { orgId, entityId, userId, accounts } = parsedBody;

  const rows = accounts.map((account) => ({
    org_id: orgId,
    entity_id: entityId,
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity(supabase, {
    orgId,
    userId,
    action: 'GL_ACCOUNTS_IMPORTED',
    entityType: 'LEDGER',
    entityId,
    metadata: { count: accounts.length },
  });

  return NextResponse.json({ inserted: accounts.length });
}
