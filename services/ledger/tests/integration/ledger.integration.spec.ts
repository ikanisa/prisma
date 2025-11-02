import express from 'express';
import request from 'supertest';
import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ORG_ID = '11111111-2222-3333-4444-555555555555';
const ENTITY_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const USER_ID = '99999999-8888-7777-6666-555555555555';
const ACCOUNT_ONE = '00000000-0000-0000-0000-000000000001';
const ACCOUNT_TWO = '00000000-0000-0000-0000-000000000002';
const PERIOD_ID = '33333333-4444-5555-6666-777777777777';
const BATCH_ID = '44444444-5555-6666-7777-888888888888';

const getServiceSupabaseClientMock = vi.hoisted(() => vi.fn());
const logActivityMock = vi.hoisted(() => vi.fn());
const guardState = vi.hoisted(() => ({
  current: createGuardMocks(),
}));

vi.mock('@/lib/supabase-server', () => ({
  getServiceSupabaseClient: getServiceSupabaseClientMock,
}));

vi.mock('@/lib/accounting/activity-log', () => ({
  logActivity: logActivityMock,
}));

vi.mock('@/app/lib/api-guard', () => ({
  createApiGuard: vi.fn(async () => guardState.current.guard),
}));

function createGuardMocks() {
  const respond = vi.fn(async (body: Record<string, unknown>, init?: ResponseInit) =>
    NextResponse.json(body, { status: init?.status ?? 200 }),
  );
  const json = vi.fn((body: unknown, init?: ResponseInit) =>
    NextResponse.json(body, { status: init?.status ?? 200 }),
  );
  return {
    respond,
    json,
    guard: {
      requestId: 'test-request',
      idempotencyKey: null,
      rateLimitResponse: undefined as Response | undefined,
      replayResponse: undefined as Response | undefined,
      respond,
      json,
    },
  };
}

function createSupabaseMock() {
  const insert = vi.fn(async (_rows: unknown) => ({ error: null }));
  const upsert = vi.fn(async (_rows: unknown, _options?: unknown) => ({ error: null }));
  const from = vi.fn((table: string) => {
    if (table === 'ledger_entries') {
      return { insert };
    }
    if (table === 'ledger_accounts') {
      return { upsert };
    }
    throw new Error(`Unexpected table ${table}`);
  });
  return { supabase: { from } as Record<string, unknown>, spies: { insert, upsert, from } };
}

function adaptHandler(
  handler: (request: Request) => Promise<Response>,
  options?: { expectsNextRequest?: boolean },
) {
  return async (req: express.Request, res: express.Response) => {
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers[key] = value;
      else if (Array.isArray(value)) headers[key] = value.join(',');
    }
    if (req.is('json') && !headers['content-type']) headers['content-type'] = 'application/json';
    if (!headers['x-request-id']) headers['x-request-id'] = 'test-request';

    const body = req.body && Object.keys(req.body).length ? JSON.stringify(req.body) : undefined;
    const url = `http://test${req.originalUrl}`;
    const init: RequestInit = { method: req.method, headers, body };
    const adaptedRequest = options?.expectsNextRequest
      ? (new NextRequest(url, init) as unknown as Request)
      : new Request(url, init);

    const response = await handler(adaptedRequest);
    await forwardResponse(response, res);
  };
}

async function forwardResponse(response: Response, res: express.Response) {
  res.status(response.status);
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'content-length') {
      res.setHeader(key, value);
    }
  });
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const json = await response.json();
    res.json(json);
  } else {
    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  }
}

function createLedgerApp() {
  const app = express();
  app.use(express.json());

  return app
    .post(
      '/api/gl/accounts/import',
      adaptHandler((req) => import('@/app/api/gl/accounts/import/route').then((m) => m.POST(req))),
    )
    .post(
      '/api/gl/entries/import',
      adaptHandler((req) => import('@/app/api/gl/entries/import/route').then((m) => m.POST(req))),
    );
}

