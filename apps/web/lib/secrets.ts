/**
 * Server-side secret retrieval helpers.
 * In production, prefer vault-based retrieval (e.g., AWS Secrets Manager, HashiCorp Vault).
 * For local development, falls back to environment variables.
 */

let cachedServiceRoleKey: string | null = null;
let cachedJwtSecret: string | null = null;

/**
 * Retrieve Supabase service role key (SERVER-ONLY).
 * TODO: In production, integrate with a secrets vault instead of reading from env.
 */
export async function getSupabaseServiceRoleKey(): Promise<string> {
  if (cachedServiceRoleKey) return cachedServiceRoleKey;
  
  // TODO: Replace with vault retrieval in production
  // Example: cachedServiceRoleKey = await fetchFromVault('supabase/service-role-key');
  
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }
  cachedServiceRoleKey = key;
  return key;
}

/**
 * Retrieve Supabase JWT secret (SERVER-ONLY).
 * TODO: In production, integrate with a secrets vault instead of reading from env.
 */
export async function getSupabaseJwtSecret(): Promise<string> {
  if (cachedJwtSecret) return cachedJwtSecret;
  
  // TODO: Replace with vault retrieval in production
  // Example: cachedJwtSecret = await fetchFromVault('supabase/jwt-secret');
  
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error('SUPABASE_JWT_SECRET is not configured');
  }
  cachedJwtSecret = secret;
  return secret;
}

/**
 * Clear cached secrets (useful for testing or key rotation).
 */
export function clearSupabaseSecretCache() {
  cachedJwtSecret = null;
  cachedServiceRoleKey = null;
}
