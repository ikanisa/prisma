import { inspect } from 'node:util';
import { z } from 'zod';
import { logger } from '@prisma-glow/logger';

const booleanish = z
  .union([z.string(), z.boolean(), z.number()])
  .transform((value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    const normalised = value.trim().toLowerCase();
    return normalised === 'true' || normalised === '1' || normalised === 'yes';
  });

const optionalBooleanish = booleanish.optional().default(false);

const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  ENVIRONMENT: z.string().optional(),
  PORT: z.coerce.number().int().min(0).max(65535).default(3000),
  OTEL_SERVICE_NAME: z.string().min(1).default('gateway'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  SERVICE_VERSION: z.string().optional(),
  SENTRY_RELEASE: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
  GATEWAY_SENTRY_DSN: z.string().url().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional(),
  ALLOW_SENTRY_DRY_RUN: optionalBooleanish,
  ANALYTICS_SERVICE_URL: z.string().url().optional(),
  ANALYTICS_SERVICE_TOKEN: z.string().optional(),
  REDIS_URL: z.string().url().optional(),
  DATABASE_URL: z.string().url().optional(),
  GATEWAY_API_KEYS: z.string().optional(),
  API_KEYS: z.string().optional(),
  AGENT_SERVICE_URL: z.string().url().optional(),
  AGENT_SERVICE_API_KEY: z.string().optional(),
  RAG_SERVICE_URL: z.string().url().optional(),
  RAG_SERVICE_API_KEY: z.string().optional(),
});

const parsed = baseSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  ENVIRONMENT: process.env.ENVIRONMENT,
  PORT: process.env.PORT,
  OTEL_SERVICE_NAME: process.env.OTEL_SERVICE_NAME,
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  SERVICE_VERSION: process.env.SERVICE_VERSION,
  SENTRY_RELEASE: process.env.SENTRY_RELEASE,
  SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
  SENTRY_DSN: process.env.SENTRY_DSN,
  GATEWAY_SENTRY_DSN: process.env.GATEWAY_SENTRY_DSN,
  SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE,
  ALLOW_SENTRY_DRY_RUN: process.env.ALLOW_SENTRY_DRY_RUN,
  ANALYTICS_SERVICE_URL: process.env.ANALYTICS_SERVICE_URL,
  ANALYTICS_SERVICE_TOKEN: process.env.ANALYTICS_SERVICE_TOKEN,
  REDIS_URL: process.env.REDIS_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  GATEWAY_API_KEYS: process.env.GATEWAY_API_KEYS,
  API_KEYS: process.env.API_KEYS,
  AGENT_SERVICE_URL: process.env.AGENT_SERVICE_URL,
  AGENT_SERVICE_API_KEY: process.env.AGENT_SERVICE_API_KEY,
  RAG_SERVICE_URL: process.env.RAG_SERVICE_URL,
  RAG_SERVICE_API_KEY: process.env.RAG_SERVICE_API_KEY,
});

if (!parsed.success) {
  logger.error('apps/gateway.invalid_environment', {
    details: inspect(parsed.error.format(), { depth: null }),
  });
  throw new Error('apps/gateway environment validation failed');
}

const baseEnv = parsed.data;

export const env = Object.freeze({
  ...baseEnv,
  SENTRY_DSN: baseEnv.GATEWAY_SENTRY_DSN ?? baseEnv.SENTRY_DSN ?? undefined,
  SENTRY_TRACES_SAMPLE_RATE: baseEnv.SENTRY_TRACES_SAMPLE_RATE ?? undefined,
});

const dynamicSchema = z.object({
  FASTAPI_BASE_URL: z.string().url().optional(),
  API_BASE_URL: z.string().url().optional(),
});

type DynamicEnv = {
  FASTAPI_BASE_URL: string | null;
  API_BASE_URL: string | null;
};

export function getRuntimeEnv(): DynamicEnv {
  const evaluated = dynamicSchema.safeParse({
    FASTAPI_BASE_URL: process.env.FASTAPI_BASE_URL ?? undefined,
    API_BASE_URL: process.env.API_BASE_URL ?? undefined,
  });

  if (!evaluated.success) {
    logger.error('apps/gateway.invalid_runtime_environment', {
      details: inspect(evaluated.error.format(), { depth: null }),
    });
    return { FASTAPI_BASE_URL: null, API_BASE_URL: null };
  }

  const { FASTAPI_BASE_URL, API_BASE_URL } = evaluated.data;
  return {
    FASTAPI_BASE_URL: FASTAPI_BASE_URL ?? null,
    API_BASE_URL: API_BASE_URL ?? null,
  };
}

export type Env = typeof env;
export type RuntimeEnv = ReturnType<typeof getRuntimeEnv>;
