import { NextResponse } from 'next/server';
import { getReconciliationStore } from '../../../../../lib/audit/reconciliation-store';
import type { StatementImportInput, StatementSide } from '../../../../../lib/audit/reconciliation-types';

const store = getReconciliationStore();

const SIDES: StatementSide[] = ['LEDGER', 'EXTERNAL'];

interface RouteParams {
  params: {
    id: string;
  };
}

function isStatementSide(value: unknown): value is StatementSide {
  return typeof value === 'string' && (SIDES as string[]).includes(value);
}

export async function POST(request: Request, { params }: RouteParams) {
  let payload: Partial<StatementImportInput>;
  try {
    payload = (await request.json()) as Partial<StatementImportInput>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isStatementSide(payload.side)) {
    return NextResponse.json({ error: 'side must be LEDGER or EXTERNAL' }, { status: 400 });
  }

  if (typeof payload.sourceName !== 'string' || !payload.sourceName.trim()) {
    return NextResponse.json({ error: 'sourceName is required' }, { status: 400 });
  }

  if (typeof payload.statementDate !== 'string') {
    return NextResponse.json({ error: 'statementDate must be a string' }, { status: 400 });
  }

  if (!Array.isArray(payload.lines)) {
    return NextResponse.json({ error: 'lines must be an array' }, { status: 400 });
  }

  try {
    const { statement, snapshot } = store.importStatement(params.id, {
      side: payload.side,
      sourceName: payload.sourceName,
      statementDate: payload.statementDate,
      lines: payload.lines,
      importedBy: payload.importedBy,
    });

    return NextResponse.json({ statement, reconciliation: snapshot }, { status: 201 });
  } catch (error) {
    const message = (error as Error).message;
    const status = message.toLowerCase().includes('not found') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
