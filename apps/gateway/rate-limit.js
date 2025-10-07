import Redis from 'ioredis';
import { logError, logInfo, logWarn } from './logger.js';

function createRedisClient(connectionString) {
  if (!connectionString) {
    logWarn('gateway.redis_unconfigured');
    return null;
  }
  const client = new Redis(connectionString, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });

  client.on('error', (error) => {
    logError('gateway.redis_error', error);
  });

  client.connect().catch((error) => {
    logError('gateway.redis_connect_failed', error);
  });

  return client;
}

export function createRateLimiter({ redisUrl, defaultLimit = 60, defaultWindowSeconds = 60 }) {
  const redis = createRedisClient(redisUrl);

  return function rateLimiter(options = {}) {
    const limit = Number.isFinite(options.limit) ? Number(options.limit) : defaultLimit;
    const windowSeconds = Number.isFinite(options.windowSeconds) ? Number(options.windowSeconds) : defaultWindowSeconds;
    const resource = options.resource ?? 'default';

    return async function enforceRateLimit(req, res, next) {
      if (!redis) {
        return next();
      }

      const orgId = req.orgId ?? 'anonymous';
      const key = `gateway:rate:${resource}:${orgId}`;

      try {
        const count = await redis.incr(key);
        if (count === 1) {
          await redis.expire(key, windowSeconds);
        }
        const ttl = await redis.ttl(key);
        const remaining = Math.max(0, limit - count);

        res.setHeader('X-RateLimit-Limit', String(limit));
        res.setHeader('X-RateLimit-Remaining', String(Math.max(0, remaining)));
        if (ttl > 0) {
          res.setHeader('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + ttl));
        }

        if (count > limit) {
          const retryAfter = ttl > 0 ? ttl : windowSeconds;
          logInfo('gateway.rate_limited', { orgId, resource, requestId: req.requestId });
          res.setHeader('Retry-After', String(retryAfter));
          return res.status(429).json({ error: 'rate_limit_exceeded', retryAfterSeconds: retryAfter });
        }

        return next();
      } catch (error) {
        logError('gateway.rate_limit_error', error, { resource, orgId, requestId: req.requestId });
        return next();
      }
    };
  };
}
