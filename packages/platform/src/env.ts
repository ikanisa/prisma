const isObject = (value: unknown): value is Record<string, any> => typeof value === 'object' && value !== null

export function readEnv(key: string): string | undefined {
  if (typeof process !== 'undefined' && typeof process.env?.[key] === 'string' && process.env[key]) {
    return process.env[key]
  }
  try {
    const meta = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {}
    const value = meta?.[key]
    if (typeof value === 'string' && value.length > 0) {
      return value
    }
  } catch {
    // ignore
  }
  if (typeof globalThis === 'object') {
    const maybeEnv = (globalThis as any).__ENV__
    if (isObject(maybeEnv) && typeof maybeEnv[key] === 'string') {
      return maybeEnv[key]
    }
  }
  return undefined
}

export function isPlaceholder(value?: string | null) {
  return !value || value.startsWith('REPLACE_WITH_') || value.includes('your_project_id')
}
