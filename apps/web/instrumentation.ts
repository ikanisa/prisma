/**
 * Next.js Instrumentation Hook
 * 
 * Initializes OpenTelemetry when the server starts
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only initialize in Node.js runtime (not Edge)
    if (process.env.OTEL_ENABLED !== 'false') {
      await import('./lib/observability/opentelemetry');
    }
  }
}

