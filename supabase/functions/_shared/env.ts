import { supabaseClient } from "./client.ts";
/**
 * Secure Environment Variable Management
 * Centralized utility for safe environment variable access in edge functions
 */

import { logger } from './logger.ts';

// Required environment variables for easyMO WhatsApp + AI system
export const REQUIRED_ENV_VARS = [
  'WHATSAPP_PHONE_ID', // Maps to user's WHATSAPP_PHONE_ID
  'WHATSAPP_ACCESS_TOKEN', // Maps to user's WHATSAPP_ACCESS_TOKEN
  'OPENAI_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
] as const;

type RequiredEnvVar = typeof REQUIRED_ENV_VARS[number];

/**
 * Safely get environment variable with error handling
 */
export function getEnv(name: string): string {
  const value = Deno?.env?.get?.(name) ?? process?.env?.[name];
  
  if (!value) {
    const error = `[ENV ERROR] Missing required environment variable: ${name}`;
    logger.error(error, null, { envVar: name });
    throw new Error(error);
  }
  
  return value;
}

/**
 * Get environment variable with optional fallback
 */
export function getEnvOptional(name: string, fallback?: string): string | undefined {
  const value = Deno?.env?.get?.(name) ?? process?.env?.[name];
  return value || fallback;
}

/**
 * Mask sensitive values for logging (show only last 4 characters)
 */
export function maskEnvValue(value: string): string {
  if (value.length <= 4) {
    return '****';
  }
  return `****${value.slice(-4)}`;
}

/**
 * Validate all required environment variables are present
 */
export function validateRequiredEnvVars(): { isValid: boolean; missing: string[] } {
  const missing = REQUIRED_ENV_VARS.filter(varName => {
    try {
      getEnv(varName);
      return false;
    } catch {
      return true;
    }
  });
  
  const isValid = missing.length === 0;
  
  if (!isValid) {
    logger.error('Missing required environment variables', null, { 
      missing,
      total: REQUIRED_ENV_VARS.length 
    });
  } else {
    logger.info('All required environment variables validated', {
      total: REQUIRED_ENV_VARS.length
    });
  }
  
  return { isValid, missing };
}

/**
 * Get environment status for admin dashboard (safe - no values exposed)
 */
export function getEnvStatus(): Record<string, boolean> {
  const status: Record<string, boolean> = {};
  
  for (const varName of REQUIRED_ENV_VARS) {
    try {
      getEnv(varName);
      status[varName] = true;
    } catch {
      status[varName] = false;
    }
  }
  
  return status;
}

/**
 * WhatsApp-specific environment getters
 */
export const WhatsAppEnv = {
  getPhoneId: () => getEnv('WHATSAPP_PHONE_ID'),
  getToken: () => getEnv('WHATSAPP_ACCESS_TOKEN'),
};

/**
 * OpenAI-specific environment getters
 */
export const OpenAIEnv = {
  getApiKey: () => getEnv('OPENAI_API_KEY'),
};

/**
 * Supabase-specific environment getters
 */
export const SupabaseEnv = {
  getUrl: () => getEnv('SUPABASE_URL'),
  getServiceRoleKey: () => getEnv('SUPABASE_SERVICE_ROLE_KEY'),
};

/**
 * Log environment variable status safely (masked values)
 */
export function logEnvStatus(): void {
  for (const varName of REQUIRED_ENV_VARS) {
    try {
      const value = getEnv(varName);
      logger.info(`Loaded env: ${varName}: ${maskEnvValue(value)}`);
    } catch (error) {
      logger.error(`Failed to load env: ${varName}`, error);
    }
  }
}