import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prepareVatPeriod } from '../../../../../lib/tax/calculators';
import { recordActivity } from '../../../../../lib/tax/activity';

const payloadSchema = z.object({
  scenario: z.string().min(1, 'scenario is required'),
  sales: z.coerce.number(),
  salesVatRate: z.coerce.number(),
  purchases: z.coerce.number(),
  purchaseVatRate: z.coerce.number(),
  scheme: z.enum(['domestic', 'oss', 'ioss']),
  preparedBy: z.string().optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
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

  const { scenario, preparedBy, ...inputs } = parsed.data;
  const result = prepareVatPeriod(inputs);
  const activity = recordActivity({
    module: result.module,
    scenario,
    decision: result.workflow.decision,
    summary: 'VAT period prepared',
    metrics: {
      netVat: result.metrics.netVat,
      outputVat: result.metrics.outputVat,
    },
    actor: preparedBy,
  });

  return NextResponse.json({
    scenario,
    result,
    activity,
  });
}
