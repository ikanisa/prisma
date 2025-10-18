import crypto from 'crypto'
import { createClient, type SupabaseClient, type PostgrestError } from '@supabase/supabase-js'
import { getSupabaseServiceRoleKey, isSupabaseVaultBacked } from './secrets'
import { createSupabaseStub } from '../apps/web/lib/supabase/stub'

type StoreResult = 'new' | 'duplicate'

export interface IdempotencyStore {
  checkAndStore(hash: string): Promise<StoreResult>
  clear?: () => void | Promise<void>
}

let activeStore: IdempotencyStore | null = null

function hasSupabaseCredentials(): boolean {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    return false
  }
  if (isSupabaseVaultBacked()) {
    return true
  }
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
}

let supabaseClientPromise: Promise<SupabaseClient> | null = null
const SUPABASE_ALLOW_STUB = process.env.SUPABASE_ALLOW_STUB === 'true'

async function getSupabaseClient(): Promise<SupabaseClient> {
  if (supabaseClientPromise) {
    return supabaseClientPromise
  }

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    if (!SUPABASE_ALLOW_STUB) {
      throw new Error('Supabase URL is required to persist webhook idempotency state.')
    }
    return createSupabaseStub()
  }

  const pending = (async () => {
    try {
      const serviceRoleKey = await getSupabaseServiceRoleKey()
      return createClient(url, serviceRoleKey, {
        auth: { persistSession: false },
      })
    } catch (error) {
      if (!SUPABASE_ALLOW_STUB) {
        throw error
      }
      return createSupabaseStub()
    }
  })()

  supabaseClientPromise = pending

  try {
    return await pending
  } catch (error) {
    supabaseClientPromise = null
    throw error
  }
}

class SupabaseIdempotencyStore implements IdempotencyStore {
  private readonly clientPromise: Promise<SupabaseClient>

  constructor() {
    this.clientPromise = getSupabaseClient()
  }

  async checkAndStore(hash: string): Promise<StoreResult> {
    const client = await this.clientPromise
    const { error } = await client.from('webhook_events').insert({ hash }).select('id').single()

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
