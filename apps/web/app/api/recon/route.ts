import { NextResponse } from 'next/server';
import { getReconciliationStore } from '../../../lib/audit/reconciliation-store';
import type { CreateReconciliationInput, ReconciliationType } from '../../../lib/audit/reconciliation-types';

const store = getReconciliationStore();

const ALLOWED_TYPES: ReconciliationType[] = ['BANK', 'ACCOUNTS_RECEIVABLE', 'ACCOUNTS_PAYABLE'];

export async function GET() {
  const reconciliations = store.listSummaries();
  return NextResponse.json({ reconciliations });
}

function isReconciliationType(value: unknown): value is ReconciliationType {
  return typeof value === 'string' && (ALLOWED_TYPES as string[]).includes(value);
}

export async function POST(request: Request) {
  let payload: Partial<CreateReconciliationInput>;
  try {
    payload = (await request.json()) as Partial<CreateReconciliationInput>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, type, periodStart, periodEnd, currency, orgId, engagementId, controlReference, createdBy } = payload;

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  if (!isReconciliationType(type)) {
    return NextResponse.json({ error: 'type must be BANK, ACCOUNTS_RECEIVABLE, or ACCOUNTS_PAYABLE' }, { status: 400 });
  }

  if (typeof periodStart !== 'string' || !periodStart.trim()) {
    return NextResponse.json({ error: 'periodStart is required' }, { status: 400 });
  }

  if (typeof periodEnd !== 'string' || !periodEnd.trim()) {
    return NextResponse.json({ error: 'periodEnd is required' }, { status: 400 });
  }

  try {
    const reconciliation = store.createReconciliation({
      name,
      type,
      periodStart,
      periodEnd,
      currency,
      orgId,
      engagementId,
      controlReference,
      createdBy,
    });
    return NextResponse.json({ reconciliation }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
