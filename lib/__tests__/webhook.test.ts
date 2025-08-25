import { describe, it, expect, beforeEach } from 'vitest'
import crypto from 'crypto'
import { verifySignature } from '../verifySignature'
import { hashEvent, seenBefore, _clearSeen } from '../idempotency'

const secret = 'topsecret'
const payloadObj = { foo: 'bar' }
const payload = JSON.stringify(payloadObj)

beforeEach(() => {
  _clearSeen()
})

describe('verifySignature', () => {
  it('validates HMAC-SHA256 signatures', () => {
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    const headers = { 'x-signature': sig }
    expect(verifySignature(payload, headers, secret)).toBe(true)
  })

  it('falls back to token authentication', () => {
    const headers = { 'x-webhook-token': secret }
    expect(verifySignature(payload, headers, secret)).toBe(true)
  })

  it('rejects invalid signatures', () => {
    const sig = crypto.createHmac('sha256', 'wrong').update(payload).digest('hex')
    const headers = { 'x-signature': sig }
    expect(verifySignature(payload, headers, secret)).toBe(false)
  })
})

describe('idempotency', () => {
  it('detects duplicate events', async () => {
    const hash = hashEvent(payload)
    const first = await seenBefore(hash)
    const second = await seenBefore(hash)
    expect(first).toBe(false)
    expect(second).toBe(true)
  })
})

// Webhook handler integration tests would go here. The core utilities are
// tested directly above.

