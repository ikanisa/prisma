export type { VaultClientOptions } from './vault-client.js';
export { VaultClient, VaultClientError } from './vault-client.js';
export type { SecretDescriptor } from './secret-manager.js';
export { SecretManager, createSecretManagerFromEnv } from './secret-manager.js';
export {
  getSupabaseJwtSecret,
  getSupabaseServiceRoleKey,
  clearSupabaseSecretCache,
  isSupabaseVaultBacked,
  resetSupabaseSecretManager,
} from './supabase.js';
