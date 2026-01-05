/**
 * Observability: Tracing
 * 
 * Distributed tracing for tool calls, agent operations, and API requests
 */

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, string | number | boolean>;
  logs: Array<{
    timestamp: number;
    fields: Record<string, unknown>;
  }>;
  status: 'ok' | 'error';
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
}

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

class Tracer {
  private spans: Map<string, TraceSpan> = new Map();

  /**
   * Start a new trace span
   */
  startSpan(
    name: string,
    parentContext?: TraceContext,
    tags?: Record<string, string | number | boolean>
  ): TraceContext {
    const traceId = parentContext?.traceId || this.generateId();
    const spanId = this.generateId();
    const parentSpanId = parentContext?.spanId;

    const span: TraceSpan = {
      traceId,
      spanId,
      parentSpanId,
      name,
      startTime: Date.now(),
      tags: tags || {},
      logs: [],
      status: 'ok',
    };

    this.spans.set(spanId, span);
    return { traceId, spanId, parentSpanId };
  }

  /**
   * End a span
   */
  endSpan(spanId: string, status: 'ok' | 'error' = 'ok', error?: Error): void {
    const span = this.spans.get(spanId);
    if (!span) return;

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;

    if (error) {
      span.error = {
        message: error.message,
        code: (error as any).code,
        stack: error.stack,
      };
    }

    // Export span (in production, send to tracing backend)
    this.exportSpan(span);
  }

  /**
   * Add log to span
   */
  log(spanId: string, message: string, fields?: Record<string, unknown>): void {
    const span = this.spans.get(spanId);
    if (!span) return;

    span.logs.push({
      timestamp: Date.now(),
      fields: {
        message,
        ...fields,
      },
    });
  }

  /**
   * Add tag to span
   */
  setTag(spanId: string, key: string, value: string | number | boolean): void {
    const span = this.spans.get(spanId);
    if (!span) return;

    span.tags[key] = value;
  }

  /**
   * Export span to tracing backend
   */
  private exportSpan(span: TraceSpan): void {
    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.log('[TRACE]', JSON.stringify(span, null, 2));
    }

    // Export to OpenTelemetry if enabled
    if (process.env.TRACING_BACKEND === 'opentelemetry') {
      try {
        // OpenTelemetry SDK will automatically capture spans
        // This is just for logging
      } catch (error) {
        console.error('Failed to export span to OpenTelemetry:', error);
      }
    }

    // Export to Datadog if enabled
    if (process.env.TRACING_BACKEND === 'datadog') {
      try {
        // Datadog tracer will automatically capture spans
        // This is just for logging
      } catch (error) {
        console.error('Failed to export span to Datadog:', error);
      }
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get span by ID
   */
  getSpan(spanId: string): TraceSpan | undefined {
    return this.spans.get(spanId);
  }
}

/**
 * Global tracer instance
 */
export const tracer = new Tracer();

/**
 * Trace decorator for async functions
 */
export function trace<T extends (...args: any[]) => Promise<any>>(
  name: string,
  fn: T,
  parentContext?: TraceContext
): T {
  return (async (...args: any[]) => {
    const context = tracer.startSpan(name, parentContext);
    try {
      const result = await fn(...args);
      tracer.endSpan(context.spanId, 'ok');
      return result;
    } catch (error) {
      tracer.endSpan(context.spanId, 'error', error as Error);
      throw error;
    }
  }) as T;
}

