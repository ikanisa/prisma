import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Json } from '../integrations/supabase/types';
import { createSupabaseStub } from './supabase/stub';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ALLOW_STUB = process.env.SUPABASE_ALLOW_STUB === 'true';

type ServiceClient = SupabaseClient;

let cachedClient: ServiceClient | null = null;

export function getServiceSupabase(): ServiceClient {
  if (!cachedClient) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      if (!SUPABASE_ALLOW_STUB) {
        throw new Error('Supabase service credentials are not configured');
      }
      cachedClient = createSupabaseStub();
      return cachedClient;
    }
    cachedClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
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

export function tryGetServiceSupabase(): ServiceClient | null {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    if (!SUPABASE_ALLOW_STUB) {
      return null;
    }
  }

  try {
    return getServiceSupabase();
  } catch {
    return null;
  }
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
