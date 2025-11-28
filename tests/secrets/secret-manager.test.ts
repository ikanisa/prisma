import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SecretManager } from '@prisma-glow/lib/secrets/secret-manager';

const baseUrl = 'https://vault.prismaglow.example.com';
const token = 'test-token';

function mockFetchOnce(payload: Record<string, unknown>) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ data: { data: payload } }),
  } as unknown as Response);
}

describe('SecretManager', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns secrets from vault and caches them', async () => {
    const fetchMock = mockFetchOnce({ service_role_key: 'vault-secret' });
    vi.stubGlobal('fetch', fetchMock);

    const manager = new SecretManager({ baseUrl, token });
    const descriptor = { vaultPath: 'apps/service', field: 'service_role_key', required: true } as const;

    const first = await manager.getSecret(descriptor);
    const second = await manager.getSecret(descriptor);

    expect(first).toBe('vault-secret');
    expect(second).toBe('vault-secret');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to env when vault is unavailable', async () => {
    const originalEnv = process.env.VAULT_ADDR;
    process.env.VAULT_ADDR = '';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'env-secret';

    const manager = new SecretManager(null);
    const descriptor = {
      vaultPath: 'apps/service',
      field: 'service_role_key',
      envFallback: 'SUPABASE_SERVICE_ROLE_KEY',
    } as const;

    const value = await manager.getSecret(descriptor);
    expect(value).toBe('env-secret');

    if (originalEnv !== undefined) {
      process.env.VAULT_ADDR = originalEnv;
    }
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('throws when secret required but missing', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ data: { data: {} } }),
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    const manager = new SecretManager({ baseUrl, token });
    const descriptor = { vaultPath: 'apps/service', field: 'service_role_key', required: true } as const;

    await expect(manager.getSecret(descriptor)).rejects.toThrowError();
  });

  it('persists secrets back to vault', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
        statusText: 'No Content',
        json: async () => ({}),
      } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    const manager = new SecretManager({ baseUrl, token });
    const descriptor = { vaultPath: 'apps/service', field: 'service_role_key' } as const;
    await manager.setSecret(descriptor, 'new-secret');

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/secret/data/apps/service`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ data: { service_role_key: 'new-secret' } }),
      }),
    );
  });
});
