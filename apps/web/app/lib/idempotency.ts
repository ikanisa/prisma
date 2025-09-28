import type { SupabaseClient } from '@supabase/supabase-js';

const IDEMPOTENCY_TABLE = 'idempotency_keys';

type TypedClient = SupabaseClient<any>;

type FindParams = {
  client: TypedClient;
  orgId: string;
  resource: string;
  key?: string | null;
};

type StoreParams = {
  client: TypedClient;
  orgId: string;
  resource: string;
  key?: string | null;
  status: number;
  response: Record<string, unknown>;
  requestId?: string;
};

export async function findIdempotentResponse({ client, orgId, resource, key }: FindParams) {
  if (!key) return null;
  const { data, error } = await client
    .from(IDEMPOTENCY_TABLE)
    .select('response, status_code')
    .eq('org_id', orgId)
    .eq('resource', resource)
    .eq('idempotency_key', key)
    .maybeSingle();

  if (error) {
    console.warn('idempotency_lookup_failed', { resource, orgId, error });
    return null;
  }

  if (!data) return null;
  return { status: data.status_code as number, body: data.response as Record<string, unknown> };
}

export async function storeIdempotentResponse({
  client,
  orgId,
  resource,
  key,
  status,
  response,
  requestId,
}: StoreParams) {
  if (!key) return;
  try {
    await client
      .from(IDEMPOTENCY_TABLE)
      .insert({
        org_id: orgId,
        resource,
        idempotency_key: key,
        status_code: status,
        response,
        request_id: requestId ?? null,
      })
      .select('id')
      .maybeSingle();
  } catch (error) {
    console.warn('idempotency_store_failed', { resource, orgId, error });
  }
}
