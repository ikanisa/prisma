import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

let handler: (request: Request) => Promise<Response>;

const hoisted = vi.hoisted(() => {
  const envGetMock = vi.fn((key: string) => {
    if (key === 'SUPABASE_URL') return 'https://supabase.test';
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-role-key';
    if (key === 'API_ALLOWED_ORIGINS') return 'https://app.example.com';
    return undefined;
  });
  const createClientMock = vi.fn();
  const logEdgeErrorMock = vi.fn();
  const serveMock = vi.fn((fn: (request: Request) => Promise<Response>) => {
    handler = fn;
  });
  return { envGetMock, createClientMock, logEdgeErrorMock, serveMock };
});

vi.mock('https://deno.land/std@0.224.0/http/server.ts', () => ({
  serve: hoisted.serveMock,
}));

vi.mock('https://esm.sh/@supabase/supabase-js@2', () => ({
  createClient: (...args: unknown[]) => hoisted.createClientMock(...args),
}));

vi.mock('../../supabase/functions/_shared/error-notify.ts', () => ({
  logEdgeError: (...args: unknown[]) => hoisted.logEdgeErrorMock(...args),
}));

(globalThis as any).Deno = {
  env: {
    get: hoisted.envGetMock,
  },
};

const globalFetch = vi.fn();
vi.stubGlobal('fetch', globalFetch);

await import('../../supabase/functions/archive-sync/index.ts');

interface TableResponse<T> {
  data: T;
  error: any;
}

let authResult: { data: { user: { id: string } | null }; error: any };
let orgResult: TableResponse<{ id: string } | null>;
let membershipResult: TableResponse<{ role: string } | null>;
let engagementResult: TableResponse<{ id: string; client_id: string } | null>;
let acceptanceResult: TableResponse<{ id: string; decision: string; status: string; eqr_required: boolean; approved_at: string; updated_at: string } | null>;
let tcwgResult: TableResponse<{ id: string; status: string; pdf_document_id: string | null; zip_document_id: string | null; approved_at: string | null; eqr_approved_at: string | null; updated_at: string } | null>;
let modulesResult: TableResponse<Array<{ module_code: string; record_status: string; approval_state: string; updated_at: string }>>;
let archiveUpsertResponse: { data: { id: string } | null; error: any };
let activityLogError: any;
let upsertPayload: any;
let activityLogs: any[];

function createQueryBuilder(table: string) {
  if (table === 'organizations') {
    return {
      select: vi.fn(() => createQueryBuilder(table)),
      eq: vi.fn(() => createQueryBuilder(table)),
      maybeSingle: vi.fn(async () => orgResult),
    };
  }
  if (table === 'memberships') {
    return {
      select: vi.fn(() => createQueryBuilder(table)),
      eq: vi.fn(() => createQueryBuilder(table)),
      maybeSingle: vi.fn(async () => membershipResult),
    };
  }
  if (table === 'engagements') {
    return {
      select: vi.fn(() => createQueryBuilder(table)),
      eq: vi.fn(() => createQueryBuilder(table)),
      maybeSingle: vi.fn(async () => engagementResult),
    };
  }
  if (table === 'acceptance_decisions') {
    return {
      select: vi.fn(() => createQueryBuilder(table)),
      eq: vi.fn(() => createQueryBuilder(table)),
      maybeSingle: vi.fn(async () => acceptanceResult),
    };
  }
  if (table === 'tcwg_packs') {
    return {
      select: vi.fn(() => createQueryBuilder(table)),
      eq: vi.fn(() => createQueryBuilder(table)),
      order: vi.fn(() => createQueryBuilder(table)),
      limit: vi.fn(() => createQueryBuilder(table)),
      maybeSingle: vi.fn(async () => tcwgResult),
    };
  }
  if (table === 'audit_module_records') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve(modulesResult)),
        })),
      })),
    };
  }
  if (table === 'engagement_archives') {
    return {
      upsert: vi.fn((payload: unknown) => {
        upsertPayload = payload;
        return {
          select: () => ({
            maybeSingle: vi.fn(async () => archiveUpsertResponse),
          }),
        };
      }),
    };
  }
  if (table === 'activity_log') {
    return {
      insert: vi.fn(async (payload: unknown) => {
        activityLogs.push(payload);
        return { error: activityLogError };
      }),
    };
  }
  throw new Error(`Unexpected table: ${table}`);
}

function createSupabaseClient() {
  return {
    auth: {
      getUser: vi.fn(async () => authResult),
    },
    from: vi.fn((table: string) => createQueryBuilder(table)),
  };
}

beforeAll(() => {
  if (!handler) {
    throw new Error('Edge handler was not registered');
  }
});

