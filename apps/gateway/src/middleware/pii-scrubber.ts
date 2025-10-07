import type { RequestHandler } from 'express';
import { scrubPii } from '../utils/pii';
import { getRequestContext } from '../utils/request-context';

export type PiiScrubberOptions = {
  logger?: Pick<typeof console, 'info' | 'warn' | 'error'>;
  redactBody?: boolean;
};

export function createPiiScrubberMiddleware(options: PiiScrubberOptions = {}): RequestHandler {
  const logger = options.logger ?? console;
  const redactBody = options.redactBody ?? true;

  return (req, res, next) => {
    const start = Date.now();
    const context = getRequestContext();
    const baseLog = {
      traceId: context?.traceId,
      requestId: context?.requestId,
      method: req.method,
      path: req.originalUrl,
    };

    logger.info({ ...baseLog, event: 'gateway.request.received', body: redactBody ? scrubPii(req.body) : req.body });

    res.on('finish', () => {
      logger.info({
        ...baseLog,
        event: 'gateway.request.completed',
        status: res.statusCode,
        durationMs: Date.now() - start,
      });
    });

    next();
  };
}
