import type { RequestHandler } from 'express';
import { scrubPii } from '../utils/pii.js';
import { getRequestContext } from '../utils/request-context.js';
import { logger as sharedLogger } from '@prisma-glow/logger';

export type PiiScrubberOptions = {
  logger?: Pick<typeof sharedLogger, 'info' | 'warn' | 'error'>;
  redactBody?: boolean;
};

export function createPiiScrubberMiddleware(options: PiiScrubberOptions = {}): RequestHandler {
  const logger = options.logger ?? sharedLogger;
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

    logger.info('gateway.request.received', {
      ...baseLog,
      body: redactBody ? scrubPii(req.body) : req.body,
    });

    res.on('finish', () => {
      logger.info('gateway.request.completed', {
        ...baseLog,
        status: res.statusCode,
        durationMs: Date.now() - start,
      });
    });

    next();
  };
}
