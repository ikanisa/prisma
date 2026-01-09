/**
 * Supabase client factory
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types.js';

export function createClient(
    supabaseUrl: string = process.env.SUPABASE_URL!,
    supabaseKey: string = process.env.SUPABASE_ANON_KEY!
) {
    return createSupabaseClient<Database>(supabaseUrl, supabaseKey);
}

export function createAdminClient(
    supabaseUrl: string = process.env.SUPABASE_URL!,
    serviceRoleKey: string = process.env.SUPABASE_SERVICE_ROLE_KEY!
) {
    return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