beforeEach(() => {
  authResult = { data: { user: { id: 'user-1' } }, error: null };
  orgResult = { data: { id: 'org-1' }, error: null };
  membershipResult = { data: { role: 'MANAGER' }, error: null };
  engagementResult = { data: { id: 'eng-123', client_id: 'client-9' }, error: null };
  acceptanceResult = {
    data: {
      id: 'acc-1',
      decision: 'ACCEPT',
      status: 'APPROVED',
      eqr_required: false,
      approved_at: '2025-01-10T00:00:00Z',
      updated_at: '2025-01-10T00:00:00Z',
    },
    error: null,
  };
  tcwgResult = {
    data: {
      id: 'tcwg-1',
      status: 'APPROVED',
      pdf_document_id: 'doc-1',
      zip_document_id: 'zip-1',
      approved_at: '2025-01-12T00:00:00Z',
      eqr_approved_at: null,
      updated_at: '2025-01-12T12:00:00Z',
    },
    error: null,
  };
  modulesResult = {
    data: [
      { module_code: 'CTRL', record_status: 'APPROVED', approval_state: 'APPROVED', updated_at: '2025-01-11T09:00:00Z' },
      { module_code: 'PBC', record_status: 'IN_PROGRESS', approval_state: 'PENDING', updated_at: '2025-01-11T11:30:00Z' },
    ],
    error: null,
  };
  archiveUpsertResponse = { data: { id: 'archive-1' }, error: null };
  activityLogError = null;
  upsertPayload = null;
  activityLogs = [];
  globalFetch.mockReset();
  hoisted.createClientMock.mockImplementation(() => createSupabaseClient());
  hoisted.logEdgeErrorMock.mockReset();
});

const defaultRequest = () =>
  new Request('https://example.com', {
    method: 'POST',
    headers: { Authorization: 'Bearer token' },
    body: JSON.stringify({ orgSlug: 'aurora', engagementId: 'eng-123' }),
  });

describe('archive-sync edge function', () => {
  it('handles CORS preflight', async () => {
    const response = await handler(new Request('https://example.com', { method: 'OPTIONS' }));
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com');
  });

  it('rejects missing authorization headers', async () => {
    const response = await handler(new Request('https://example.com', { method: 'POST' }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'missing_authorization' });
  });

  it('returns 401 when auth token is invalid', async () => {
    authResult = { data: { user: null }, error: new Error('invalid token') };

    const response = await handler(defaultRequest());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'invalid_token' });
  });

  it('requires an organization slug', async () => {
    const response = await handler(
      new Request('https://example.com', {
        method: 'POST',
        headers: { Authorization: 'Bearer token' },
        body: JSON.stringify({ engagementId: 'eng-123' }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'org_slug_required' });
  });

  it('rejects members without sufficient role', async () => {
    membershipResult = { data: { role: 'EMPLOYEE' }, error: null };

    const response = await handler(defaultRequest());

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'insufficient_role' });
  });

  it('upserts archive manifest and logs activity', async () => {
    const digestSpy = vi.spyOn(globalThis.crypto.subtle, 'digest');

    const response = await handler(defaultRequest());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.manifest.engagementId).toBe('eng-123');
    expect(body.sha256).toHaveLength(64);

    expect(upsertPayload).toMatchObject({
      org_id: 'org-1',
      engagement_id: 'eng-123',
      manifest: expect.any(Object),
      sha256: body.sha256,
    });

    expect(activityLogs).toHaveLength(1);
    expect(activityLogs[0]).toMatchObject({
      action: 'ARCHIVE_MANIFEST_UPDATED',
      entity_type: 'ARCHIVE',
      metadata: expect.objectContaining({ sha256: body.sha256 }),
    });

    expect(digestSpy).toHaveBeenCalled();
    expect(hoisted.logEdgeErrorMock).not.toHaveBeenCalled();
  });

  it('logs edge error when archive upsert fails', async () => {
    archiveUpsertResponse = { data: null, error: { message: 'insert_failed' } };

    const response = await handler(defaultRequest());

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'archive_upsert_failed' });
    expect(hoisted.logEdgeErrorMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      module: 'ARCHIVE_SYNC',
      message: 'archive_upsert_failed',
      orgId: 'org-1',
      context: { engagementId: 'eng-123' },
    }));
  });

  it('propagates upstream query failures', async () => {
    modulesResult = { data: [], error: { message: 'module_lookup_failed' } } as any;

    const response = await handler(defaultRequest());

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'module_lookup_failed' });
    expect(hoisted.logEdgeErrorMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      module: 'ARCHIVE_SYNC',
      message: 'module_lookup_failed',
    }));
  });
});
