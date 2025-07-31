// SECURITY FIX: More restrictive CORS configuration
export const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('CORS_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

// SECURITY: Environment validation utility
export function validateRequiredEnvVars(requiredKeys: string[]): void {
  const missing = requiredKeys.filter(key => !Deno.env.get(key));
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}