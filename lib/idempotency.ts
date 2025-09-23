import crypto from 'crypto'
import { createClient, type SupabaseClient, type PostgrestError } from '@supabase/supabase-js'

import type { Database } from '../src/integrations/supabase/types'

type StoreResult = 'new' | 'duplicate'

export interface IdempotencyStore {
  checkAndStore(hash: string): Promise<StoreResult>
  clear?: () => void | Promise<void>
}

let activeStore: IdempotencyStore | null = null

function hasSupabaseCredentials(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

let supabaseClient: SupabaseClient<Database> | null = null

function getSupabaseClient(): SupabaseClient<Database> {
  if (supabaseClient) {
    return supabaseClient
  }

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase credentials are required to persist webhook idempotency state.')
  }

  supabaseClient = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  })

  return supabaseClient
}

class SupabaseIdempotencyStore implements IdempotencyStore {
  private client: SupabaseClient<Database>

  constructor() {
    this.client = getSupabaseClient()
  }

  async checkAndStore(hash: string): Promise<StoreResult> {
    const { error } = await this.client.from('webhook_events').insert({ hash }).select('id').single()

    if (!error) {
      return 'new'
    }

    if (this.isUniqueViolation(error)) {
      return 'duplicate'
    }

    throw new Error(`Failed to persist webhook idempotency state: ${error.message}`)
  }

  private isUniqueViolation(error: PostgrestError): boolean {
    return error.code === '23505'
  }
}

class MemoryIdempotencyStore implements IdempotencyStore {
  private readonly seen = new Set<string>()

  async checkAndStore(hash: string): Promise<StoreResult> {
    if (this.seen.has(hash)) {
      return 'duplicate'
    }
    this.seen.add(hash)
    return 'new'
  }

  clear() {
    this.seen.clear()
  }
}

function createDefaultStore(): IdempotencyStore {
  if (hasSupabaseCredentials()) {
    return new SupabaseIdempotencyStore()
  }
  return new MemoryIdempotencyStore()
}

export function configureIdempotencyStore(store: IdempotencyStore | null): void {
  activeStore = store
}

export function resetIdempotencyStore(): void {
  activeStore = null
}

function getStore(): IdempotencyStore {
  if (!activeStore) {
    activeStore = createDefaultStore()
  }
  return activeStore
}

export function createInMemoryIdempotencyStore(): IdempotencyStore {
  return new MemoryIdempotencyStore()
}

export function hashEvent(payload: unknown): string {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload)
  return crypto.createHash('sha256').update(body).digest('hex')
}

export async function seenBefore(hash: string): Promise<boolean> {
  const store = getStore()
  const result = await store.checkAndStore(hash)
  return result === 'duplicate'
}

