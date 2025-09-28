import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { computeUsGilti } from '../../../../../../lib/tax/calculators';
import { recordActivity } from '../../../../../../lib/tax/activity';

const payloadSchema = z.object({
  scenario: z.string().min(1, 'scenario is required'),
  testedIncome: z.coerce.number(),
  qbai: z.coerce.number(),
  interestExpense: z.coerce.number().optional().default(0),
  taxRate: z.coerce.number().min(0).max(1),
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
  const result = computeUsGilti(inputs);
  const activity = recordActivity({
    module: result.module,
    scenario,
    decision: result.workflow.decision,
    summary: 'US GILTI computation executed',
    metrics: {
      giltiBase: result.metrics.giltiBase,
      giltiTax: result.metrics.giltiTax,
    },
    actor: preparedBy,
  });

  return NextResponse.json({
    scenario,
    result,
    activity,
  });
}
