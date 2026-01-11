/**
 * Prometheus Metrics Endpoint (Edge Runtime Stub)
 * 
 * Exposes metrics in Prometheus format at /api/metrics
 * 
 * NOTE: This is a stub for Cloudflare Pages deployment.
 * prom-client requires Node.js and is not Edge-compatible.
 * Metrics collection should be done via external observability tools
 * (e.g., Cloudflare Analytics, Sentry, OpenTelemetry collectors).
 */

import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  // Stub response for Edge Runtime compatibility
  // In production, metrics should be collected via:
  // - Cloudflare Analytics API
  // - Sentry Performance Monitoring
  // - External OpenTelemetry collector
  return new NextResponse(
    '# HELP prisma_edge_stub Edge runtime metrics stub\\n' +
    '# TYPE prisma_edge_stub gauge\\n' +
    'prisma_edge_stub{status="edge_compatible"} 1\\n',
    {
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    }
  );
}
