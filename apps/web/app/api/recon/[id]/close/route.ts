import { NextResponse } from 'next/server';
import { getReconciliationStore } from '@/lib/audit/reconciliation-store';
import type { CloseReconciliationInput } from '@/lib/audit/reconciliation-types';

const store = getReconciliationStore();

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(request: Request, { params }: RouteParams) {
  let payload: Partial<CloseReconciliationInput>;
  try {
    payload = (await request.json()) as Partial<CloseReconciliationInput>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof payload.closedBy !== 'string' || !payload.closedBy.trim()) {
    return NextResponse.json({ error: 'closedBy is required' }, { status: 400 });
  }

  if (typeof payload.summary !== 'string' || !payload.summary.trim()) {
    return NextResponse.json({ error: 'summary is required' }, { status: 400 });
  }

  try {
    const { snapshot, evidence } = store.closeReconciliation(params.id, {
      closedBy: payload.closedBy,
      summary: payload.summary,
      controlReference: payload.controlReference,
      reviewNotes: payload.reviewNotes,
    });

    return NextResponse.json({ reconciliation: snapshot, evidence });
  } catch (error) {
    const message = (error as Error).message;
    const status = message.toLowerCase().includes('not found') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
