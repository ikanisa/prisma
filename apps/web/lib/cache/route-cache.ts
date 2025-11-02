import { logger } from '@/lib/logger';
import {
  CacheManager,
  cacheConfig,
  createRedisCacheClient,
  getCachePolicy,
  jsonSerializer,
  type CacheKeySegment,
  type CacheUseCase,
} from '@prisma-glow/cache';

const globalForCache = globalThis as unknown as {
  __webCacheManager?: CacheManager | null;
};

let testOverride: CacheManager | null | undefined;

const ensureCacheManager = (): CacheManager | null => {
  if (testOverride !== undefined) {
    return testOverride;
  }

  if (globalForCache.__webCacheManager !== undefined) {
    return globalForCache.__webCacheManager;
  }

  const redisUrl = cacheConfig.redisUrl;
  if (!redisUrl) {
    globalForCache.__webCacheManager = null;
    return null;
  }

  try {
    const client = createRedisCacheClient({ url: redisUrl, keyPrefix: 'apps:web' });
    globalForCache.__webCacheManager = new CacheManager({
      client,
      keyPrefix: 'apps:web',
      defaultSerializer: jsonSerializer,
      defaultTtlSeconds: cacheConfig.defaultTtlSeconds,
    });
    return globalForCache.__webCacheManager;
  } catch (error) {
    logger.warn('apps.web.cache_initialization_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    globalForCache.__webCacheManager = null;
    return null;
  }
};

export const getCacheManager = (): CacheManager | null => {
  return ensureCacheManager();
};

export const withRouteCache = async <T>(
  useCase: CacheUseCase,
  keyParts: CacheKeySegment[],
  loader: () => Promise<T>,
): Promise<T> => {
  const manager = ensureCacheManager();
  const policy = getCachePolicy(useCase);

  if (!manager || policy.ttlSeconds <= 0) {
    return loader();
  }

  return manager.withCache({
    key: [useCase, ...keyParts],
    loader,
    ttlSeconds: policy.ttlSeconds,
  });
};

export const invalidateRouteCache = async (
  useCase: CacheUseCase,
  keyParts: CacheKeySegment[],
): Promise<void> => {
  const manager = ensureCacheManager();
  if (!manager) {
    return;
  }

  try {
    await manager.invalidate({ key: [useCase, ...keyParts] });
  } catch (error) {
    logger.warn('apps.web.cache_invalidation_failed', {
      useCase,
      keyParts,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const setCacheManagerForTests = (manager: CacheManager | null): void => {
  testOverride = manager;
};

export const resetCacheManagerForTests = (): void => {
  testOverride = undefined;
  if ('__webCacheManager' in globalForCache) {
    delete globalForCache.__webCacheManager;
  }
};
