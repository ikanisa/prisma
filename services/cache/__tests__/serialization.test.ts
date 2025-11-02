import { describe, expect, it } from 'vitest'
import { jsonSerializer, safeDeserialize, safeSerialize } from '../src/serialization.js'

describe('serialization helpers', () => {
  it('round-trips objects using jsonSerializer', () => {
    const payload = { foo: 'bar', count: 3, nested: { value: true } }
    const encoded = jsonSerializer.serialize(payload)
    expect(encoded).toBeTypeOf('string')
    const decoded = jsonSerializer.deserialize<typeof payload>(encoded)
    expect(decoded).toEqual(payload)
  })

  it('returns null when safeDeserialize encounters invalid JSON', () => {
    const result = safeDeserialize(jsonSerializer, '{invalid')
    expect(result).toBeNull()
  })

  it('returns null when safeSerialize throws', () => {
    const cyclic: Record<string, unknown> = {}
    cyclic.self = cyclic
    const result = safeSerialize(jsonSerializer, cyclic)
    expect(result).toBeNull()
  })
})
