import express from 'express';
import { requestContextMiddleware } from './request-context.js';
import { createOrgGuard } from './org-guard.js';
import { createApiKeyValidator } from './api-key.js';
import { createRateLimiter } from './rate-limit.js';
import { createIdempotencyStore } from './idempotency-store.js';
import { createIdempotencyMiddleware } from './idempotency-middleware.js';
import { registerAgentRoutes } from './routes/agent.js';
import { registerRagRoutes } from './routes/rag.js';
import { logInfo } from './logger.js';

const JSON_LIMIT = '5mb';

export function createGatewayServer() {
  const app = express();
  app.disable('x-powered-by');

  app.use(express.json({ limit: JSON_LIMIT }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestContextMiddleware);

  const orgGuard = createOrgGuard();
  const apiKeys = process.env.GATEWAY_API_KEYS || process.env.API_KEYS || '';
  const apiKeyValidator = createApiKeyValidator({ apiKeys });
  const rateLimiterFactory = createRateLimiter({ redisUrl: process.env.REDIS_URL, defaultLimit: 60, defaultWindowSeconds: 60 });
  const idempotencyStore = createIdempotencyStore(process.env.DATABASE_URL);
  const idempotencyFactory = (options) => createIdempotencyMiddleware(idempotencyStore, options);

  app.get('/health', async (req, res) => {
    const health = {
      status: 'ok',
      requestId: req.requestId,
      redis: process.env.REDIS_URL ? 'configured' : 'disabled',
      idempotency: process.env.DATABASE_URL ? 'configured' : 'disabled',
    };
    res.json(health);
  });

  app.use('/v1', orgGuard, apiKeyValidator);

  registerAgentRoutes(app, {
    agentServiceUrl: process.env.AGENT_SERVICE_URL,
    agentServiceApiKey: process.env.AGENT_SERVICE_API_KEY,
    rateLimiter: rateLimiterFactory,
  });

  registerRagRoutes(app, {
    ragServiceUrl: process.env.RAG_SERVICE_URL,
    ragServiceApiKey: process.env.RAG_SERVICE_API_KEY,
    rateLimiter: rateLimiterFactory,
    idempotencyMiddlewareFactory: idempotencyFactory,
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'not_found' });
  });

  app.use((error, req, res, _next) => {
    logInfo('gateway.unhandled_error', { requestId: req.requestId, error: error?.message });
    res.status(500).json({ error: 'internal_error' });
  });

  return app;
}
