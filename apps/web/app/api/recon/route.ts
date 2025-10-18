import { NextResponse } from 'next/server';

// --- Feature flag to choose backend ---
const MODE = (process.env.RECONCILIATION_MODE ?? 'db').toLowerCase();

// Memory-store (dev) imports
import { getReconciliationStore } from '@/lib/audit/reconciliation-store';
import type {
  CreateReconciliationInput,
  ReconciliationType,
} from '@/lib/audit/reconciliation-types';

// Supabase (prod) import
import { getServiceSupabaseClient } from '@/lib/supabase-server';

// --- Shared helpers (used by memory POST validation) ---
const ALLOWED_TYPES: ReconciliationType[] = [
  'BANK',
  'ACCOUNTS_RECEIVABLE',
  'ACCOUNTS_PAYABLE',
];

function isReconciliationType(value: unknown): value is ReconciliationType {
  return typeof value === 'string' && (ALLOWED_TYPES as string[]).includes(value);
}

// --- Memory mode store instance ---
const store = getReconciliationStore();

// ============================
// GET: list reconciliations
// ============================
export async function GET(request: Request) {
  if (MODE === 'memory') {
    const reconciliations = store.listSummaries();
    return NextResponse.json({ reconciliations });
  }

  // MODE === 'db'
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId');
  const entityId = searchParams.get('entityId');
  const periodId = searchParams.get('periodId');

  if (!orgId) {
    return NextResponse.json(
      { error: 'orgId query parameter is required.' },
      { status: 400 },
    );
  }

  const supabase = await getServiceSupabaseClient();

  let query = supabase
    .from('reconciliations')
    .select(
      `
        id,
        org_id,
        entity_id,
        period_id,
        type,
        control_account_id,
        gl_balance,
        external_balance,
        difference,
        status,
        prepared_by_user_id,
        reviewed_by_user_id,
        closed_at,
        schedule_document_id,
        created_at,
        updated_at,
        items:reconciliation_items(*)
      `,
    )
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (entityId) {
    query = query.eq('entity_id', entityId);
  }

  if (periodId) {
    query = query.eq('period_id', periodId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: error.message ?? 'Failed to load reconciliations.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ reconciliations: data ?? [] });
}

// ============================
// POST: create reconciliation
// ============================
export async function POST(request: Request) {
  if (MODE === 'db') {
    // DB insert path not defined in the main branch version.
    // Returning 405 keeps behavior explicit and safe until create flow is implemented.
    return NextResponse.json(
      { error: 'Creation via API not enabled in DB mode.' },
      { status: 405 },
    );
  }

  // MODE === 'memory'
  let payload: Partial<CreateReconciliationInput>;
  try {
    payload = (await request.json()) as Partial<CreateReconciliationInput>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    name,
    type,
    periodStart,
    periodEnd,
    currency,
    orgId,
    engagementId,
    controlReference,
    createdBy,
  } = payload;

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  if (!isReconciliationType(type)) {
    return NextResponse.json(
      { error: 'type must be BANK, ACCOUNTS_RECEIVABLE, or ACCOUNTS_PAYABLE' },
      { status: 400 },
    );
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
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
