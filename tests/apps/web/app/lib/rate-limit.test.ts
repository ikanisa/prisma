import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { enforceRateLimit } from '../../../../../apps/web/app/lib/rate-limit';

type RpcResult = { data: Array<Record<string, unknown>> | null; error: { message: string } | null };

describe('enforceRateLimit', () => {
  const rpc = vi.fn<[], Promise<RpcResult>>();
  const client = { rpc } as unknown as SupabaseClient;
  const orgId = 'org-test';
  const resource = 'agent:chat';
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    rpc.mockReset();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('forwards defaults to Supabase RPC and normalises the response payload', async () => {
    rpc.mockResolvedValue({
      data: [
        {
          allowed: true,
          request_count: 12,
        },
      ],
      error: null,
    });

    const result = await enforceRateLimit({ client, orgId, resource });

    expect(rpc).toHaveBeenCalledWith('enforce_rate_limit', {
      p_org_id: orgId,
      p_resource: resource,
      p_limit: 60,
      p_window_seconds: 60,
    });
    expect(result).toEqual({ allowed: true, requestCount: 12 });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('allows overriding the quota window and limit', async () => {
    rpc.mockResolvedValue({ data: [{ allowed: 0, request_count: '5' }], error: null });

    const result = await enforceRateLimit({
      client,
      orgId,
      resource,
      limit: 15,
      windowSeconds: 120,
    });

    expect(rpc).toHaveBeenCalledWith('enforce_rate_limit', {
      p_org_id: orgId,
      p_resource: resource,
      p_limit: 15,
      p_window_seconds: 120,
    });
    expect(result).toEqual({ allowed: false, requestCount: 5 });
  });

  it('fails open when the RPC returns an error', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'permission denied' } });

    const result = await enforceRateLimit({ client, orgId, resource });

    expect(result).toEqual({ allowed: true, requestCount: 0 });
    expect(warnSpy).toHaveBeenCalledWith('rate_limit_rpc_failed', {
      resource,
      orgId,
      error: { message: 'permission denied' },
    });
  });

  it('coerces malformed payloads into a safe default', async () => {
    rpc.mockResolvedValue({ data: [], error: null });

    const result = await enforceRateLimit({ client, orgId, resource });

    expect(result).toEqual({ allowed: true, requestCount: 0 });
  });
});
