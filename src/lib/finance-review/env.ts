/**
 * Finance Review System - Environment Configuration
 * 
 * Centralized environment variable access for the CFO + Auditor
 * review loop. All secrets are loaded from environment variables
 * and never hard-coded.
 * 
 * @module finance-review/env
 */

/**
 * Required environment variables for finance review system
 */
export interface FinanceReviewEnv {
  /** Supabase project URL */
  SUPABASE_URL: string;
  /** Supabase anon/publishable key (RLS-enabled) */
  SUPABASE_ANON_KEY: string;
  /** Supabase service role key (bypasses RLS, server-side only) */
  SUPABASE_SERVICE_ROLE_KEY: string;
  /** OpenAI API key */
  OPENAI_API_KEY: string;
  /** OpenAI embedding model */
  EMBEDDING_MODEL: string;
  /** OpenAI chat model */
  CHAT_MODEL: string;
  /** Default organization ID for testing/dev */
  DEFAULT_ORG_ID: string;
}

/**
 * Validated and typed environment configuration
 * Throws error if required variables are missing
 */
export const financeReviewEnv: FinanceReviewEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
  CHAT_MODEL: process.env.CHAT_MODEL || 'gpt-4o-mini',
  DEFAULT_ORG_ID: process.env.DEFAULT_ORG_ID || '00000000-0000-0000-0000-000000000000',
};

/**
 * Validate that all required environment variables are present
 * @throws {Error} if any required variable is missing
 */
export function validateFinanceReviewEnv(): void {
  const missing: string[] = [];

  if (!financeReviewEnv.SUPABASE_URL) {
    missing.push('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!financeReviewEnv.SUPABASE_ANON_KEY) {
    missing.push('SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  if (!financeReviewEnv.SUPABASE_SERVICE_ROLE_KEY) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY');
  }
  if (!financeReviewEnv.OPENAI_API_KEY) {
    missing.push('OPENAI_API_KEY');
  }

  if (missing.length > 0) {
    throw new Error(
      `Finance Review System: Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

/**
 * Check if finance review system is configured
 * @returns true if all required variables are present
 */
export function isFinanceReviewConfigured(): boolean {
  try {
    validateFinanceReviewEnv();
    return true;
  } catch {
    return false;
  }
}
