import express from 'express';
import request from 'supertest';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ORG_ID = '11111111-2222-3333-4444-555555555555';

const recordActivityMock = vi.hoisted(() => vi.fn());
const supabaseAdminState = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('@/lib/tax/activity', () => ({
  recordActivity: recordActivityMock,
}));

vi.mock('@/lib/finance-review/supabase', () => ({
  supabaseAdmin: supabaseAdminState as unknown,
}));

function adaptHandler(handler: (request: NextRequest) => Promise<Response>) {
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
    const requestInit: RequestInit = { method: req.method, headers, body };
    const nextRequest = new NextRequest(url, requestInit);
    const response = await handler(nextRequest);
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

function createTaxApp() {
  const app = express();
  app.use(express.json());

  return app
    .post(
      '/api/tax/mt/cit/compute',
      adaptHandler((req) => import('@/app/api/tax/mt/cit/compute/route').then((m) => m.POST(req))),
    )
    .post(
      '/api/review/tax-risk',
      adaptHandler((req) => import('@/app/api/review/tax-risk/route').then((m) => m.POST(req))),
    );
}

type LedgerEntry = {
  id: string;
  account: string;
  date: string;
  memo: string | null;
  currency: string;
  debit: number | null;
  credit: number | null;
};

type TaxMapResult = { data: Array<unknown>; error?: { message: string } | null };

function createFinanceSupabaseMock({
  ledgerEntries,
  ledgerError = null,
  taxMappings,
}: {
  ledgerEntries: LedgerEntry[];
  ledgerError?: { message: string } | null;
  taxMappings: Map<string, TaxMapResult>;
}) {
  const ledgerQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn(async () => ({ data: ledgerEntries, error: ledgerError })),
  };

  const taxState: { orgId?: string; account?: string } = {};
  const taxQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockImplementation(function (this: typeof taxQuery, column: string, value: unknown) {
      if (column === 'org_id') taxState.orgId = String(value);
      if (column === 'account') taxState.account = String(value);
      return this;
    }),
    limit: vi.fn(async () => {
      const key = `${taxState.orgId ?? ''}:${taxState.account ?? ''}`;
      const result = taxMappings.get(key) ?? { data: [] };
      return { data: result.data, error: result.error ?? null };
    }),
  };

  supabaseAdminState.from.mockImplementation((table: string) => {
    if (table === 'ledger_entries') return ledgerQuery;
    if (table === 'tax_maps') return taxQuery;
    throw new Error(`Unexpected table ${table}`);
  });

  return { ledgerQuery, taxQuery };
}

describe('Tax service endpoints', () => {
  beforeEach(() => {
    vi.resetModules();
    recordActivityMock.mockReset();
    supabaseAdminState.from.mockReset();
  });

  it('computes Malta CIT and records activity', async () => {
    const app = createTaxApp();
    recordActivityMock.mockReturnValue({ id: 'activity-1' });

    const response = await request(app)
      .post('/api/tax/mt/cit/compute')
      .set('content-type', 'application/json')
      .send({
        scenario: 'Base case',
        revenue: 100000,
        deductions: 20000,
        taxRate: 0.35,
        adjustments: 5000,
        carryForwardLosses: 1000,
        preparedBy: 'finance.lead',
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('result.metrics.taxableIncome');
    expect(response.body).toHaveProperty('result.metrics.taxDue');
    expect(recordActivityMock).toHaveBeenCalledWith({
      module: expect.any(String),
      scenario: 'Base case',
      decision: expect.any(String),
      summary: 'Malta CIT computation executed',
      metrics: expect.objectContaining({ taxDue: expect.any(Number) }),
      actor: 'finance.lead',
    });
  });

  it('rejects invalid CIT payloads', async () => {
    const app = createTaxApp();
    const response = await request(app)
      .post('/api/tax/mt/cit/compute')
      .set('content-type', 'application/json')
      .send({ scenario: '', revenue: 'NaN', deductions: 1000, taxRate: 2 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      expect.objectContaining({ error: 'Validation failed' }),
    );
  });

  it('identifies tax mapping gaps from recent ledger entries', async () => {
    const app = createTaxApp();
    const mappings = new Map<string, TaxMapResult>();
    mappings.set(`${ORG_ID}:4000`, { data: [] });
    mappings.set(`${ORG_ID}:5000`, { data: [{ id: 'map-1' }] });

    createFinanceSupabaseMock({
      ledgerEntries: [
        {
          id: 'entry-1',
          account: '4000',
          date: '2024-01-31',
          memo: 'VAT expense',
          currency: 'EUR',
          debit: 120,
          credit: 0,
        },
        {
          id: 'entry-2',
          account: '5000',
          date: '2024-01-31',
          memo: 'Withholding',
          currency: 'EUR',
          debit: 0,
          credit: 120,
        },
      ],
      taxMappings: mappings,
    });

    const response = await request(app)
      .post('/api/review/tax-risk')
      .set('content-type', 'application/json')
      .send({ orgId: ORG_ID, limit: 5 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        count: 1,
        accounts_checked: 2,
        items: [
          expect.objectContaining({ account: '4000', sample_entry_id: 'entry-1' }),
        ],
      }),
    );
  });

  it('propagates ledger fetch failures', async () => {
    const app = createTaxApp();
    createFinanceSupabaseMock({
      ledgerEntries: [],
      ledgerError: { message: 'timeout' },
      taxMappings: new Map(),
    });

    const response = await request(app)
      .post('/api/review/tax-risk')
      .set('content-type', 'application/json')
      .send({ orgId: ORG_ID });

    expect(response.status).toBe(500);
    expect(response.body).toEqual(
      expect.objectContaining({ error: 'Internal server error' }),
    );
  });

  it('returns validation errors for invalid tax risk payloads', async () => {
    const app = createTaxApp();
    const response = await request(app)
      .post('/api/review/tax-risk')
      .set('content-type', 'application/json')
      .send({ limit: 10000 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      expect.objectContaining({ error: 'Invalid request' }),
    );
  });
});
