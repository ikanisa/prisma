/**
 * Supabase Secret Management with Vault Integration
 * 
 * ⚠️ SECURITY WARNING:
 * - This module is SERVER-ONLY and must never be imported in client-side code
 * - Service role keys grant full admin access and must be protected
 * - Prefer vault-based secret retrieval over environment variables in production
 */

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

/**
 * Get Supabase Service Role Key from vault or environment.
 * 
 * ⚠️ SERVER-ONLY: This function must never be called from client-side code.
 * The service role key grants full admin access to Supabase.
 * 
 * Retrieval order:
 * 1. Vault (if configured via VAULT_ADDR and VAULT_TOKEN)
 * 2. Environment variable SUPABASE_SERVICE_ROLE_KEY (fallback for local dev)
 * 
 * @returns Promise resolving to service role key
 * @throws Error if key not found or accessed from client
 */
export async function getSupabaseServiceRoleKey() {
    // Runtime check: ensure we're not in a browser context
    if (typeof window !== 'undefined') {
        throw new Error(
            'SECURITY VIOLATION: getSupabaseServiceRoleKey() called in client-side code. ' +
            'This function must only be used in server-side code.'
        );
    }

    return getManager().getSecret({
        vaultPath: getVaultPath(),
        field: getServiceField(),
        envFallback: 'SUPABASE_SERVICE_ROLE_KEY',
        required: true,
    });
}

/**
 * Get Supabase JWT Secret from vault or environment.
 * 
 * ⚠️ SERVER-ONLY: This function must never be called from client-side code.
 * The JWT secret is used to sign/verify authentication tokens.
 * 
 * Retrieval order:
 * 1. Vault (if configured via VAULT_ADDR and VAULT_TOKEN)
 * 2. Environment variable SUPABASE_JWT_SECRET (fallback for local dev)
 * 
 * @returns Promise resolving to JWT secret
 * @throws Error if secret not found or accessed from client
 */
export async function getSupabaseJwtSecret() {
    // Runtime check: ensure we're not in a browser context
    if (typeof window !== 'undefined') {
        throw new Error(
            'SECURITY VIOLATION: getSupabaseJwtSecret() called in client-side code. ' +
            'This function must only be used in server-side code.'
        );
    }

    return getManager().getSecret({
        vaultPath: getVaultPath(),
        field: getJwtField(),
        envFallback: 'SUPABASE_JWT_SECRET',
        required: true,
    });
}

/**
 * Check if secrets are backed by vault (vs environment variables).
 * 
 * @returns true if vault is configured, false if using env fallback
 */
export function isSupabaseVaultBacked() {
    return getManager().isVaultBacked();
}

/**
 * Clear cached secrets from memory.
 * Useful for testing or when secrets are rotated.
 */
export function clearSupabaseSecretCache() {
    if (!secretManager)
        return;
    secretManager.clearCache({ vaultPath: getVaultPath(), field: getServiceField() });
    secretManager.clearCache({ vaultPath: getVaultPath(), field: getJwtField() });
}

/**
 * Reset secret manager instance.
 * Used for testing or reinitializing with new vault configuration.
 */
export function resetSupabaseSecretManager() {
    secretManager = null;
}
