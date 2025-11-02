import { describe, expect, test, vi } from 'vitest';
import type Redis from 'ioredis';
import { RedisCacheClient } from '../src/redis-adapter.js';

const createRedisMock = () => {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    ttl: vi.fn().mockResolvedValue(-2),
    quit: vi.fn().mockResolvedValue('OK'),
  } as unknown as Redis;
};

describe('RedisCacheClient', () => {
  test('prefixes keys and writes ttl', async () => {
    const redis = createRedisMock();
    const client = new RedisCacheClient({ client: redis, keyPrefix: 'app' });

    await client.set('controls:1', 'value', { ttlSeconds: 30 });
    expect(redis.set).toHaveBeenCalledWith('app:controls:1', 'value', 'EX', 30);

    await client.get('controls:1');
    expect(redis.get).toHaveBeenCalledWith('app:controls:1');

    await client.del('controls:1');
    expect(redis.del).toHaveBeenCalledWith('app:controls:1');
  });

  test('ttl returns null when redis indicates missing key', async () => {
    const redis = createRedisMock();
    const client = new RedisCacheClient({ client: redis, keyPrefix: 'app' });

    redis.ttl = vi.fn().mockResolvedValue(-2);
    await expect(client.ttl('missing')).resolves.toBeNull();

    redis.ttl = vi.fn().mockResolvedValue(-1);
    await expect(client.ttl('no-expiry')).resolves.toBeNull();

    redis.ttl = vi.fn().mockResolvedValue(15);
    await expect(client.ttl('exists')).resolves.toBe(15);
  });
});
