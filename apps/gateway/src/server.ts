import express from 'express';
import * as Sentry from '@sentry/node';
import type { Transport, TransportOptions } from '@sentry/types';
import { initTracing } from './otel.js';
import type { ErrorRequestHandler, Express } from 'express';
import { pathToFileURL } from 'url';
import { traceMiddleware } from './middleware/trace.js';
import { createPiiScrubberMiddleware } from './middleware/pii-scrubber.js';
import { analyticsMiddleware } from './middleware/analytics.js';
import v1Router from './routes/v1.js';
import { scrubPii } from './utils/pii.js';
import { getRequestContext } from './utils/request-context.js';
import { env } from './env.js';
import { logger } from '@prisma-glow/logger';

declare global {
  // eslint-disable-next-line no-var
  var __SENTRY_TRANSPORT__: ((options: TransportOptions) => Transport) | undefined;
}

function initialiseSentry(): boolean {
  const dsn = env.SENTRY_DSN ?? process.env.GATEWAY_SENTRY_DSN ?? process.env.SENTRY_DSN;
  if (!dsn) {
    return false;
  }

  if (!Sentry.getCurrentHub().getClient()) {
    const environment = env.SENTRY_ENVIRONMENT ?? env.ENVIRONMENT ?? env.NODE_ENV ?? 'development';
    const release = env.SENTRY_RELEASE ?? env.SERVICE_VERSION ?? process.env.SERVICE_VERSION;
    const sampleRate = (() => {
      if (typeof env.SENTRY_TRACES_SAMPLE_RATE === 'number') {
        return env.SENTRY_TRACES_SAMPLE_RATE;
      }
      const raw = process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0';
      const parsed = Number.parseFloat(raw);
      if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
        return parsed;
      }
      return 0;
    })();

    const transportFactory = globalThis.__SENTRY_TRANSPORT__;

    Sentry.init({
      dsn,
      environment,
      release: release ?? undefined,
      tracesSampleRate: sampleRate,
      transport: typeof transportFactory === 'function' ? transportFactory : undefined,
    });
  }

  return true;
}

export function createGatewayServer(): Express {
  initTracing();
  const sentryEnabled = initialiseSentry();
  const app = express();

  app.disable('x-powered-by');
  if (sentryEnabled) {
    app.use(Sentry.Handlers.requestHandler({ user: false }));
    app.use(Sentry.Handlers.tracingHandler());
  }

  app.use(express.json({ limit: '5mb' }));
  app.use(traceMiddleware);
  if (sentryEnabled) {
    app.use((req, _res, next) => {
      const context = getRequestContext();
      Sentry.configureScope((scope) => {
        if (context?.requestId) {
          scope.setTag('request_id', context.requestId);
        }
        if (context?.traceId) {
          scope.setTag('trace_id', context.traceId);
        }
      });
      Sentry.addBreadcrumb({
        category: 'request',
        level: 'info',
        message: `${req.method} ${req.path}`,
        data: {
          method: req.method,
          path: req.path,
          requestId: context?.requestId,
          traceId: context?.traceId,
        },
      });
      next();
    });
  }
  app.use(createPiiScrubberMiddleware());
  app.use(analyticsMiddleware);

  app.get('/health', (_req, res) => {
    const context = getRequestContext();
    res.json({ status: 'ok', requestId: context?.requestId ?? null, traceId: context?.traceId ?? null });
  });

  app.get('/readiness', (_req, res) => {
    // Minimal readiness: gateway is stateless. Optionally, verify required envs.
    const missing: string[] = [];
    if (!env.OTEL_SERVICE_NAME) missing.push('OTEL_SERVICE_NAME');
    const context = getRequestContext();
    if (missing.length) {
      return res.status(503).json({
        status: 'degraded',
        missing,
        requestId: context?.requestId ?? null,
        traceId: context?.traceId ?? null,
      });
    }
    res.json({ status: 'ok', requestId: context?.requestId ?? null, traceId: context?.traceId ?? null });
  });

  app.use('/v1', v1Router);

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    logger.error('gateway.unhandled_error', scrubPii({ message: err?.message, stack: err?.stack }));
    res.status(500).json({ error: 'internal_server_error' });
  };
  if (sentryEnabled) {
    app.use(Sentry.Handlers.errorHandler());
  }
  app.use(errorHandler);

  return app;
}

export default createGatewayServer;

const isEntrypoint = (() => {
  try {
    const currentUrl = new URL(import.meta.url);
    const invoked = process.argv[1] ? pathToFileURL(process.argv[1]) : null;
    return invoked ? currentUrl.href === invoked.href : false;
  } catch {
    return false;
  }
})();

if (isEntrypoint) {
  const app = createGatewayServer();
  const port = env.PORT;
  app.listen(port, () => {
    logger.info('gateway.listening', { port });
  });
}
