import { readVaultSecret, writeVaultSecret, isVaultConfigured, invalidateVaultSecret } from '../../_shared/vault.ts';

const CONNECTOR_VAULT_PREFIX = Deno.env.get('CONNECTOR_VAULT_PATH') ?? 'apps/prisma-glow-15/connectors';
const TOKEN_FIELD = 'access_token';

const memoryStore = new Map<string, string>();

function buildPath(provider: string, orgId: string): string {
  const safeProvider = provider.replace(/[^a-zA-Z0-9_-]/g, '-');
  const safeOrg = orgId.replace(/[^a-zA-Z0-9_-]/g, '-');
  return `${CONNECTOR_VAULT_PREFIX}/${safeOrg}/${safeProvider}`;
}

export async function storeToken(provider: string, orgId: string, token: string): Promise<void> {
  const path = buildPath(provider, orgId);
  const payload = { [TOKEN_FIELD]: token };

  const stored = await writeVaultSecret(path, payload);
  if (!stored) {
    memoryStore.set(path, token);
    console.warn('connector_token_vault_fallback', { provider, orgId, path });
  } else {
    memoryStore.delete(path);
  }
}

export async function getToken(provider: string, orgId: string): Promise<string | null> {
  const path = buildPath(provider, orgId);
  const secret = await readVaultSecret(path, TOKEN_FIELD);
  if (secret) {
    return secret;
  }

  if (memoryStore.has(path)) {
    return memoryStore.get(path) ?? null;
  }

  if (isVaultConfigured()) {
    console.warn('connector_token_missing', { provider, orgId, path });
  }

  return null;
}

export function clearToken(provider: string, orgId: string): void {
  const path = buildPath(provider, orgId);
  memoryStore.delete(path);
  invalidateVaultSecret(path, TOKEN_FIELD);
}
