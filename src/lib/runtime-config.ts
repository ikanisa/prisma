import { z } from 'zod';

type RawEnv = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  apiBaseUrl?: string;
  trackingEnabled?: string;
  enableDemoLogin?: string;
  demoOrgId?: string;
  demoEngagementId?: string;
  demoUserId?: string;
};

const DEMO_SUPABASE_URL = 'https://demo.invalid.supabase.co';
const DEMO_SUPABASE_ANON_KEY = 'public-anon-demo-key';

const normalise = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parseBoolean = (value?: string) => {
  if (!value) return false;
  const normalised = value.trim().toLowerCase();
  return normalised === 'true' || normalised === '1' || normalised === 'yes' || normalised === 'on';
};

const runtimeConfigSchema = z.object({
  supabaseUrl: z.string().url().optional(),
  supabaseAnonKey: z.string().min(1).optional(),
  apiBaseUrl: z.string().url().optional(),
  trackingEnabled: z.boolean(),
  enableDemoLogin: z.boolean(),
  demoOrgId: z.string().min(1).optional(),
  demoEngagementId: z.string().min(1).optional(),
  demoUserId: z.string().min(1).optional(),
});

const rawEnv: RawEnv = {
  supabaseUrl: normalise(import.meta.env.VITE_SUPABASE_URL),
  supabaseAnonKey: normalise(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
  apiBaseUrl: normalise(import.meta.env.VITE_API_BASE_URL),
  trackingEnabled: import.meta.env.VITE_TRACKING_ENABLED,
  enableDemoLogin: import.meta.env.VITE_ENABLE_DEMO_LOGIN,
  demoOrgId: normalise(import.meta.env.VITE_DEMO_ORG_ID),
  demoEngagementId: normalise(import.meta.env.VITE_DEMO_ENGAGEMENT_ID),
  demoUserId: normalise(import.meta.env.VITE_DEMO_USER_ID),
};

const parsed = runtimeConfigSchema.safeParse({
  supabaseUrl: rawEnv.supabaseUrl,
  supabaseAnonKey: rawEnv.supabaseAnonKey,
  apiBaseUrl: rawEnv.apiBaseUrl,
  trackingEnabled: parseBoolean(rawEnv.trackingEnabled),
  enableDemoLogin: parseBoolean(rawEnv.enableDemoLogin),
  demoOrgId: rawEnv.demoOrgId,
  demoEngagementId: rawEnv.demoEngagementId,
  demoUserId: rawEnv.demoUserId,
});

if (!parsed.success) {
  console.error('runtime-config: invalid environment variables', parsed.error.flatten());
  throw new Error('Runtime configuration validation failed');
}

export const runtimeConfig = {
  ...parsed.data,
  supabaseDemoUrl: DEMO_SUPABASE_URL,
  supabaseDemoAnonKey: DEMO_SUPABASE_ANON_KEY,
  supabaseFunctionsPath: 'functions/v1',
};

export const isSupabaseRuntimeConfigured = Boolean(
  runtimeConfig.supabaseUrl && runtimeConfig.supabaseAnonKey,
);

export const resolvedSupabaseUrl = runtimeConfig.supabaseUrl ?? runtimeConfig.supabaseDemoUrl;
export const resolvedSupabaseAnonKey = runtimeConfig.supabaseAnonKey ?? runtimeConfig.supabaseDemoAnonKey;
