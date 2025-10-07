import { NextResponse } from 'next/server';

const shouldBypassDatabaseCheck = () => {
  if (process.env.SKIP_HEALTHCHECK_DB === 'true') {
    return true;
  }

  return !process.env.DATABASE_URL;
};

export async function GET() {
  const startedAt = Date.now();

  if (shouldBypassDatabaseCheck()) {
    return NextResponse.json({
      status: 'ok',
      database: process.env.DATABASE_URL ? 'bypassed' : 'unconfigured',
      latencyMs: 0,
    });
  }

  try {
    const { default: prisma } = await import('@/lib/prisma');
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'ok',
      database: 'reachable',
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error('Health check failed', error);
    return NextResponse.json(
      {
        status: 'error',
        database: 'unreachable',
      },
      { status: 500 },
    );
  }
}
