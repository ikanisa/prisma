import type { Request, RequestHandler, Response } from 'express';
import { getRequestContext } from '../utils/request-context.js';
import { logger } from '@prisma-glow/logging';

export interface IdempotencyStore {
  get(key: string): Promise<{ status: number; body: unknown } | null>;
  set(key: string, value: { status: number; body: unknown }, ttlMs: number): Promise<void>;
}

type CacheEntry = { status: number; body: unknown; expiresAt: number };

class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly entries = new Map<string, CacheEntry>();

  async get(key: string): Promise<{ status: number; body: unknown } | null> {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return { status: entry.status, body: entry.body };
  }

  async set(key: string, value: { status: number; body: unknown }, ttlMs: number): Promise<void> {
    this.entries.set(key, { ...value, expiresAt: Date.now() + ttlMs });
  }
}

const DEFAULT_HEADERS = ['x-idempotency-key', 'idempotency-key'];

export type IdempotencyOptions = {
  store?: IdempotencyStore;
  ttlMs?: number;
  headerNames?: string[];
  scopeResolver?: (req: Request, res: Response) => string;
};

function pickKey(req: Request, headers: string[]): string | null {
  for (const header of headers) {
    const value = req.headers[header];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export function createIdempotencyMiddleware(options: IdempotencyOptions = {}): RequestHandler {
  const ttlMs = options.ttlMs ?? 10 * 60 * 1000;
  const headerNames = options.headerNames ?? DEFAULT_HEADERS;
  const store = options.store ?? new InMemoryIdempotencyStore();
  const resolveScope =
    options.scopeResolver ?? ((req, res) => res.locals.org?.orgId ?? (req.headers['x-org-id'] as string) ?? 'global');

  return async (req, res, next) => {
    const key = pickKey(req, headerNames);
    if (!key) {
      return next();
    }

    const scope = resolveScope(req, res);
    const compositeKey = `${scope}:${key}`;
    try {
      const cached = await store.get(compositeKey);
      if (cached) {
        const context = getRequestContext();
        res.setHeader('x-idempotent-replay', 'true');
        if (context?.requestId) {
          res.setHeader('x-request-id', context.requestId);
        }
        return res.status(cached.status).json(cached.body);
      }
    } catch (error) {
      logger.warn('idempotency_lookup_failed', { error });
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      try {
        const status = res.statusCode ?? 200;
        store
          .set(compositeKey, { status, body }, ttlMs)
          .catch((error) => logger.warn('idempotency_store_failed', { error }));
      } catch (error) {
        logger.warn('idempotency_store_failed', { error });
      }
      return originalJson(body);
    };

    next();
  };
}
