import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { computePillarTwo } from '@/lib/tax/calculators';
import { recordActivity } from '@/lib/tax/activity';

const jurisdictionSchema = z.object({
  name: z.string().min(1, 'name is required'),
  globeIncome: z.coerce.number(),
  coveredTaxes: z.coerce.number(),
});

const payloadSchema = z.object({
  scenario: z.string().min(1, 'scenario is required'),
  jurisdictions: z.array(jurisdictionSchema).min(1, 'jurisdictions required'),
  preparedBy: z.string().optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { scenario, jurisdictions, preparedBy } = parsed.data;
  const result = computePillarTwo(jurisdictions);
  const activity = recordActivity({
    module: result.module,
    scenario,
    decision: result.workflow.decision,
    summary: 'Pillar Two monitoring completed',
    metrics: {
      aggregateTopUp: result.metrics.aggregateTopUp,
    },
    actor: preparedBy,
  });

  return NextResponse.json({
    scenario,
    result,
    activity,
  });
}
