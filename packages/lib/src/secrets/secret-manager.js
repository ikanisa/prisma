import { VaultClient, VaultClientError } from './vault-client';
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
export class SecretManager {
    constructor(options) {
        this.cache = new Map();
        if (options?.baseUrl && options?.token) {
            this.client = new VaultClient(options);
        }
        else {
            this.client = null;
        }
    }
    isVaultBacked() {
        return Boolean(this.client);
    }
    async getSecret(descriptor) {
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
            }
            catch (error) {
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
    async setSecret(descriptor, value) {
        if (!this.client) {
            throw new Error('Vault is not configured; cannot persist secret');
        }
        await this.client.write(descriptor.vaultPath, { [descriptor.field]: value });
        this.cache.set(this.getCacheKey(descriptor), {
            value,
            expiresAt: Date.now() + (descriptor.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS),
        });
    }
    clearCache(descriptor) {
        if (!descriptor) {
            this.cache.clear();
            return;
        }
        this.cache.delete(this.getCacheKey(descriptor));
    }
    getCacheKey(descriptor) {
        return `${descriptor.vaultPath}#${descriptor.field}`;
    }
}
export function createSecretManagerFromEnv() {
    const baseUrl = process.env.VAULT_ADDR ?? '';
    const token = process.env.VAULT_TOKEN ?? '';
    const mount = process.env.VAULT_KV_MOUNT ?? 'secret';
    if (!baseUrl || !token) {
        return new SecretManager(null);
    }
    return new SecretManager({ baseUrl, token, mount });
}
