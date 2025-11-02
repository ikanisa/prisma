import type { PublicEnv } from './env.server';

// Read env values at build-time for client code. This file must only surface
// NEXT_PUBLIC_* variables. DO NOT export server-only secrets like
// SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET, OPENAI_API_KEY, DATABASE_URL, etc.

const read = (key: string): string | null => {
  const value = process.env[key as keyof NodeJS.ProcessEnv];
  if (value === undefined || value === '') return null;
  return value;
};

export const clientEnv: PublicEnv = {
  NEXT_PUBLIC_API_BASE: read('NEXT_PUBLIC_API_BASE'),
  NEXT_PUBLIC_SUPABASE_URL: read('NEXT_PUBLIC_SUPABASE_URL')!,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: read('NEXT_PUBLIC_SUPABASE_ANON_KEY')!,
  NEXT_PUBLIC_ACCOUNTING_MODE: (read('NEXT_PUBLIC_ACCOUNTING_MODE') ?? 'close') as PublicEnv['NEXT_PUBLIC_ACCOUNTING_MODE'],
  NEXT_PUBLIC_RECONCILIATION_MODE: (read('NEXT_PUBLIC_RECONCILIATION_MODE') ?? 'db') as PublicEnv['NEXT_PUBLIC_RECONCILIATION_MODE'],
  NEXT_PUBLIC_GROUP_AUDIT_MODE: (read('NEXT_PUBLIC_GROUP_AUDIT_MODE') ?? 'workspace') as PublicEnv['NEXT_PUBLIC_GROUP_AUDIT_MODE'],
  NEXT_PUBLIC_DEMO_ORG_ID: read('NEXT_PUBLIC_DEMO_ORG_ID'),
  NEXT_PUBLIC_DEMO_ENGAGEMENT_ID: read('NEXT_PUBLIC_DEMO_ENGAGEMENT_ID'),
  NEXT_PUBLIC_DEMO_USER_ID: read('NEXT_PUBLIC_DEMO_USER_ID'),
  NEXT_PUBLIC_SENTRY_DSN: read('NEXT_PUBLIC_SENTRY_DSN'),
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: read('NEXT_PUBLIC_SENTRY_ENVIRONMENT'),
  NEXT_PUBLIC_SENTRY_RELEASE: read('NEXT_PUBLIC_SENTRY_RELEASE'),
  NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: read('NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE'),
};

Object.freeze(clientEnv);

// Runtime safeguard: warn in development if server-only env keys are present on the client.
// This helps catch accidental leaks during local development.
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  try {
    const runtimeWindow = window as unknown as Record<string, unknown>;
    const leaked = ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_JWT_SECRET', 'OPENAI_API_KEY', 'DATABASE_URL'].filter(
      (key) => runtimeWindow[key] !== undefined,
    );
    if (leaked.length) {
      // eslint-disable-next-line no-console
      console.warn('Detected server-only env keys present in client bundle:', leaked);
    }
  } catch {
    // ignore
  }
}
