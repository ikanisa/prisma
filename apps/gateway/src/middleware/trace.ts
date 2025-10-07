import type { RequestHandler } from 'express';
import { createRequestId, createTraceId } from '../utils/ids';
import { runWithRequestContext, setRequestContextValue } from '../utils/request-context';

export const REQUEST_ID_HEADER = 'x-request-id';
export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const TRACE_ID_HEADER = 'x-trace-id';

export const traceMiddleware: RequestHandler = (req, res, next) => {
  const incomingRequestId =
    (req.headers[REQUEST_ID_HEADER] as string | undefined) ||
    (req.headers[CORRELATION_ID_HEADER] as string | undefined);
  const requestId = (incomingRequestId ?? '').trim() || createRequestId();
  const traceId = (req.headers[TRACE_ID_HEADER] as string | undefined)?.trim() || createTraceId();

  runWithRequestContext({ traceId, requestId }, () => {
    res.setHeader(REQUEST_ID_HEADER, requestId);
    res.setHeader(TRACE_ID_HEADER, traceId);
    if (incomingRequestId && !req.headers[TRACE_ID_HEADER]) {
      res.setHeader(CORRELATION_ID_HEADER, incomingRequestId);
    }

    res.on('finish', () => {
      setRequestContextValue('requestId', requestId);
      setRequestContextValue('traceId', traceId);
    });

    next();
  });
};
