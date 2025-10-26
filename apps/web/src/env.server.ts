import 'server-only';

import { inspect } from 'node:util';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const booleanish = z
  .union([z.string(), z.boolean(), z.number()])
  .transform((value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    const normalised = value.trim().toLowerCase();
    return normalised === 'true' || normalised === '1' || normalised === 'yes';
  });

const optionalBooleanish = booleanish.optional().default(false);

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  AUTH_CLIENT_ID: z.string().min(1, 'AUTH_CLIENT_ID is required'),
  AUTH_CLIENT_SECRET: z.string().min(1, 'AUTH_CLIENT_SECRET is required'),
  AUTH_ISSUER: z.string().url('AUTH_ISSUER must be a valid URL'),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  SUPABASE_ALLOW_STUB: optionalBooleanish,
  AGENT_SERVICE_URL: z.string().url().optional(),
  SAMPLING_C1_BASE_URL: z.string().url().optional(),
  SAMPLING_C1_API_KEY: z.string().optional(),
  AUTOMATION_WEBHOOK_SECRET: z.string().optional(),
  N8N_WEBHOOK_SECRET: z.string().optional(),
  RAG_SERVICE_URL: z.string().url().optional(),
  EMBEDDING_CRON_SECRET: z.string().optional(),
  DATABASE_URL: z.string().url().optional(),
  SKIP_HEALTHCHECK_DB: optionalBooleanish,
  RECONCILIATION_MODE: z.enum(['db', 'memory']).default('db'),
  WEB_SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: z.string().optional(),
  NEXT_PUBLIC_SENTRY_RELEASE: z.string().optional(),
  NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: z.string().optional(),
  NEXT_PUBLIC_API_BASE: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  NEXT_PUBLIC_ACCOUNTING_MODE: z.enum(['close', 'modules']).default('close'),
  NEXT_PUBLIC_RECONCILIATION_MODE: z.enum(['db', 'memory']).default('db'),
  NEXT_PUBLIC_GROUP_AUDIT_MODE: z.enum(['workspace', 'dashboard']).default('workspace'),
  NEXT_PUBLIC_DEMO_ORG_ID: z.string().optional(),
  NEXT_PUBLIC_DEMO_ENGAGEMENT_ID: z.string().optional(),
  NEXT_PUBLIC_DEMO_USER_ID: z.string().optional(),
});

const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST !== undefined;
const allowUnsafeDefaults =
  isTestEnv ||
  process.env.ALLOW_UNSAFE_ENV_DEFAULTS === 'true' ||
  process.env.CI === '1' ||
  process.env.CI === 'true';

const maskValue = (value: string): string => {
  if (/^https?:\/\//.test(value)) {
    return value;
  }
  if (/key|secret|token|password/i.test(value)) {
    return '[redacted]';
  }
  return value.length > 4 ? `${value.slice(0, 2)}…${value.slice(-2)}` : '[redacted]';
};

const readWithFallback = (key: keyof NodeJS.ProcessEnv, fallback: string): string | undefined => {
  const raw = process.env[key];
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw;
  }
  if (allowUnsafeDefaults) {
    process.env[key] = fallback;
    if (!isTestEnv) {
      logger.warn('apps.web.env_missing_using_fallback', {
        key,
        fallback: maskValue(fallback),
      });
    }
    return fallback;
  }
  return undefined;
};

const resolvedNextPublicSupabaseUrl = readWithFallback('NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.test.local');

const parsed = serverSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  AUTH_CLIENT_ID: readWithFallback('AUTH_CLIENT_ID', 'test-client-id'),
  AUTH_CLIENT_SECRET: readWithFallback('AUTH_CLIENT_SECRET', 'test-client-secret'),
  AUTH_ISSUER: readWithFallback('AUTH_ISSUER', 'https://auth.test.local'),
  SUPABASE_URL:
    process.env.SUPABASE_URL ??
    resolvedNextPublicSupabaseUrl ??
    (allowUnsafeDefaults ? readWithFallback('SUPABASE_URL', 'https://supabase.test.local') : undefined),
  SUPABASE_SERVICE_ROLE_KEY: readWithFallback('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key'),
  SUPABASE_ALLOW_STUB: readWithFallback('SUPABASE_ALLOW_STUB', 'true'),
  AGENT_SERVICE_URL: process.env.AGENT_SERVICE_URL ?? undefined,
  SAMPLING_C1_BASE_URL: process.env.SAMPLING_C1_BASE_URL ?? undefined,
  SAMPLING_C1_API_KEY: process.env.SAMPLING_C1_API_KEY ?? undefined,
  AUTOMATION_WEBHOOK_SECRET: process.env.AUTOMATION_WEBHOOK_SECRET ?? undefined,
  N8N_WEBHOOK_SECRET: process.env.N8N_WEBHOOK_SECRET ?? undefined,
  RAG_SERVICE_URL: process.env.RAG_SERVICE_URL ?? undefined,
  EMBEDDING_CRON_SECRET: process.env.EMBEDDING_CRON_SECRET ?? undefined,
  DATABASE_URL: process.env.DATABASE_URL ?? undefined,
  SKIP_HEALTHCHECK_DB: process.env.SKIP_HEALTHCHECK_DB,
  RECONCILIATION_MODE: process.env.RECONCILIATION_MODE ?? undefined,
  NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE ?? undefined,
  NEXT_PUBLIC_SUPABASE_URL: resolvedNextPublicSupabaseUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: readWithFallback('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key'),
  WEB_SENTRY_DSN: process.env.WEB_SENTRY_DSN ?? process.env.SENTRY_DSN ?? undefined,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.WEB_SENTRY_DSN ?? undefined,
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.SENTRY_ENVIRONMENT ?? undefined,
  NEXT_PUBLIC_SENTRY_RELEASE: process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? process.env.SENTRY_RELEASE ?? undefined,
  NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? undefined,
  NEXT_PUBLIC_ACCOUNTING_MODE: process.env.NEXT_PUBLIC_ACCOUNTING_MODE ?? undefined,
  NEXT_PUBLIC_RECONCILIATION_MODE: process.env.NEXT_PUBLIC_RECONCILIATION_MODE ?? undefined,
  NEXT_PUBLIC_GROUP_AUDIT_MODE: process.env.NEXT_PUBLIC_GROUP_AUDIT_MODE ?? undefined,
  NEXT_PUBLIC_DEMO_ORG_ID: process.env.NEXT_PUBLIC_DEMO_ORG_ID ?? undefined,
  NEXT_PUBLIC_DEMO_ENGAGEMENT_ID: process.env.NEXT_PUBLIC_DEMO_ENGAGEMENT_ID ?? undefined,
  NEXT_PUBLIC_DEMO_USER_ID: process.env.NEXT_PUBLIC_DEMO_USER_ID ?? undefined,
});

