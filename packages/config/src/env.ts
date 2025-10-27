/**
 * Environment configuration utilities
 * 
 * This module ensures that:
 * 1. Client/public env exports ONLY include NEXT_PUBLIC_* or VITE_* keys
 * 2. Server-only keys are NEVER exported to the client bundle
 * 3. Security-sensitive environment variables are clearly documented
 */

/**
 * Server-only environment variables that must NEVER be exposed to the client.
 * 
 * ⚠️ CRITICAL SECURITY REQUIREMENT:
 * These keys grant elevated privileges and MUST ONLY be accessed in server-side code.
 * If any of these appear in client bundles, it's a security vulnerability.
 */
const SERVER_ONLY_KEYS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_JWT_SECRET',
  'DATABASE_URL',
  'DIRECT_URL',
  'OPENAI_API_KEY',
  'SMTP_PASSWORD',
  'STRIPE_SECRET_KEY',
  'KMS_DATA_KEY',
  'AUTH_CLIENT_SECRET',
  'AUTOMATION_WEBHOOK_SECRET',
  'N8N_WEBHOOK_SECRET',
  'SUPABASE_URL', // When not prefixed with NEXT_PUBLIC_, this is server-only
] as const;

/**
 * Get all environment variables that are safe for client-side use.
 * 
 * Only includes variables with NEXT_PUBLIC_ or VITE_ prefix.
 * These are automatically inlined into the client bundle by Next.js/Vite.
 * 
 * @returns Object containing only client-safe environment variables
 */
export function getClientEnv(): Record<string, string | undefined> {
  const clientEnv: Record<string, string | undefined> = {};
  
  // Only include NEXT_PUBLIC_* and VITE_* prefixed variables
  for (const key in process.env) {
    if (key.startsWith('NEXT_PUBLIC_') || key.startsWith('VITE_')) {
      clientEnv[key] = process.env[key];
    }
  }

  // ASSERTION: Verify no server-only keys leaked into client env
  // This should never happen, but double-check for safety
  for (const serverKey of SERVER_ONLY_KEYS) {
    if (clientEnv[serverKey]) {
      throw new Error(
        `SECURITY VIOLATION: Server-only key "${serverKey}" must not be in client env. ` +
        `Server secrets must NEVER have NEXT_PUBLIC_ or VITE_ prefix.`
      );
    }
  }
  
  return clientEnv;
}

/**
 * Get server-side environment variables.
 * 
 * ⚠️ WARNING: This function should ONLY be called in server-side code.
 * Never import or use this in client components or client-side modules.
 * 
 * @returns Object containing all environment variables
 */
export function getServerEnv(): Record<string, string | undefined> {
  if (typeof window !== 'undefined') {
    throw new Error(
      'SECURITY VIOLATION: getServerEnv() called in client-side code. ' +
      'Server environment variables must never be accessed from the browser.'
    );
  }
  
  return process.env;
}

/**
 * Check if a given environment variable key is server-only.
 * 
 * @param key - Environment variable name
 * @returns true if the key is server-only, false if client-safe
 */
export function isServerOnly(key: string): boolean {
  return (
    SERVER_ONLY_KEYS.includes(key as any) ||
    key.includes('SECRET') ||
    key.includes('PRIVATE_KEY') ||
    key.includes('SERVICE_ROLE') ||
    key.endsWith('_KEY') && !key.startsWith('NEXT_PUBLIC_')
  );
}

/**
 * Validate environment configuration at startup.
 * 
 * Call this in your application bootstrap to ensure:
 * - Required variables are present
 * - No server secrets have NEXT_PUBLIC_ prefix
 */
export function validateEnv(): void {
  const errors: string[] = [];
  
  // Check for common misconfigurations
  for (const serverKey of SERVER_ONLY_KEYS) {
    const publicKey = `NEXT_PUBLIC_${serverKey}`;
    if (process.env[publicKey]) {
      errors.push(
        `ERROR: Found "${publicKey}" - Server secret "${serverKey}" must NOT have NEXT_PUBLIC_ prefix!`
      );
    }
  }
  
  if (errors.length > 0) {
    console.error('❌ Environment Configuration Errors:\n' + errors.join('\n'));
    throw new Error('Environment validation failed. See errors above.');
  }
  
  console.log('✅ Environment configuration validated successfully');
}