describe('Ledger import endpoints', () => {
  beforeEach(() => {
    vi.resetModules();
    guardState.current = createGuardMocks();
    getServiceSupabaseClientMock.mockReset();
    logActivityMock.mockReset();
  });

  it('imports ledger accounts and records activity', async () => {
    const { supabase, spies } = createSupabaseMock();
    getServiceSupabaseClientMock.mockResolvedValue(supabase);

    const app = createLedgerApp();
    const payload = {
      orgId: ORG_ID,
      entityId: ENTITY_ID,
      userId: USER_ID,
      accounts: [
        { code: '1000', name: 'Cash', type: 'ASSET', currency: 'EUR' },
        { code: '2000', name: 'Revenue', type: 'REVENUE', currency: 'EUR', active: false },
      ],
    };

    const response = await request(app)
      .post('/api/gl/accounts/import')
      .set('x-request-id', 'req-123')
      .set('content-type', 'application/json')
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ inserted: 2 });

    expect(spies.from).toHaveBeenCalledWith('ledger_accounts');
    expect(spies.upsert).toHaveBeenCalledWith(
      [
        {
          org_id: ORG_ID,
          entity_id: ENTITY_ID,
          code: '1000',
          name: 'Cash',
          type: 'ASSET',
          currency: 'EUR',
          active: true,
          parent_account_id: null,
        },
        {
          org_id: ORG_ID,
          entity_id: ENTITY_ID,
          code: '2000',
          name: 'Revenue',
          type: 'REVENUE',
          currency: 'EUR',
          active: false,
          parent_account_id: null,
        },
      ],
      { onConflict: 'org_id,entity_id,code' },
    );
    expect(logActivityMock).toHaveBeenCalledWith(supabase, {
      orgId: ORG_ID,
      userId: USER_ID,
      action: 'GL_ACCOUNTS_IMPORTED',
      entityType: 'LEDGER',
      entityId: ENTITY_ID,
      metadata: { count: 2 },
    });
    expect(guardState.current.respond).toHaveBeenCalledWith({ inserted: 2 });
  });

  it('returns validation errors for malformed account payloads', async () => {
    const { supabase } = createSupabaseMock();
    getServiceSupabaseClientMock.mockResolvedValue(supabase);

    const app = createLedgerApp();
    const response = await request(app)
      .post('/api/gl/accounts/import')
      .set('content-type', 'application/json')
      .send({ orgId: 'not-a-uuid', entityId: ENTITY_ID, userId: USER_ID, accounts: [] });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(guardState.current.respond).not.toHaveBeenCalled();
    expect(logActivityMock).not.toHaveBeenCalled();
  });

  it('surfaces Supabase failures when importing accounts', async () => {
    const { supabase, spies } = createSupabaseMock();
    spies.upsert.mockResolvedValueOnce({ error: { message: 'insert failed' } });
    getServiceSupabaseClientMock.mockResolvedValue(supabase);

    const guard = createGuardMocks();
    guardState.current = guard;

    const app = createLedgerApp();
    const response = await request(app)
      .post('/api/gl/accounts/import')
      .set('content-type', 'application/json')
      .send({
        orgId: ORG_ID,
        entityId: ENTITY_ID,
        userId: USER_ID,
        accounts: [{ code: '1000', name: 'Cash', type: 'ASSET', currency: 'EUR' }],
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'insert failed' });
    expect(guard.json).toHaveBeenCalledWith({ error: 'insert failed' }, { status: 500 });
    expect(logActivityMock).not.toHaveBeenCalled();
  });

  it('imports ledger entries and records activity', async () => {
    const { supabase, spies } = createSupabaseMock();
    getServiceSupabaseClientMock.mockResolvedValue(supabase);

    const app = createLedgerApp();
    const payload = {
      orgId: ORG_ID,
      entityId: ENTITY_ID,
      userId: USER_ID,
      periodId: PERIOD_ID,
      entries: [
        {
          date: '2024-01-31',
          accountId: ACCOUNT_ONE,
          debit: 100,
          credit: 0,
          currency: 'EUR',
          description: 'Invoice',
        },
        {
          date: '2024-01-31',
          accountId: ACCOUNT_TWO,
          debit: 0,
          credit: 100,
          currency: 'EUR',
          batchId: BATCH_ID,
        },
      ],
    };

    const response = await request(app)
      .post('/api/gl/entries/import')
      .set('content-type', 'application/json')
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ inserted: 2 });

    expect(spies.from).toHaveBeenCalledWith('ledger_entries');
    expect(spies.insert).toHaveBeenCalledWith(
      [
        {
          org_id: ORG_ID,
          entity_id: ENTITY_ID,
          period_id: PERIOD_ID,
          date: '2024-01-31',
          account_id: ACCOUNT_ONE,
          description: 'Invoice',
          debit: 100,
          credit: 0,
          currency: 'EUR',
          fx_rate: null,
          source: 'IMPORT',
          batch_id: null,
          created_by_user_id: USER_ID,
        },
        {
          org_id: ORG_ID,
          entity_id: ENTITY_ID,
          period_id: PERIOD_ID,
          date: '2024-01-31',
          account_id: ACCOUNT_TWO,
          description: null,
          debit: 0,
          credit: 100,
          currency: 'EUR',
          fx_rate: null,
          source: 'IMPORT',
          batch_id: BATCH_ID,
          created_by_user_id: USER_ID,
        },
      ],
    );
    expect(logActivityMock).toHaveBeenCalledWith(supabase, {
      orgId: ORG_ID,
      userId: USER_ID,
      action: 'GL_ENTRIES_IMPORTED',
      entityType: 'LEDGER',
      entityId: ENTITY_ID,
      metadata: { count: 2 },
    });
  });

  it('returns rate limit responses without touching persistence', async () => {
    const { supabase, spies } = createSupabaseMock();
    getServiceSupabaseClientMock.mockResolvedValue(supabase);

    const guard = createGuardMocks();
    guard.guard.rateLimitResponse = NextResponse.json({ error: 'rate_limit_exceeded' }, { status: 429 });
    guardState.current = guard;

    const app = createLedgerApp();
    const response = await request(app)
      .post('/api/gl/entries/import')
      .set('content-type', 'application/json')
      .send({
        orgId: ORG_ID,
        entityId: ENTITY_ID,
        userId: USER_ID,
        entries: [
          { date: '2024-01-01', accountId: ACCOUNT_ONE, debit: 10, credit: 0, currency: 'EUR' },
        ],
      });

    expect(response.status).toBe(429);
    expect(response.body).toEqual({ error: 'rate_limit_exceeded' });
    expect(spies.insert).not.toHaveBeenCalled();
    expect(logActivityMock).not.toHaveBeenCalled();
  });

  it('propagates Supabase insert failures for ledger entries', async () => {
    const { supabase, spies } = createSupabaseMock();
    spies.insert.mockResolvedValueOnce({ error: { message: 'duplicate key' } });
    getServiceSupabaseClientMock.mockResolvedValue(supabase);

    const guard = createGuardMocks();
    guardState.current = guard;

    const app = createLedgerApp();
    const response = await request(app)
      .post('/api/gl/entries/import')
      .set('content-type', 'application/json')
      .send({
        orgId: ORG_ID,
        entityId: ENTITY_ID,
        userId: USER_ID,
        entries: [
          { date: '2024-01-01', accountId: ACCOUNT_ONE, debit: 10, credit: 0, currency: 'EUR' },
        ],
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'duplicate key' });
    expect(guard.json).toHaveBeenCalledWith({ error: 'duplicate key' }, { status: 500 });
    expect(logActivityMock).not.toHaveBeenCalled();
  });
});
