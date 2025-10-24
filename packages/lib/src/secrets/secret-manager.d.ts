import { type VaultClientOptions } from './vault-client.js';
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
export declare class SecretManager {
    private readonly client;
    private readonly cache;
    constructor(options?: VaultClientOptions | null);
    isVaultBacked(): boolean;
    getSecret(descriptor: SecretDescriptor): Promise<string>;
    setSecret(descriptor: SecretDescriptor, value: string): Promise<void>;
    clearCache(descriptor?: SecretDescriptor): void;
    private getCacheKey;
}
export declare function createSecretManagerFromEnv(): SecretManager;
//# sourceMappingURL=secret-manager.d.ts.map