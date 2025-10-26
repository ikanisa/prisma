import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VaultClient, VaultClientError } from '@prisma-glow/lib/secrets/vault-client';

describe('VaultClient', () => {
  const baseUrl = 'https://vault.prismaglow.example.com';
  const token = 'test-token';

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads secret data from the configured mount', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ data: { data: { key: 'value' } } }),
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    const client = new VaultClient({ baseUrl, token, mount: 'kv' });
    const result = await client.read('apps/service');

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/kv/data/apps/service`,
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Vault-Token': token }),
      }),
    );
    expect(result).toEqual({ key: 'value' });
  });

  it('throws when the vault response is not ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({}),
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    const client = new VaultClient({ baseUrl, token });
    await expect(client.read('missing/path')).rejects.toThrow(VaultClientError);
  });

  it('writes secret data to the configured mount', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      statusText: 'No Content',
      json: async () => ({}),
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    const client = new VaultClient({ baseUrl, token });
    await client.write('apps/service', { key: 'value' });

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/secret/data/apps/service`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Vault-Token': token,
        }),
        body: JSON.stringify({ data: { key: 'value' } }),
      }),
    );
  });
});
