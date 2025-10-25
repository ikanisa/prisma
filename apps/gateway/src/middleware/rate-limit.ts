import type { Request, RequestHandler } from 'express';
import { logger } from '@prisma-glow/logger';

export interface RedisLikeClient {
  eval<T = unknown>(script: string, options: { keys: string[]; arguments: Array<string | number> }): Promise<T>;
}

type ConsumeResult = { allowed: boolean; retryAfterMs?: number };

interface TokenBucket {
  consume(key: string): Promise<ConsumeResult>;
}

class InMemoryTokenBucket implements TokenBucket {
  private readonly capacity: number;
  private readonly refillPerMs: number;
  private readonly windowMs: number;
  private readonly buckets = new Map<string, { tokens: number; lastRefill: number }>();

  constructor(capacity: number, windowMs: number) {
    this.capacity = Math.max(1, capacity);
    this.windowMs = Math.max(1000, windowMs);
    this.refillPerMs = this.capacity / this.windowMs;
  }

  async consume(key: string): Promise<ConsumeResult> {
    const now = Date.now();
    const state = this.buckets.get(key) ?? { tokens: this.capacity, lastRefill: now };
    const delta = now - state.lastRefill;
    if (delta > 0) {
      state.tokens = Math.min(this.capacity, state.tokens + delta * this.refillPerMs);
      state.lastRefill = now;
    }

    if (state.tokens < 1) {
      const deficit = 1 - state.tokens;
      const waitMs = Math.ceil(deficit / this.refillPerMs);
      this.buckets.set(key, state);
      return { allowed: false, retryAfterMs: waitMs };
    }

    state.tokens -= 1;
    this.buckets.set(key, state);
    return { allowed: true };
  }
}

class RedisTokenBucket implements TokenBucket {
  private readonly capacity: number;
  private readonly windowMs: number;
  private readonly refillPerMs: number;
  private readonly client: RedisLikeClient;

  constructor(client: RedisLikeClient, capacity: number, windowMs: number) {
    this.client = client;
    this.capacity = Math.max(1, capacity);
    this.windowMs = Math.max(1000, windowMs);
    this.refillPerMs = this.capacity / this.windowMs;
  }

  async consume(key: string): Promise<ConsumeResult> {
    const now = Date.now();
    const result = await this.client.eval<[number, number]>(LUA_TOKEN_BUCKET_SCRIPT, {
      keys: [key],
      arguments: [this.capacity, this.refillPerMs, now, this.windowMs],
    });
    if (!result || !Array.isArray(result)) {
      return { allowed: true };
    }
    const allowed = Number(result[0]) === 1;
    const retryAfterMs = Number(result[1]);
    if (allowed) {
      return { allowed: true };
    }
    return { allowed: false, retryAfterMs: retryAfterMs > 0 ? retryAfterMs : this.windowMs };
  }
}

const LUA_TOKEN_BUCKET_SCRIPT = `
local capacity = tonumber(ARGV[1])
local refillPerMs = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local windowMs = tonumber(ARGV[4])
local bucket = redis.call('hmget', KEYS[1], 'tokens', 'timestamp')
local tokens = tonumber(bucket[1])
local lastRefill = tonumber(bucket[2])
if tokens == nil then
  tokens = capacity
  lastRefill = now
end
if lastRefill == nil then
  lastRefill = now
end
local delta = now - lastRefill
if delta > 0 then
  local refill = delta * refillPerMs
  tokens = math.min(capacity, tokens + refill)
  lastRefill = now
end
if tokens < 1 then
  redis.call('hmset', KEYS[1], 'tokens', tokens, 'timestamp', lastRefill)
  redis.call('pexpire', KEYS[1], windowMs)
  local deficit = 1 - tokens
  local wait = math.ceil(deficit / refillPerMs)
  return {0, wait}
end
redis.call('hmset', KEYS[1], 'tokens', tokens - 1, 'timestamp', lastRefill)
redis.call('pexpire', KEYS[1], windowMs)
return {1, 0}
`;

export type RateLimitOptions = {
  capacity: number;
  windowMs: number;
  keyGenerator?: (req: Request) => string;
  redisClient?: RedisLikeClient | null;
};

export function createRateLimitMiddleware(options: RateLimitOptions): RequestHandler {
  const keyGenerator =
    options.keyGenerator ?? ((req) => `${req.method}:${req.baseUrl}${req.path}:${req.ip ?? 'unknown'}`);
  const bucket: TokenBucket = options.redisClient
    ? new RedisTokenBucket(options.redisClient, options.capacity, options.windowMs)
    : new InMemoryTokenBucket(options.capacity, options.windowMs);

  return async (req, res, next) => {
    const key = keyGenerator(req);
    try {
      const result = await bucket.consume(key);
      if (!result.allowed) {
        const retrySeconds = Math.ceil((result.retryAfterMs ?? options.windowMs) / 1000);
        res.setHeader('retry-after', String(retrySeconds));
        return res.status(429).json({ error: 'rate_limit_exceeded', retryAfterSeconds: retrySeconds });
      }
    } catch (error) {
      logger.warn('rate_limit_fallback', { error });
    }
    next();
  };
}
