/**
 * Prometheus Metrics Endpoint
 * 
 * Exposes metrics in Prometheus format at /api/metrics
 */

import { NextResponse } from 'next/server';
import { getMetrics } from '@/lib/observability/prometheus';

export async function GET() {
  try {
    const metrics = await getMetrics();
    return new NextResponse(metrics, {
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Failed to get metrics:', error);
    return NextResponse.json(
      { error: 'Failed to get metrics' },
      { status: 500 }
    );
  }
}

