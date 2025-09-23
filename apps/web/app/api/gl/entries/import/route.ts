import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';
import { ledgerEntriesImportSchema } from '../../../../../lib/accounting/schemas';
import { logActivity } from '../../../../../lib/accounting/activity-log';

export async function POST(request: Request) {
  const supabase = getServiceSupabaseClient();

  let payload;
  try {
    payload = ledgerEntriesImportSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rows = payload.entries.map((entry) => ({
    org_id: payload.orgId,
    entity_id: payload.entityId,
    period_id: payload.periodId ?? null,
    date: entry.date,
    account_id: entry.accountId,
    description: entry.description ?? null,
    debit: entry.debit,
    credit: entry.credit,
    currency: entry.currency,
    fx_rate: entry.fxRate ?? null,
    source: entry.source ?? 'IMPORT',
    batch_id: entry.batchId ?? null,
    created_by_user_id: payload.userId,
  }));

  const { error } = await supabase.from('ledger_entries').insert(rows);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.userId,
    action: 'GL_ENTRIES_IMPORTED',
    entityType: 'LEDGER',
    entityId: payload.entityId,
    metadata: { count: rows.length },
  });

  return NextResponse.json({ inserted: rows.length });
}
