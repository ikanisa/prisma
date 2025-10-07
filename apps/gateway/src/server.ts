import express from 'express';
import type { ErrorRequestHandler } from 'express';
import { pathToFileURL } from 'url';
import { traceMiddleware } from './middleware/trace';
import { createPiiScrubberMiddleware } from './middleware/pii-scrubber';
import v1Router from './routes/v1';
import { scrubPii } from './utils/pii';
import { getRequestContext } from './utils/request-context';

export function createGatewayServer() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '5mb' }));
  app.use(traceMiddleware);
  app.use(createPiiScrubberMiddleware());

  app.get('/health', (_req, res) => {
    const context = getRequestContext();
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
  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () => {
    console.log(`Gateway listening on port ${port}`);
  });
}
