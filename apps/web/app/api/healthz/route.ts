import { NextResponse } from 'next/server';

import prisma from '@/lib/prisma';
import { env } from '@/src/env.server';
import { logger } from '@/lib/logger';

const shouldBypassDatabaseCheck = () => env.SKIP_HEALTHCHECK_DB || !env.DATABASE_URL;

export async function GET() {
  const startedAt = Date.now();

  if (shouldBypassDatabaseCheck()) {
    return NextResponse.json({
      status: 'ok',
      database: env.DATABASE_URL ? 'bypassed' : 'unconfigured',
      latencyMs: 0,
    });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'ok',
      database: 'reachable',
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    logger.error('healthcheck.failed', { error });
    return NextResponse.json(
      {
        status: 'error',
        database: 'unreachable',
      },
      { status: 500 },
    );
  }
}
