import { hashEvent, seenBefore } from './idempotency'
import { verifySignature } from './verifySignature'

export async function handleWebhook(req: Request, secret: string, handler: (payload: string) => Promise<Response>): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }
  const payload = await req.text()
  if (!verifySignature(payload, req.headers, secret)) {
    return new Response('Invalid signature', { status: 401 })
  }
  const hash = hashEvent(payload)
  if (await seenBefore(hash)) {
    return new Response('Duplicate event', { status: 202 })
  }
  return handler(payload)
}

