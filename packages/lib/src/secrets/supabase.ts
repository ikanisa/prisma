import { SecretManager, createSecretManagerFromEnv } from './secret-manager.js';

const DEFAULT_VAULT_PATH = 'apps/prisma-glow-15/supabase';
const DEFAULT_SERVICE_FIELD = 'service_role_key';
const DEFAULT_JWT_FIELD = 'jwt_secret';

let secretManager: SecretManager | null = null;

function getManager(): SecretManager {
  if (!secretManager) {
    secretManager = createSecretManagerFromEnv();
  }
  return secretManager;
}

function getVaultPath(): string {
  return process.env.SUPABASE_VAULT_PATH ?? DEFAULT_VAULT_PATH;
}

function getServiceField(): string {
  return process.env.SUPABASE_SERVICE_ROLE_VAULT_FIELD ?? DEFAULT_SERVICE_FIELD;
}

function getJwtField(): string {
  return process.env.SUPABASE_JWT_VAULT_FIELD ?? DEFAULT_JWT_FIELD;
}

export async function getSupabaseServiceRoleKey(): Promise<string> {
  return getManager().getSecret({
    vaultPath: getVaultPath(),
    field: getServiceField(),
    envFallback: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
  });
}

export async function getSupabaseJwtSecret(): Promise<string> {
  return getManager().getSecret({
    vaultPath: getVaultPath(),
    field: getJwtField(),
    envFallback: 'SUPABASE_JWT_SECRET',
    required: true,
  });
}

export function isSupabaseVaultBacked(): boolean {
  return getManager().isVaultBacked();
}

export function clearSupabaseSecretCache(): void {
  if (!secretManager) return;
  secretManager.clearCache({ vaultPath: getVaultPath(), field: getServiceField() });
  secretManager.clearCache({ vaultPath: getVaultPath(), field: getJwtField() });
}

export function resetSupabaseSecretManager(): void {
  secretManager = null;
}
