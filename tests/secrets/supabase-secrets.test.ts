import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSupabaseSecretCache,
  getSupabaseJwtSecret,
  getSupabaseServiceRoleKey,
  resetSupabaseSecretManager,
} from '../../lib/secrets/supabase';

const baseUrl = 'https://vault.example.com';
const token = 'test-token';

function stubVault(payload: Record<string, unknown>) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ data: { data: payload } }),
  } as unknown as Response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('Supabase secrets', () => {
  beforeEach(() => {
    process.env.VAULT_ADDR = baseUrl;
    process.env.VAULT_TOKEN = token;
    resetSupabaseSecretManager();
    clearSupabaseSecretCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearSupabaseSecretCache();
    resetSupabaseSecretManager();
    delete process.env.VAULT_ADDR;
    delete process.env.VAULT_TOKEN;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_JWT_SECRET;
  });

  it('loads Supabase service role key from vault', async () => {
    const fetchMock = stubVault({ service_role_key: 'vault-service-key' });
    const key = await getSupabaseServiceRoleKey();
    expect(key).toBe('vault-service-key');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to environment when vault missing', async () => {
    delete process.env.VAULT_ADDR;
    delete process.env.VAULT_TOKEN;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'env-service-key';

    const key = await getSupabaseServiceRoleKey();
    expect(key).toBe('env-service-key');
  });

  it('retrieves Supabase JWT secret', async () => {
    const fetchMock = stubVault({ jwt_secret: 'vault-jwt-secret' });
    const secret = await getSupabaseJwtSecret();
    expect(secret).toBe('vault-jwt-secret');
    expect(fetchMock).toHaveBeenCalled();
  });
});
