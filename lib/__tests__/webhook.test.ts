import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import crypto from 'crypto'
import { verifySignature } from '../verifySignature'
import {
  hashEvent,
  seenBefore,
  configureIdempotencyStore,
  createInMemoryIdempotencyStore,
  resetIdempotencyStore,
  type IdempotencyStore,
} from '../idempotency'
import { handleWebhook } from '../webhook'

const secret = 'topsecret'
const payloadObj = { foo: 'bar' }
const payload = JSON.stringify(payloadObj)

let memoryStore: IdempotencyStore

function buildRequest(): Request {
  return new Request('https://example.com/webhook', {
    method: 'POST',
    body: payload,
    headers: { 'x-webhook-token': secret },
  })
}

beforeEach(() => {
  memoryStore = createInMemoryIdempotencyStore()
  configureIdempotencyStore(memoryStore)
})

afterEach(() => {
  memoryStore.clear?.()
  resetIdempotencyStore()
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

describe('handleWebhook', () => {
  it('processes the payload when signature is valid', async () => {
    const request = buildRequest()

    expect(request.headers.get('x-webhook-token')).toBe(secret)
    expect(typeof (request.headers as Headers).get).toBe('function')
    expect(verifySignature(payload, request.headers, secret)).toBe(true)

    const response = await handleWebhook(request, secret, async (body) => new Response(body, { status: 200 }))

    expect(response.status).toBe(200)
    expect(await response.text()).toEqual(payload)
  })

  it('returns 202 for duplicate deliveries', async () => {
    const firstRequest = buildRequest()
    const secondRequest = buildRequest()

    expect(firstRequest.headers.get('x-webhook-token')).toBe(secret)
    expect(secondRequest.headers.get('x-webhook-token')).toBe(secret)
    expect(typeof (firstRequest.headers as Headers).get).toBe('function')
    expect(typeof (secondRequest.headers as Headers).get).toBe('function')
    expect(verifySignature(payload, firstRequest.headers, secret)).toBe(true)
    expect(verifySignature(payload, secondRequest.headers, secret)).toBe(true)

    const first = await handleWebhook(firstRequest, secret, async () => new Response('ok', { status: 200 }))
    const second = await handleWebhook(secondRequest, secret, async () => new Response('should not run', { status: 200 }))

    expect(first.status).toBe(200)
    expect(second.status).toBe(202)
    expect(await second.text()).toBe('Duplicate event')
  })
})

