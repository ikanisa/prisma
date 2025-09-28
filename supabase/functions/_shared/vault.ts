const vaultAddr = Deno.env.get('VAULT_ADDR') ?? '';
const vaultToken = Deno.env.get('VAULT_TOKEN') ?? '';
const vaultMount = (Deno.env.get('VAULT_KV_MOUNT') ?? 'secret').replace(/\/$/, '');

const secretCache = new Map<string, string>();

function buildDataUrl(path: string): URL {
  const trimmed = path.replace(/^\/+/, '').replace(/\/+$/, '');
  return new URL(`/v1/${vaultMount}/data/${trimmed}`, vaultAddr);
}

export function isVaultConfigured(): boolean {
  return Boolean(vaultAddr && vaultToken);
}

export async function readVaultSecret(path: string, field: string): Promise<string | null> {
  if (!isVaultConfigured()) {
    return null;
  }

  const cacheKey = `${path}#${field}`;
  const cached = secretCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(buildDataUrl(path), {
      headers: {
        'X-Vault-Token': vaultToken,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('vault_fetch_failed', { path, status: response.status, statusText: response.statusText });
      return null;
    }

    const body = await response.json();
    const payload = body?.data?.data ?? {};
    const value = payload[field];

    if (typeof value === 'string' && value.length > 0) {
      secretCache.set(cacheKey, value);
      return value;
    }
  } catch (error) {
    console.warn('vault_fetch_error', { path, field, error });
  }

  return null;
}

export async function writeVaultSecret(path: string, payload: Record<string, unknown>): Promise<boolean> {
  if (!isVaultConfigured()) {
    console.warn('vault_write_skipped', { path });
    return false;
  }

  try {
    const response = await fetch(buildDataUrl(path), {
      method: 'POST',
      headers: {
        'X-Vault-Token': vaultToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: payload }),
    });

    if (!response.ok) {
      console.error('vault_write_failed', { path, status: response.status, statusText: response.statusText });
      return false;
    }

    for (const [field, value] of Object.entries(payload)) {
      if (typeof value === 'string') {
        secretCache.set(`${path}#${field}`, value);
      }
    }

    return true;
  } catch (error) {
    console.error('vault_write_error', { path, error });
    return false;
  }
}

export function invalidateVaultSecret(path: string, field?: string): void {
  if (!field) {
    for (const key of secretCache.keys()) {
      if (key.startsWith(`${path}#`)) {
        secretCache.delete(key);
      }
    }
    return;
  }
  secretCache.delete(`${path}#${field}`);
}
