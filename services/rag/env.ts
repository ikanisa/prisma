import { inspect } from 'node:util';
import { z } from 'zod';

const booleanish = z
  .union([z.string(), z.boolean(), z.number()])
  .transform((value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    const normalised = value.trim().toLowerCase();
    return normalised === 'true' || normalised === '1' || normalised === 'yes';
  });

const optionalBooleanish = booleanish.optional().default(false);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  ENVIRONMENT: z.string().optional(),
  SERVICE_VERSION: z.string().optional(),
  OTEL_SERVICE_NAME: z.string().min(1).default('rag-service'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  SUPABASE_JWT_SECRET: z.string().optional(),
  SUPABASE_JWT_AUDIENCE: z.string().optional(),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  DATABASE_URL: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_RELEASE: z.string().optional(),
  ALLOW_SENTRY_DRY_RUN: optionalBooleanish,
  API_RATE_LIMIT: z.coerce.number().int().positive().default(60),
  API_RATE_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  EMBEDDING_CRON_SECRET: z.string().optional(),
  EMBEDDING_DELTA_LOOKBACK_HOURS: z.coerce.number().int().positive().default(24),
  EMBEDDING_DELTA_DOCUMENT_LIMIT: z.coerce.number().int().positive().default(50),
  EMBEDDING_DELTA_POLICY_LIMIT: z.coerce.number().int().positive().default(25),
  TELEMETRY_ALERT_WEBHOOK: z.string().url().optional(),
  EMBEDDING_ALERT_WEBHOOK: z.string().url().optional(),
  WEB_FETCH_CACHE_RETENTION_DAYS: z.coerce.number().int().nonnegative().default(14),
  OPENAI_WEB_SEARCH_ENABLED: optionalBooleanish,
  OPENAI_WEB_SEARCH_MODEL: z.string().optional(),
  OPENAI_SUMMARY_MODEL: z.string().optional(),
  OPENAI_FILE_SEARCH_VECTOR_STORE_ID: z.string().optional(),
  OPENAI_FILE_SEARCH_MODEL: z.string().optional(),
  OPENAI_FILE_SEARCH_MAX_RESULTS: z.coerce.number().int().positive().optional(),
  OPENAI_FILE_SEARCH_FILTERS: z.string().optional(),
  OPENAI_FILE_SEARCH_INCLUDE_RESULTS: optionalBooleanish,
});

const parsed = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  ENVIRONMENT: process.env.ENVIRONMENT,
  SERVICE_VERSION: process.env.SERVICE_VERSION,
  OTEL_SERVICE_NAME: process.env.OTEL_SERVICE_NAME,
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
  SUPABASE_JWT_AUDIENCE: process.env.SUPABASE_JWT_AUDIENCE,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  SENTRY_DSN: process.env.SENTRY_DSN,
  SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
  SENTRY_RELEASE: process.env.SENTRY_RELEASE,
  ALLOW_SENTRY_DRY_RUN: process.env.ALLOW_SENTRY_DRY_RUN,
  API_RATE_LIMIT: process.env.API_RATE_LIMIT,
  API_RATE_WINDOW_SECONDS: process.env.API_RATE_WINDOW_SECONDS,
  EMBEDDING_CRON_SECRET: process.env.EMBEDDING_CRON_SECRET,
  EMBEDDING_DELTA_LOOKBACK_HOURS: process.env.EMBEDDING_DELTA_LOOKBACK_HOURS,
  EMBEDDING_DELTA_DOCUMENT_LIMIT: process.env.EMBEDDING_DELTA_DOCUMENT_LIMIT,
  EMBEDDING_DELTA_POLICY_LIMIT: process.env.EMBEDDING_DELTA_POLICY_LIMIT,
  TELEMETRY_ALERT_WEBHOOK: process.env.TELEMETRY_ALERT_WEBHOOK,
  EMBEDDING_ALERT_WEBHOOK: process.env.EMBEDDING_ALERT_WEBHOOK,
  WEB_FETCH_CACHE_RETENTION_DAYS: process.env.WEB_FETCH_CACHE_RETENTION_DAYS,
  OPENAI_WEB_SEARCH_ENABLED: process.env.OPENAI_WEB_SEARCH_ENABLED,
  OPENAI_WEB_SEARCH_MODEL: process.env.OPENAI_WEB_SEARCH_MODEL,
  OPENAI_SUMMARY_MODEL: process.env.OPENAI_SUMMARY_MODEL,
  OPENAI_FILE_SEARCH_VECTOR_STORE_ID: process.env.OPENAI_FILE_SEARCH_VECTOR_STORE_ID,
  OPENAI_FILE_SEARCH_MODEL: process.env.OPENAI_FILE_SEARCH_MODEL,
  OPENAI_FILE_SEARCH_MAX_RESULTS: process.env.OPENAI_FILE_SEARCH_MAX_RESULTS,
  OPENAI_FILE_SEARCH_FILTERS: process.env.OPENAI_FILE_SEARCH_FILTERS,
  OPENAI_FILE_SEARCH_INCLUDE_RESULTS: process.env.OPENAI_FILE_SEARCH_INCLUDE_RESULTS,
});

if (!parsed.success) {
  console.error('services/rag: invalid environment variables', inspect(parsed.error.format(), { depth: null }));
  throw new Error('services/rag environment validation failed');
}

export const env = Object.freeze(parsed.data);
export type Env = typeof env;
