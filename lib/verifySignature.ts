import crypto from 'crypto'

function getHeader(headers: Headers | Record<string, string | undefined>, name: string): string | undefined {
  if (headers instanceof Headers) {
    return headers.get(name.toLowerCase()) ?? headers.get(name) ?? undefined
  }
  const key = Object.keys(headers).find(k => k.toLowerCase() === name.toLowerCase())
  return key ? headers[key] : undefined
}

export function verifySignature(payload: string, headers: Headers | Record<string, string | undefined>, secret: string): boolean {
  const signature = getHeader(headers, 'x-signature') || getHeader(headers, 'x-webhook-signature')
  if (signature) {
    const digest = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
    } catch {
      return false
    }
  }

  const tokenHeader = getHeader(headers, 'x-webhook-token') || getHeader(headers, 'authorization')
  if (!tokenHeader) return false
  const token = tokenHeader.startsWith('Bearer ') ? tokenHeader.slice(7) : tokenHeader
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(secret))
  } catch {
    return false
  }
}

