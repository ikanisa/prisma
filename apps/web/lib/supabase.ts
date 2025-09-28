import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '../../../src/integrations/supabase/types';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  throw new Error('SUPABASE_URL is not set. Add it to the Next.js environment.');
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. Add it to the Next.js environment.');
}

type ServiceClient = SupabaseClient<Database>;

let cachedClient: ServiceClient | null = null;

export function getServiceSupabase(): ServiceClient {
  if (!cachedClient) {
    cachedClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          'X-Client-Info': 'audit-other-information-service',
        },
      },
    });
  }

  return cachedClient;
}

export interface OiActionLog {
  orgId: string;
  userId: string;
  action: string;
  entityId?: string;
  entityType?: string;
  metadata?: Record<string, unknown> | null;
}

export async function logOiAction(
  client: ServiceClient,
  { orgId, userId, action, entityId, entityType = 'OTHER_INFORMATION', metadata }: OiActionLog,
): Promise<void> {
  const serializedMetadata = metadata ? (metadata as Json) : null;

  const { error } = await client.from('activity_log').insert({
    org_id: orgId,
    user_id: userId,
    action,
    entity_id: entityId ?? null,
    entity_type: entityType,
    metadata: serializedMetadata,
  });

  if (error) {
    console.error('Failed to record OI activity log entry', error);
  }
}
