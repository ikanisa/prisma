import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { scanDac6 } from '@/lib/tax/calculators';
import { recordActivity } from '@/lib/tax/activity';

const arrangementSchema = z.object({
  id: z.string().min(1, 'id is required'),
  hallmarkCategories: z.array(z.string()).default([]),
  crossBorder: z.boolean().default(false),
  mainBenefit: z.boolean().default(false),
});

const payloadSchema = z.object({
  scenario: z.string().min(1, 'scenario is required'),
  arrangements: z.array(arrangementSchema).min(1, 'at least one arrangement is required'),
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

  const { scenario, arrangements, preparedBy } = parsed.data;
  const result = scanDac6(arrangements);
  const activity = recordActivity({
    module: result.module,
    scenario,
    decision: result.workflow.decision,
    summary: 'DAC6 scan executed',
    metrics: {
      totalFlagged: result.metrics.totalFlagged,
      highestScore: result.metrics.highestScore,
    },
    actor: preparedBy,
  });

  return NextResponse.json({
    scenario,
    result,
    activity,
  });
}
