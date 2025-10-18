import { NextResponse } from 'next/server';
import { getReconciliationStore } from '@/lib/audit/reconciliation-store';

const store = getReconciliationStore();

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(_request: Request, { params }: RouteParams) {
  const reconciliation = store.getSnapshot(params.id);
  if (!reconciliation) {
    return NextResponse.json({ error: 'Reconciliation not found' }, { status: 404 });
  }
  return NextResponse.json({ reconciliation });
}
