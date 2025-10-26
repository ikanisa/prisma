import type { RequestHandler } from 'express';
import { context, trace, SpanStatusCode } from '@opentelemetry/api';
import { createRequestId, createTraceId } from '../utils/ids.js';
import { runWithRequestContext, setRequestContextValue } from '../utils/request-context.js';
import { logError, logInfo } from '../../logger.js';
import { getTracerServiceName } from '../otel.js';

export const REQUEST_ID_HEADER = 'x-request-id';
export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const TRACE_ID_HEADER = 'x-trace-id';

export const traceMiddleware: RequestHandler = (req, res, next) => {
  const incomingRequestId =
    (req.headers[REQUEST_ID_HEADER] as string | undefined) ||
    (req.headers[CORRELATION_ID_HEADER] as string | undefined);
  const requestId = (incomingRequestId ?? '').trim() || createRequestId();
  const traceId = (req.headers[TRACE_ID_HEADER] as string | undefined)?.trim() || createTraceId();

  const tracer = trace.getTracer(getTracerServiceName());
  const spanName = `${req.method} ${req.originalUrl || req.url || '/'}`;
  const start = process.hrtime.bigint();
  const span = tracer.startSpan(spanName);
  let spanEnded = false;

  const endSpan = () => {
    if (spanEnded) return;
    spanEnded = true;
    span.end();
  };

  const recordFinish = () => {
    if (spanEnded) return;
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    span.setAttribute('http.method', req.method);
    span.setAttribute('http.route', req.route?.path ?? req.path ?? req.url ?? '/');
    span.setAttribute('http.target', req.originalUrl || req.url || '/');
    span.setAttribute('http.status_code', res.statusCode);
    span.setAttribute('prismaglow.request_id', requestId);
    span.setStatus({ code: SpanStatusCode.OK });
    setRequestContextValue('requestId', requestId);
    setRequestContextValue('traceId', traceId);
    logInfo('http.request', {
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      requestId,
      traceId,
    });
    endSpan();
  };

  const recordError = (error: Error) => {
    if (spanEnded) return;
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    logError('http.request_error', error, {
      method: req.method,
      path: req.originalUrl || req.url,
      requestId,
      traceId,
    });
    endSpan();
  };

  context.with(trace.setSpan(context.active(), span), () => {
    runWithRequestContext({ traceId, requestId }, () => {
      res.setHeader(REQUEST_ID_HEADER, requestId);
      res.setHeader(TRACE_ID_HEADER, traceId);
      if (incomingRequestId && !req.headers[TRACE_ID_HEADER]) {
        res.setHeader(CORRELATION_ID_HEADER, incomingRequestId);
      }

      res.on('finish', recordFinish);
      res.on('close', recordFinish);
      res.on('error', (err) => {
        const error = err instanceof Error ? err : new Error(String(err));
        recordError(error);
      });

      next();
    });
  });
};
