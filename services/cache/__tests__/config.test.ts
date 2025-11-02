import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

describe('cache config', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test('falls back to default ttl when override missing', async () => {
    process.env.CACHE_DEFAULT_TTL_SECONDS = '45';
    const { cacheConfig, getCachePolicy } = await import('../src/config.js');
    expect(cacheConfig.defaultTtlSeconds).toBe(45);
    expect(getCachePolicy('controls').ttlSeconds).toBe(45);
  });

  test('uses per-use-case override when provided', async () => {
    process.env.CACHE_DEFAULT_TTL_SECONDS = '120';
    process.env.CACHE_CONTROLS_TTL_SECONDS = '10';
    const { getCachePolicy } = await import('../src/config.js');
    expect(getCachePolicy('controls').ttlSeconds).toBe(10);
    expect(getCachePolicy('specialists').ttlSeconds).toBe(120);
  });
});