if (!parsed.success) {
  const formatted = parsed.error.format();
  logger.error('apps.web.invalid_environment', {
    details: inspect(formatted, { depth: null }),
  });
  throw new Error('apps/web environment validation failed');
}

const data = parsed.data;

export const env = {
  NODE_ENV: data.NODE_ENV,
  AUTH_CLIENT_ID: data.AUTH_CLIENT_ID,
  AUTH_CLIENT_SECRET: data.AUTH_CLIENT_SECRET,
  AUTH_ISSUER: data.AUTH_ISSUER,
  SUPABASE_URL: data.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: data.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ALLOW_STUB: data.SUPABASE_ALLOW_STUB,
  AGENT_SERVICE_URL: data.AGENT_SERVICE_URL ?? null,
  SAMPLING_C1_BASE_URL: data.SAMPLING_C1_BASE_URL ?? null,
  SAMPLING_C1_API_KEY: data.SAMPLING_C1_API_KEY ?? null,
  AUTOMATION_WEBHOOK_SECRET: data.AUTOMATION_WEBHOOK_SECRET ?? null,
  N8N_WEBHOOK_SECRET: data.N8N_WEBHOOK_SECRET ?? null,
  RAG_SERVICE_URL: data.RAG_SERVICE_URL ?? null,
  EMBEDDING_CRON_SECRET: data.EMBEDDING_CRON_SECRET ?? null,
  DATABASE_URL: data.DATABASE_URL ?? null,
  SKIP_HEALTHCHECK_DB: data.SKIP_HEALTHCHECK_DB,
  RECONCILIATION_MODE: data.RECONCILIATION_MODE,
  WEB_SENTRY_DSN: data.WEB_SENTRY_DSN ?? null,
  NEXT_PUBLIC_API_BASE: data.NEXT_PUBLIC_API_BASE ?? null,
  NEXT_PUBLIC_SUPABASE_URL: data.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_ACCOUNTING_MODE: data.NEXT_PUBLIC_ACCOUNTING_MODE,
  NEXT_PUBLIC_RECONCILIATION_MODE: data.NEXT_PUBLIC_RECONCILIATION_MODE,
  NEXT_PUBLIC_GROUP_AUDIT_MODE: data.NEXT_PUBLIC_GROUP_AUDIT_MODE,
  NEXT_PUBLIC_DEMO_ORG_ID: data.NEXT_PUBLIC_DEMO_ORG_ID ?? null,
  NEXT_PUBLIC_DEMO_ENGAGEMENT_ID: data.NEXT_PUBLIC_DEMO_ENGAGEMENT_ID ?? null,
  NEXT_PUBLIC_DEMO_USER_ID: data.NEXT_PUBLIC_DEMO_USER_ID ?? null,
  NEXT_PUBLIC_SENTRY_DSN: data.NEXT_PUBLIC_SENTRY_DSN ?? null,
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: data.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? null,
  NEXT_PUBLIC_SENTRY_RELEASE: data.NEXT_PUBLIC_SENTRY_RELEASE ?? null,
  NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: data.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? null,
} as const;

export const publicEnv = {
  NEXT_PUBLIC_API_BASE: env.NEXT_PUBLIC_API_BASE,
  NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_ACCOUNTING_MODE: env.NEXT_PUBLIC_ACCOUNTING_MODE,
  NEXT_PUBLIC_RECONCILIATION_MODE: env.NEXT_PUBLIC_RECONCILIATION_MODE,
  NEXT_PUBLIC_GROUP_AUDIT_MODE: env.NEXT_PUBLIC_GROUP_AUDIT_MODE,
  NEXT_PUBLIC_DEMO_ORG_ID: env.NEXT_PUBLIC_DEMO_ORG_ID,
  NEXT_PUBLIC_DEMO_ENGAGEMENT_ID: env.NEXT_PUBLIC_DEMO_ENGAGEMENT_ID,
  NEXT_PUBLIC_DEMO_USER_ID: env.NEXT_PUBLIC_DEMO_USER_ID,
  NEXT_PUBLIC_SENTRY_DSN: env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
  NEXT_PUBLIC_SENTRY_RELEASE: env.NEXT_PUBLIC_SENTRY_RELEASE,
  NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
} as const;

export type Env = typeof env;
export type PublicEnv = typeof publicEnv;
