// Lightweight OpenTelemetry helper for the payments-sdk package.
//
// We do **not** configure or register any SDK/Exporter here – that must be
// done by the application entry-point so that the environment can choose the
// correct exporter (OTLP, Console, Jaeger, etc.).
//
// The helper merely exposes a `tracer` instance scoped to this package and a
// `traced` utility that executes an async closure within a span, automatically
// capturing any unhandled exception and ending the span.
//
// All tracing code is wrapped in a dynamic `require` to keep the SDK optional.
// If `@opentelemetry/api` is not present at runtime we gracefully fallback to
// a no-op implementation so that the payments-sdk can be consumed in
// lightweight environments without pulling additional dependencies.

/* eslint-disable @typescript-eslint/no-explicit-any */

type Span = {
  end: () => void;
  recordException: (err: unknown) => void;
};

interface OtelApi {
  trace: {
    getTracer: (name: string) => {
      startSpan: (name: string) => Span;
    };
    setSpan: (ctx: unknown, span: Span) => unknown;
  };
  context: {
    active: () => unknown;
    with: <T>(ctx: unknown, fn: () => T) => T;
  };
}

let otel: OtelApi | null = null;

try {
  // eslint-disable-next-line import/no-dynamic-require, @typescript-eslint/no-var-requires
  otel = require('@opentelemetry/api') as OtelApi;
} catch {
  // OpenTelemetry is optional – fall back to no-op behaviour if the dependency
  // has not been installed by the host application.
  otel = null;
}

// Fallback tracer that returns inert spans
// Doing this avoids littering the call-sites with undefined checks.
const fallbackTracer = {
  startSpan: () => ({ end: () => {}, recordException: () => {} })
};

export const tracer = otel?.trace.getTracer('payments-sdk') ?? fallbackTracer;

/**
 * Execute the supplied async function within a span.  Any unhandled
 * exception is recorded on the span before being re-thrown so that callers
 * still see the original error behaviour.
 */
export async function traced<T>(spanName: string, fn: () => Promise<T>): Promise<T> {
  // Fast path when OpenTelemetry is not available
  if (!otel) return fn();

  const span = tracer.startSpan(spanName);

  try {
    return await otel.context.with(otel.trace.setSpan(otel.context.active(), span), fn);
  } catch (err) {
    span.recordException(err);
    throw err;
  } finally {
    span.end();
  }
}

/**
 * Synchronous variant of `traced` for non-async operations.
 */
export function tracedSync<T>(spanName: string, fn: () => T): T {
  if (!otel) return fn();

  const span = tracer.startSpan(spanName);

  try {
    return otel.context.with(otel.trace.setSpan(otel.context.active(), span), fn);
  } catch (err) {
    span.recordException(err);
    throw err;
  } finally {
    span.end();
  }
}
