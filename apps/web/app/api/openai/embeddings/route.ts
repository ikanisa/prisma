import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getOpenAIClient } from '@/lib/openai/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requestSchema = z
  .object({
    input: z.union([z.string(), z.array(z.string()).nonempty()]),
    model: z
      .enum(['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'])
      .default('text-embedding-3-small'),
    dimensions: z
      .number()
      .int()
      .positive()
      .max(3072)
      .optional(),
  })
  .strict();

export async function POST(request: NextRequest) {
  let payload: z.infer<typeof requestSchema>;
  try {
    const json = await request.json();
    payload = requestSchema.parse(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request payload';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { input, model, dimensions } = payload;

  try {
    const client = getOpenAIClient();
    const response = await client.embeddings.create({
      model,
      input,
      encoding_format: 'float',
      ...(typeof dimensions === 'number' ? { dimensions } : {}),
    });

    return NextResponse.json({
      model: response.model,
      usage: response.usage,
      data: response.data.map((item) => ({
        index: item.index,
        embedding: item.embedding,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected error creating embeddings';
    const status = message.includes('OpenAI API key') ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
