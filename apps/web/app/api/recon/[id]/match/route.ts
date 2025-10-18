import { NextResponse } from 'next/server';
import { getReconciliationStore } from '@/lib/audit/reconciliation-store';
import type { DeterministicMatchOptions, MatchStrategy } from '@/lib/audit/reconciliation-types';

const store = getReconciliationStore();

interface RouteParams {
  params: {
    id: string;
  };
}

function sanitizeStrategies(strategies: unknown): MatchStrategy[] | undefined {
  if (strategies === undefined) {
    return undefined;
  }
  if (!Array.isArray(strategies)) {
    throw new Error('strategies must be an array');
  }
  const allowed: MatchStrategy[] = ['AMOUNT_AND_DATE', 'AMOUNT_ONLY'];
  const filtered = strategies.filter((value): value is MatchStrategy =>
    typeof value === 'string' && (allowed as string[]).includes(value),
  );
  if (!filtered.length) {
    return undefined;
  }
  return filtered;
}

export async function POST(request: Request, { params }: RouteParams) {
  let payload: Partial<DeterministicMatchOptions> = {};
  try {
    if (request.headers.get('content-length')) {
      payload = (await request.json()) as Partial<DeterministicMatchOptions>;
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let strategies: MatchStrategy[] | undefined;
  try {
    strategies = sanitizeStrategies(payload.strategies);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  try {
    const { matches, outstanding, snapshot } = store.runDeterministicMatch(params.id, { strategies });
    return NextResponse.json({ matches, outstanding, reconciliation: snapshot });
  } catch (error) {
    const message = (error as Error).message;
    const status = message.toLowerCase().includes('not found') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
