export type { VaultClientOptions } from './vault-client';
export { VaultClient, VaultClientError } from './vault-client';
export type { SecretDescriptor } from './secret-manager';
export { SecretManager, createSecretManagerFromEnv } from './secret-manager';
export {
  getSupabaseJwtSecret,
  getSupabaseServiceRoleKey,
  clearSupabaseSecretCache,
  isSupabaseVaultBacked,
  resetSupabaseSecretManager,
} from './supabase';
