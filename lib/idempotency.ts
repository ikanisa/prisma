import crypto from 'crypto'

const seen = new Set<string>()

export function hashEvent(payload: unknown): string {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload)
  return crypto.createHash('sha256').update(body).digest('hex')
}

export async function seenBefore(hash: string): Promise<boolean> {
  if (seen.has(hash)) return true
  seen.add(hash)
  return false
}

export function _clearSeen() {
  seen.clear()
}

