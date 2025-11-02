import { inspect } from 'node:util';
import { z } from 'zod';
import type { CachePolicy, CacheUseCase } from './types.js';

const envSchema = z.object({
  REDIS_URL: z.string().url().optional(),
  CACHE_DEFAULT_TTL_SECONDS: z.coerce.number().int().nonnegative().default(60),
  CACHE_CONTROLS_TTL_SECONDS: z.coerce.number().int().nonnegative().optional(),
  CACHE_GROUP_COMPONENTS_TTL_SECONDS: z.coerce.number().int().nonnegative().optional(),
  CACHE_OTHER_INFORMATION_TTL_SECONDS: z.coerce.number().int().nonnegative().optional(),
  CACHE_SPECIALISTS_TTL_SECONDS: z.coerce.number().int().nonnegative().optional(),
});

type EnvShape = z.infer<typeof envSchema>;

const parseEnv = (): EnvShape => {
  const parsed = envSchema.safeParse({
    REDIS_URL: process.env.REDIS_URL,
    CACHE_DEFAULT_TTL_SECONDS: process.env.CACHE_DEFAULT_TTL_SECONDS,
    CACHE_CONTROLS_TTL_SECONDS: process.env.CACHE_CONTROLS_TTL_SECONDS,
    CACHE_GROUP_COMPONENTS_TTL_SECONDS: process.env.CACHE_GROUP_COMPONENTS_TTL_SECONDS,
    CACHE_OTHER_INFORMATION_TTL_SECONDS: process.env.CACHE_OTHER_INFORMATION_TTL_SECONDS,
    CACHE_SPECIALISTS_TTL_SECONDS: process.env.CACHE_SPECIALISTS_TTL_SECONDS,
  });

  if (!parsed.success) {
    throw new Error(
      `services/cache: invalid environment variables\n${inspect(parsed.error.format(), { depth: null })}`,
    );
  }

  return parsed.data;
};

const env = parseEnv();

const ttlOverrides: Record<CacheUseCase, number | undefined> = {
  controls: env.CACHE_CONTROLS_TTL_SECONDS,
  groupComponents: env.CACHE_GROUP_COMPONENTS_TTL_SECONDS,
  otherInformationDocs: env.CACHE_OTHER_INFORMATION_TTL_SECONDS,
  specialists: env.CACHE_SPECIALISTS_TTL_SECONDS,
};

export const cacheConfig = Object.freeze({
  redisUrl: env.REDIS_URL ?? null,
  defaultTtlSeconds: env.CACHE_DEFAULT_TTL_SECONDS,
  ttlOverrides,
});

export const getCachePolicy = (useCase: CacheUseCase): CachePolicy => {
  const ttl = ttlOverrides[useCase];
  const ttlSeconds = typeof ttl === 'number' ? ttl : env.CACHE_DEFAULT_TTL_SECONDS;
  return {
    useCase,
    ttlSeconds,
  };
};
