import express, { type Express } from 'express';
import { initTracing } from './otel.js';
import type { ErrorRequestHandler } from 'express';
import { pathToFileURL } from 'url';
import { traceMiddleware } from './middleware/trace.js';
import { createPiiScrubberMiddleware } from './middleware/pii-scrubber.js';
import v1Router from './routes/v1.js';
import { scrubPii } from './utils/pii.js';
import { getRequestContext } from './utils/request-context.js';
import { env } from './env.js';

export async function createGatewayServer(): Promise<Express> {
  await initTracing();
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '5mb' }));
  app.use(traceMiddleware);
  app.use(createPiiScrubberMiddleware());

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
    console.error('gateway.unhandled_error', scrubPii({ message: err?.message, stack: err?.stack }));
    res.status(500).json({ error: 'internal_server_error' });
  };
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
  const port = env.PORT;
  createGatewayServer().then((app) => {
    app.listen(port, () => {
      console.warn(`Gateway listening on port ${port}`);
    });
  });
}
