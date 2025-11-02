import type { CacheSerializer } from './types.js'

export const jsonSerializer: CacheSerializer = {
  serialize(value: unknown): string {
    return JSON.stringify(value ?? null)
  },
  deserialize<T>(payload: string): T {
    return JSON.parse(payload) as T
  },
}

export function safeDeserialize<T>(serializer: CacheSerializer, payload: string): T | null {
  try {
    return serializer.deserialize<T>(payload)
  } catch {
    return null
  }
}

export function safeSerialize(serializer: CacheSerializer, value: unknown): string | null {
  try {
    return serializer.serialize(value)
  } catch {
    return null
  }
}
