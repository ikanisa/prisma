import { randomUUID, randomBytes } from 'node:crypto';

const TRACEPARENT_HEADER = 'traceparent';
const TRACESTATE_HEADER = 'tracestate';

function isValidTraceparent(value) {
  return typeof value === 'string' && /^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/i.test(value.trim());
}

function generateTraceparent() {
  const traceId = randomUUID().replace(/-/g, '');
  const spanId = randomBytes(8).toString('hex');
  return `00-${traceId}-${spanId}-01`;
}

export function requestContextMiddleware(req, res, next) {
  const incomingRequestId = (req.headers['x-request-id'] || req.headers['X-Request-Id']) ?? '';
  const requestId = typeof incomingRequestId === 'string' && incomingRequestId.trim()
    ? incomingRequestId.trim()
    : randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  const candidateTraceparent = req.headers[TRACEPARENT_HEADER];
  const traceparent = isValidTraceparent(candidateTraceparent) ? candidateTraceparent.trim() : generateTraceparent();
  req.traceparent = traceparent;
  res.setHeader('Traceparent', traceparent);

  const tracestate = req.headers[TRACESTATE_HEADER];
  if (typeof tracestate === 'string' && tracestate.trim()) {
    req.tracestate = tracestate.trim();
    res.setHeader('Tracestate', tracestate.trim());
  }

  next();
}
