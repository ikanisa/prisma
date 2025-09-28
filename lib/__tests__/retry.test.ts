import { describe, it, expect } from 'vitest'
import { retry } from '../retry'

describe('retry', () => {
  it('retries until success', async () => {
    let attempts = 0
    const result = await retry(async () => {
      attempts++
      if (attempts < 3) throw new Error('fail')
      return 'ok'
    }, { retries: 5, minTimeout: 1 })
    expect(result).toBe('ok')
    expect(attempts).toBe(3)
  })
})
