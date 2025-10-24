import { createSecretManagerFromEnv } from './secret-manager';
const DEFAULT_VAULT_PATH = 'apps/prisma-glow-15/supabase';
const DEFAULT_SERVICE_FIELD = 'service_role_key';
const DEFAULT_JWT_FIELD = 'jwt_secret';
let secretManager = null;
function getManager() {
    if (!secretManager) {
        secretManager = createSecretManagerFromEnv();
    }
    return secretManager;
}
function getVaultPath() {
    return process.env.SUPABASE_VAULT_PATH ?? DEFAULT_VAULT_PATH;
}
function getServiceField() {
    return process.env.SUPABASE_SERVICE_ROLE_VAULT_FIELD ?? DEFAULT_SERVICE_FIELD;
}
function getJwtField() {
    return process.env.SUPABASE_JWT_VAULT_FIELD ?? DEFAULT_JWT_FIELD;
}
export async function getSupabaseServiceRoleKey() {
    return getManager().getSecret({
        vaultPath: getVaultPath(),
        field: getServiceField(),
        envFallback: 'SUPABASE_SERVICE_ROLE_KEY',
        required: true,
    });
}
export async function getSupabaseJwtSecret() {
    return getManager().getSecret({
        vaultPath: getVaultPath(),
        field: getJwtField(),
        envFallback: 'SUPABASE_JWT_SECRET',
        required: true,
    });
}
export function isSupabaseVaultBacked() {
    return getManager().isVaultBacked();
}
export function clearSupabaseSecretCache() {
    if (!secretManager)
        return;
    secretManager.clearCache({ vaultPath: getVaultPath(), field: getServiceField() });
    secretManager.clearCache({ vaultPath: getVaultPath(), field: getJwtField() });
}
export function resetSupabaseSecretManager() {
    secretManager = null;
}
