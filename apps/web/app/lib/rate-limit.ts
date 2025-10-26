import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const DEFAULT_LIMIT = 60;
const DEFAULT_WINDOW_SECONDS = 60;

type EnforceParams = {
  client: SupabaseClient;
  orgId: string;
  resource: string;
  limit?: number;
  windowSeconds?: number;
  requestId?: string;
};

type RateLimitResult = {
  allowed: boolean;
  requestCount: number;
};

export async function enforceRateLimit({
  client,
  orgId,
  resource,
  limit = DEFAULT_LIMIT,
  windowSeconds = DEFAULT_WINDOW_SECONDS,
}: EnforceParams): Promise<RateLimitResult> {
  const { data, error } = await client.rpc('enforce_rate_limit', {
    p_org_id: orgId,
    p_resource: resource,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    logger.warn('rate_limit.rpc_failed', { resource, orgId, error });
    return { allowed: true, requestCount: 0 };
  }

  const result = Array.isArray(data) && data[0] ? data[0] : { allowed: true, request_count: 0 };
  return { allowed: Boolean(result.allowed), requestCount: Number(result.request_count ?? 0) };
}
