import { NextResponse, NextRequest } from 'next/server';
import { evaluateCompliance, loadComplianceConfig } from '../../../../lib/compliance/evaluator';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isRecord(payload)) {
    return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 });
  }

  const { packKey, values } = payload;

  if (typeof packKey !== 'string' || !packKey.trim()) {
    return NextResponse.json({ error: 'packKey is required' }, { status: 400 });
  }

  if (!isRecord(values)) {
    return NextResponse.json({ error: 'values must be an object' }, { status: 400 });
  }

  try {
    const config = await loadComplianceConfig(packKey.trim());
    const result = evaluateCompliance(config, values);

    return NextResponse.json({
      outputs: result.outputs,
      errors: result.errors,
      provenance: result.provenance,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    }

    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
