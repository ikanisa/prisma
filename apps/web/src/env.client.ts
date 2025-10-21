import type { PublicEnv } from './env.server';

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
};

Object.freeze(clientEnv);
