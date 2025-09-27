import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isVaultConfigured, readVaultSecret } from './vault.ts';

let supabaseClientPromise: Promise<SupabaseClient<any>> | null = null;
let serviceRoleKeyPromise: Promise<string> | null = null;

const DEFAULT_VAULT_PATH = 'apps/prisma-glow-15/supabase';
const DEFAULT_SERVICE_FIELD = 'service_role_key';

async function resolveServiceRoleKey(): Promise<string> {
  const fallback = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!isVaultConfigured()) {
    if (!fallback) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY must be configured.');
    }
    return fallback;
  }

  const vaultPath = Deno.env.get('SUPABASE_VAULT_PATH') ?? DEFAULT_VAULT_PATH;
  const vaultField = Deno.env.get('SUPABASE_SERVICE_ROLE_VAULT_FIELD') ?? DEFAULT_SERVICE_FIELD;
  const secret = await readVaultSecret(vaultPath, vaultField);

  if (secret) {
    return secret;
  }

  if (fallback) {
    console.warn('vault_secret_missing_fallback', { vaultPath, vaultField });
    return fallback;
  }

  throw new Error(`Vault secret ${vaultField} at ${vaultPath} is not configured.`);
}

export async function getServiceRoleKey(): Promise<string> {
  if (!serviceRoleKeyPromise) {
    serviceRoleKeyPromise = resolveServiceRoleKey();
  }

  try {
    return await serviceRoleKeyPromise;
  } catch (error) {
    serviceRoleKeyPromise = null;
    throw error;
  }
}

export async function getServiceSupabaseClient<T = any>(): Promise<SupabaseClient<T>> {
  if (supabaseClientPromise) {
    return supabaseClientPromise as Promise<SupabaseClient<T>>;
  }

  const url = Deno.env.get('SUPABASE_URL');
  if (!url) {
    throw new Error('SUPABASE_URL must be configured.');
  }

  const pending = (async () => {
    const serviceRoleKey = await getServiceRoleKey();
    return createClient<T>(url, serviceRoleKey, {
      auth: { persistSession: false },
    });
  })();

  supabaseClientPromise = pending;

  try {
    return (await pending) as SupabaseClient<T>;
  } catch (error) {
    supabaseClientPromise = null;
    throw error;
  }
}

export async function createSupabaseClientWithAuth<T = any>(authHeader: string): Promise<SupabaseClient<T>> {
  const url = Deno.env.get('SUPABASE_URL');
  if (!url) {
    throw new Error('SUPABASE_URL must be configured.');
  }

  const serviceRoleKey = await getServiceRoleKey();
  return createClient<T>(url, serviceRoleKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });
}
