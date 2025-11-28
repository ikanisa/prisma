/**
 * Environment variables with type safety
 */

export const env = {
  VITE_API_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  VITE_GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY || '',
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
} as const;
