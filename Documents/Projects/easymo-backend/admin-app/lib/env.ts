import { z } from "zod";

const EnvSchema = z.object({
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

let cachedEnv: {
  env: z.infer<typeof EnvSchema>;
  isSupabaseConfigured: boolean;
} | null = null;

export function getRuntimeEnv() {
  if (cachedEnv) return cachedEnv;
  const parsed = EnvSchema.safeParse({
    SUPABASE_URL: process.env.ADMIN_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.ADMIN_SUPABASE_SERVICE_ROLE_KEY,
  });

  const env = parsed.success ? parsed.data : { SUPABASE_URL: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined };
  const isSupabaseConfigured = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
  cachedEnv = { env, isSupabaseConfigured };
  return cachedEnv;
}
