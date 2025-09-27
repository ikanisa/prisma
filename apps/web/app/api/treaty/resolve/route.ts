import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveTreaty } from '../../../../../lib/tax/calculators';
import { recordActivity } from '../../../../../lib/tax/activity';

const payloadSchema = z.object({
  scenario: z.string().min(1, 'scenario is required'),
  residenceCountry: z.string().min(1, 'residenceCountry is required'),
  sourceCountry: z.string().min(1, 'sourceCountry is required'),
  issue: z.enum(['double_taxation', 'permanent_establishment', 'withholding_rate']),
  hasMapAccess: z.boolean(),
  apaRequested: z.boolean(),
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
  const result = resolveTreaty(inputs);
  const activity = recordActivity({
    module: result.module,
    scenario,
    decision: result.workflow.decision,
    summary: 'Treaty resolver recommendation generated',
    metrics: {
      hasMapAccess: inputs.hasMapAccess ? 1 : 0,
      apaRequested: inputs.apaRequested ? 1 : 0,
    },
    actor: preparedBy,
  });

  return NextResponse.json({
    scenario,
    result,
    activity,
  });
}
