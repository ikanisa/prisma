import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseStub } from '@prisma-glow/lib/supabase/stub'
import { readEnv, isPlaceholder } from '../env.js'
import type { Database } from './types.js'

const warn = (message: string, context?: Record<string, unknown>) => {
  if (typeof console !== 'undefined') {
    console.warn(`[platform] ${message}`, context ?? {})
  }
}

const readBooleanEnv = (key: string) => {
  const value = readEnv(key)
  return typeof value === 'string' ? value.toLowerCase() === 'true' : false
}

const envSupabaseUrl = readEnv('VITE_SUPABASE_URL') ?? readEnv('NEXT_PUBLIC_SUPABASE_URL') ?? readEnv('SUPABASE_URL')
const envSupabaseAnonKey =
  readEnv('VITE_SUPABASE_PUBLISHABLE_KEY') ?? readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ?? readEnv('SUPABASE_ANON_KEY')
const allowStub =
  readBooleanEnv('SUPABASE_ALLOW_STUB') || readBooleanEnv('VITE_SUPABASE_ALLOW_STUB') || readBooleanEnv('NEXT_PUBLIC_SUPABASE_ALLOW_STUB')

const configured = !isPlaceholder(envSupabaseUrl) && !isPlaceholder(envSupabaseAnonKey)

const SUPABASE_URL = configured && envSupabaseUrl ? envSupabaseUrl : ''
const SUPABASE_ANON_KEY = configured && envSupabaseAnonKey ? envSupabaseAnonKey : ''

export const isSupabaseConfigured = configured

let cachedClient: SupabaseClient<Database> | null = null

function createBrowserClient(): SupabaseClient<Database> {
  if (!configured) {
    if (!allowStub) {
      throw new Error(
        'Supabase environment variables are not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY before building.',
      )
    }
    warn('Supabase environment variables missing, returning stub client.')
    return createSupabaseStub() as SupabaseClient<Database>
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}

export function getBrowserSupabaseClient(): SupabaseClient<Database> {
  if (!cachedClient) {
    cachedClient = createBrowserClient()
  }
  return cachedClient
}
