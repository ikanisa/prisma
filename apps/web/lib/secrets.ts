/**
 * Server-side secret management utilities
 * 
 * ⚠️ SECURITY WARNING:
 * - This file must ONLY be imported in server-side code (API routes, server components)
 * - NEVER import this in client components or pages
 * - All functions throw if called in browser context
 */

let cachedServiceRoleKey: string | null = null;
let cachedJwtSecret: string | null = null;

/**
 * Get Supabase Service Role Key from environment or vault.
 * 
 * ⚠️ SERVER-ONLY: This function must never be called from client-side code.
 * The service role key grants full admin access to Supabase.
 * 
 * @returns Promise resolving to service role key
 * @throws Error if called in browser or key not configured
 */
export async function getSupabaseServiceRoleKey(): Promise<string> {
  // Runtime check: ensure we're not in a browser context
  if (typeof window !== 'undefined') {
    throw new Error(
      'SECURITY VIOLATION: getSupabaseServiceRoleKey() called in client-side code. ' +
      'This function must only be used in server-side code (API routes, server components).'
    );
  }

  if (cachedServiceRoleKey) return cachedServiceRoleKey;

  // Prefer vault-based retrieval (from packages/lib/src/secrets/supabase.js)
  // Falls back to environment variable for local development
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. ' +
      'Set in environment or configure vault-based secret retrieval.'
    );
  }

  cachedServiceRoleKey = key;
  return key;
}

/**
 * Get Supabase JWT Secret from environment or vault.
 * 
 * ⚠️ SERVER-ONLY: This function must never be called from client-side code.
 * The JWT secret is used to sign/verify authentication tokens.
 * 
 * @returns Promise resolving to JWT secret
 * @throws Error if called in browser or secret not configured
 */
export async function getSupabaseJwtSecret(): Promise<string> {
  // Runtime check: ensure we're not in a browser context
  if (typeof window !== 'undefined') {
    throw new Error(
      'SECURITY VIOLATION: getSupabaseJwtSecret() called in client-side code. ' +
      'This function must only be used in server-side code (API routes, server components).'
    );
  }

  if (cachedJwtSecret) return cachedJwtSecret;

  // Prefer vault-based retrieval (from packages/lib/src/secrets/supabase.js)
  // Falls back to environment variable for local development
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error(
      'SUPABASE_JWT_SECRET is not configured. ' +
      'Set in environment or configure vault-based secret retrieval.'
    );
  }

  cachedJwtSecret = secret;
  return secret;
}

/**
 * Clear cached secrets.
 * Useful for testing or when secrets are rotated.
 */
export function clearSupabaseSecretCache() {
  cachedJwtSecret = null;
  cachedServiceRoleKey = null;
}
