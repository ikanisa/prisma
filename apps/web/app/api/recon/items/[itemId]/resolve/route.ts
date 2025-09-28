import { NextResponse } from 'next/server';
import { getReconciliationStore } from '../../../../../../lib/audit/reconciliation-store';
import type { ResolveReconItemInput } from '../../../../../../lib/audit/reconciliation-types';

const store = getReconciliationStore();

interface RouteParams {
  params: {
    itemId: string;
  };
}

export async function POST(request: Request, { params }: RouteParams) {
  let payload: Partial<ResolveReconItemInput>;
  try {
    payload = (await request.json()) as Partial<ResolveReconItemInput>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof payload.resolutionNote !== 'string' || !payload.resolutionNote.trim()) {
    return NextResponse.json({ error: 'resolutionNote is required' }, { status: 400 });
  }

  if (typeof payload.cleared !== 'boolean' && typeof payload.flaggedAsMisstatement !== 'boolean') {
    return NextResponse.json({ error: 'cleared or flaggedAsMisstatement must be provided' }, { status: 400 });
  }

  try {
    const { item, evidence, snapshot } = store.resolveItem(params.itemId, {
      resolutionNote: payload.resolutionNote,
      followUpDate: payload.followUpDate,
      cleared: Boolean(payload.cleared),
      evidenceLink: payload.evidenceLink,
      flaggedAsMisstatement: payload.flaggedAsMisstatement,
      resolvedBy: payload.resolvedBy,
    });

    return NextResponse.json({ item, evidence, reconciliation: snapshot });
  } catch (error) {
    const message = (error as Error).message;
    const status = message.toLowerCase().includes('not found') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
