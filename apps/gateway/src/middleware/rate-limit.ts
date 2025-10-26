import rateLimit, {
  type AugmentedRequest,
  type ClientRateLimitInfo,
  type Options,
  type Store,
} from 'express-rate-limit';
import type { Request, RequestHandler } from 'express';

export interface RedisLikeClient {
  eval<T = unknown>(script: string, options: { keys: string[]; arguments: Array<string | number> }): Promise<T>;
}

const LUA_INCREMENT_SCRIPT = `
local key = KEYS[1]
local windowMs = tonumber(ARGV[1])
local current = redis.call('incr', key)
if current == 1 then
  redis.call('pexpire', key, windowMs)
end
local ttl = redis.call('pttl', key)
if ttl < 0 then
  ttl = windowMs
  redis.call('pexpire', key, windowMs)
end
return {current, ttl}
`;

const LUA_GET_SCRIPT = `
local key = KEYS[1]
local current = redis.call('get', key)
if not current then
  return {0, -1}
end
local ttl = redis.call('pttl', key)
if ttl < 0 then
  ttl = -1
end
return {tonumber(current), ttl}
`;

const LUA_DECREMENT_SCRIPT = `
local key = KEYS[1]
local current = redis.call('get', key)
if not current then
  return 0
end
current = tonumber(current)
if current <= 1 then
  redis.call('del', key)
  return 0
end
return redis.call('decr', key)
`;

const LUA_RESET_KEY_SCRIPT = `
local key = KEYS[1]
redis.call('del', key)
return 1
`;

class RedisStore implements Store {
  private readonly client: RedisLikeClient;
  private windowMs = 60_000;

  constructor(client: RedisLikeClient) {
    this.client = client;
  }

  async init(options: Options): Promise<void> {
    if (typeof options.windowMs === 'number' && Number.isFinite(options.windowMs) && options.windowMs > 0) {
      this.windowMs = Math.floor(options.windowMs);
    }
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const result = await this.client.eval<[number, number]>(LUA_INCREMENT_SCRIPT, {
      keys: [key],
      arguments: [this.windowMs],
    });
    const totalHits = Number(result?.[0] ?? 0);
    const ttl = Number(result?.[1] ?? this.windowMs);
    const resetTime = new Date(Date.now() + (ttl > 0 ? ttl : this.windowMs));
    return { totalHits, resetTime };
  }

  async decrement(key: string): Promise<void> {
    await this.client.eval(LUA_DECREMENT_SCRIPT, { keys: [key], arguments: [] });
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    const result = await this.client.eval<[number, number]>(LUA_GET_SCRIPT, { keys: [key], arguments: [] });
    const totalHits = Number(result?.[0] ?? 0);
    if (totalHits <= 0) {
      return undefined;
    }
    const ttl = Number(result?.[1] ?? this.windowMs);
    const resetTime = new Date(Date.now() + (ttl > 0 ? ttl : this.windowMs));
    return { totalHits, resetTime };
  }

  async resetKey(key: string): Promise<void> {
    await this.client.eval(LUA_RESET_KEY_SCRIPT, { keys: [key], arguments: [] });
  }

  async resetAll(): Promise<void> {
    // This implementation intentionally does not flush the entire Redis database.
  }

  async shutdown(): Promise<void> {
    // No resources to clean up.
  }
}

export type RateLimitOptions = {
  capacity: number;
  windowMs: number;
  keyGenerator?: (req: Request) => string;
  redisClient?: RedisLikeClient | null;
};

export function createRateLimitMiddleware(options: RateLimitOptions): RequestHandler {
  const keyGenerator =
    options.keyGenerator ?? ((req) => `${req.method}:${req.baseUrl}${req.path}:${req.ip ?? 'unknown'}`);

  const limit = Math.max(1, Math.floor(options.capacity));
  const windowMs = Math.max(1000, Math.floor(options.windowMs));
  const store = options.redisClient ? new RedisStore(options.redisClient) : undefined;

  const middleware = rateLimit({
    windowMs,
    limit,
    keyGenerator,
    legacyHeaders: false,
    standardHeaders: 'draft-6',
    passOnStoreError: true,
    ...(store ? { store } : {}),
    handler: (req, res, _next, opts) => {
      const rateInfo = (req as AugmentedRequest).rateLimit;
      const retryMs = rateInfo?.resetTime ? Math.max(0, rateInfo.resetTime.getTime() - Date.now()) : windowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil(retryMs / 1000));
      res.setHeader('retry-after', String(retryAfterSeconds));
      res.status(opts.statusCode).json({ error: 'rate_limit_exceeded', retryAfterSeconds });
    },
  });

  return middleware;
}
