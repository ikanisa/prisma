let cachedServiceRoleKey: string | null = null;
let cachedJwtSecret: string | null = null;

export async function getSupabaseServiceRoleKey(): Promise<string> {
  if (cachedServiceRoleKey) return cachedServiceRoleKey;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }
  cachedServiceRoleKey = key;
  return key;
}

export async function getSupabaseJwtSecret(): Promise<string> {
  if (cachedJwtSecret) return cachedJwtSecret;
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error('SUPABASE_JWT_SECRET is not configured');
  }
  cachedJwtSecret = secret;
  return secret;
}

export function clearSupabaseSecretCache() {
  cachedJwtSecret = null;
  cachedServiceRoleKey = null;
}
