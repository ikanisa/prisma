/**
 * Environment validation for production deployments
 * Ensures all required environment variables are present
 */

interface EnvConfig {
  // Supabase
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY: string;
  SUPABASE_JWT_SECRET: string;
  
  // AI APIs
  OPENAI_API_KEY: string;
  GEMINI_API_KEY: string;
  
  // RAG Service
  RAG_SERVICE_URL: string;
  
  // Gateway
  PORT?: string;
  NODE_ENV?: string;
  GATEWAY_ALLOWED_ORIGINS?: string;
}

const REQUIRED_VARS: (keyof EnvConfig)[] = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_KEY',
  'SUPABASE_JWT_SECRET',
  'OPENAI_API_KEY',
  'GEMINI_API_KEY',
  'RAG_SERVICE_URL',
];

const REQUIRED_IN_PRODUCTION: (keyof EnvConfig)[] = [
  'GATEWAY_ALLOWED_ORIGINS',
];

export function validateEnv(): EnvConfig {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';

  // Check required variables
  for (const varName of REQUIRED_VARS) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }

  // Check production-only required variables
  if (isProduction) {
    for (const varName of REQUIRED_IN_PRODUCTION) {
      if (!process.env[varName]) {
        errors.push(`Missing required environment variable in production: ${varName}`);
      }
    }
  }

  // Validate URLs
  if (process.env.SUPABASE_URL && !isValidUrl(process.env.SUPABASE_URL)) {
    errors.push('SUPABASE_URL is not a valid URL');
  }

  if (process.env.RAG_SERVICE_URL && !isValidUrl(process.env.RAG_SERVICE_URL)) {
    warnings.push('RAG_SERVICE_URL is not a valid URL');
  }

  // Validate API keys (basic check)
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length < 20) {
    warnings.push('OPENAI_API_KEY appears to be invalid (too short)');
  }

  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length < 20) {
    warnings.push('GEMINI_API_KEY appears to be invalid (too short)');
  }

  // Log warnings
  if (warnings.length > 0) {
    console.warn('⚠️  Environment warnings:');
    warnings.forEach(w => console.warn(`   - ${w}`));
  }

  // Throw if any errors
  if (errors.length > 0) {
    console.error('❌ Environment validation failed:');
    errors.forEach(e => console.error(`   - ${e}`));
    throw new Error('Environment validation failed. Please check required environment variables.');
  }

  console.log('✅ Environment validation passed');

  return process.env as EnvConfig;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get safe environment config for logging (no secrets)
 */
export function getSafeEnvConfig() {
  return {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    SUPABASE_URL: process.env.SUPABASE_URL,
    RAG_SERVICE_URL: process.env.RAG_SERVICE_URL,
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
    ALLOWED_ORIGINS: process.env.GATEWAY_ALLOWED_ORIGINS?.split(',').length || 0,
  };
}
