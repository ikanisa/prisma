import type { RequestHandler } from 'express';
import { createAnalyticsClient } from '@prisma-glow/analytics';
import { env } from '../env.js';
import { getRequestContext } from '../utils/request-context.js';
import { logger } from '@prisma-glow/logger';

const analyticsClient = createAnalyticsClient({
  endpoint: env.ANALYTICS_SERVICE_URL,
  apiKey: env.ANALYTICS_SERVICE_TOKEN,
  service: env.OTEL_SERVICE_NAME ?? 'gateway',
  environment: env.SENTRY_ENVIRONMENT ?? env.ENVIRONMENT ?? env.NODE_ENV ?? 'development',
  onError: (error) => {
    if (env.NODE_ENV !== 'production') {
      logger.warn('gateway.analytics_record_failed', { error });
    }
  },
});

export const analyticsMiddleware: RequestHandler = (req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const context = getRequestContext();
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const orgIdHeader = req.headers['x-org-id'];
    const actorIdHeader = req.headers['x-user-id'];

    analyticsClient
      .record({
        event: 'gateway.request',
        source: 'gateway.express',
        orgId: typeof orgIdHeader === 'string' ? orgIdHeader : undefined,
        actorId: typeof actorIdHeader === 'string' ? actorIdHeader : undefined,
        properties: {
          method: req.method,
          path: req.originalUrl ?? req.url,
          status: res.statusCode,
          durationMs,
        },
        context: {
          requestId: context?.requestId,
          traceId: context?.traceId,
        },
        metadata: {
          host: req.hostname,
        },
      })
      .catch((error) => {
        if (env.NODE_ENV !== 'production') {
          logger.warn('gateway.analytics_request_log_failed', { error });
        }
      });
  });
  next();
};
