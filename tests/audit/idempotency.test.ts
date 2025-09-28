import { beforeEach, describe, expect, it, vi } from 'vitest';

import { findIdempotentResponse, storeIdempotentResponse } from '../../apps/web/app/lib/idempotency';

const fromMock = vi.fn();
const supabase = { from: fromMock } as any;

beforeEach(() => {
  fromMock.mockReset();
});

describe('findIdempotentResponse', () => {
  it('skips lookup when key missing', async () => {
    const result = await findIdempotentResponse({ client: supabase, orgId: 'org', resource: 'res', key: null });
    expect(result).toBeNull();
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('returns stored response when present', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { response: { foo: 'bar' }, status_code: 201 }, error: null });
    const select = vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })) })) }));
    fromMock.mockReturnValue({ select });

    const result = await findIdempotentResponse({ client: supabase, orgId: 'org', resource: 'res', key: 'key' });
    expect(result).toEqual({ status: 201, body: { foo: 'bar' } });
    expect(fromMock).toHaveBeenCalledWith('idempotency_keys');
  });
});

describe('storeIdempotentResponse', () => {
  it('skips store when key missing', async () => {
    await storeIdempotentResponse({
      client: supabase,
      orgId: 'org',
      resource: 'res',
      key: undefined,
      status: 200,
      response: { ok: true },
    });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('stores response when key provided', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'id' }, error: null });
    const select = vi.fn(() => ({ maybeSingle }));
    const insert = vi.fn(() => ({ select }));
    fromMock.mockReturnValue({ insert });

    await storeIdempotentResponse({
      client: supabase,
      orgId: 'org',
      resource: 'res',
      key: 'key',
      status: 200,
      response: { ok: true },
      requestId: 'req-1',
    });

    expect(insert).toHaveBeenCalledWith({
      org_id: 'org',
      resource: 'res',
      idempotency_key: 'key',
      status_code: 200,
      response: { ok: true },
      request_id: 'req-1',
    });
  });
});
