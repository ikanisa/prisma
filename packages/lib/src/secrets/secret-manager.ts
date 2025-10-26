import { VaultClient, type VaultClientOptions, VaultClientError } from './vault-client.js';

type CacheEntry = {
  value: string;
  expiresAt: number;
};

export type SecretDescriptor = {
  /** Vault secret path e.g. `apps/prisma-glow-15/supabase`. */
  vaultPath: string;
  /** Key inside the vault secret payload. */
  field: string;
  /** Name of the process env variable used as a local fallback. */
  envFallback?: string;
  /** Cache TTL in milliseconds. Defaults to 5 minutes. */
  cacheTtlMs?: number;
  /** Throw instead of returning empty string when secret missing. */
  required?: boolean;
};

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

export class SecretManager {
  private readonly client: VaultClient | null;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(options?: VaultClientOptions | null) {
    if (options?.baseUrl && options?.token) {
      this.client = new VaultClient(options);
    } else {
      this.client = null;
    }
  }

  isVaultBacked(): boolean {
    return Boolean(this.client);
  }

  async getSecret(descriptor: SecretDescriptor): Promise<string> {
    const cacheKey = this.getCacheKey(descriptor);
    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    if (this.client) {
      try {
        const data = await this.client.read(descriptor.vaultPath);
        const rawValue = data[descriptor.field];
        if (typeof rawValue !== 'string') {
          if (descriptor.required) {
            throw new VaultClientError(`Secret field ${descriptor.field} missing at ${descriptor.vaultPath}`);
          }
          return '';
        }
        const ttl = descriptor.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
        this.cache.set(cacheKey, { value: rawValue, expiresAt: now + ttl });
        return rawValue;
      } catch (error) {
        console.warn('secret_manager_vault_read_failed', {
          path: descriptor.vaultPath,
          field: descriptor.field,
          error,
        });
        if (!descriptor.envFallback) {
          if (descriptor.required) {
            throw error instanceof Error ? error : new Error(String(error));
          }
          return '';
        }
      }
    }

    if (descriptor.envFallback) {
      const fallback = process.env[descriptor.envFallback];
      if (typeof fallback === 'string' && fallback.length > 0) {
        return fallback;
      }
    }

    if (descriptor.required) {
      throw new Error(`Secret ${descriptor.field} at ${descriptor.vaultPath} is not configured`);
    }

    return '';
  }

  async setSecret(descriptor: SecretDescriptor, value: string): Promise<void> {
    if (!this.client) {
      throw new Error('Vault is not configured; cannot persist secret');
    }

    await this.client.write(descriptor.vaultPath, { [descriptor.field]: value });
    this.cache.set(this.getCacheKey(descriptor), {
      value,
      expiresAt: Date.now() + (descriptor.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS),
    });
  }

  clearCache(descriptor?: SecretDescriptor): void {
    if (!descriptor) {
      this.cache.clear();
      return;
    }
    this.cache.delete(this.getCacheKey(descriptor));
  }

  private getCacheKey(descriptor: SecretDescriptor): string {
    return `${descriptor.vaultPath}#${descriptor.field}`;
  }
}

export function createSecretManagerFromEnv(): SecretManager {
  const baseUrl = process.env.VAULT_ADDR ?? '';
  const token = process.env.VAULT_TOKEN ?? '';
  const mount = process.env.VAULT_KV_MOUNT ?? 'secret';

  if (!baseUrl || !token) {
    return new SecretManager(null);
  }

  return new SecretManager({ baseUrl, token, mount });
}
