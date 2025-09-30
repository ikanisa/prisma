import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('pdf-parse', () => ({
  default: async () => ({ text: '' }),
}));

vi.mock('pg', () => ({
  Client: class {
    async connect() {}
    async query() {
      return { rows: [] };
    }
    async end() {}
  },
}));

vi.mock('openai', () => {
  class OpenAIStub {
    embeddings = {
      create: async () => ({ data: [{ embedding: [] }] }),
    };
    responses = {
      create: async () => ({}),
    };
  }
  return {
    default: OpenAIStub,
    OpenAI: OpenAIStub,
  };
});

const initialData: Record<string, any[]> = {
  organizations: [
    { id: 'org-1', slug: 'acme' },
  ],
  memberships: [
    { org_id: 'org-1', user_id: 'user-123', role: 'SYSTEM_ADMIN' },
  ],
  agent_learning_jobs: [
    {
      id: 'job-1',
      org_id: 'org-1',
      kind: 'query_hint_add',
      status: 'PENDING',
      payload: {
        reason: 'run_success_rate_below_threshold',
        suggestion: {
          hint_type: 'allowlist',
          phrase: 'site:legifrance.gouv.fr',
          weight: 1.1,
          juris_code: 'FR',
        },
      },
      result: null,
      policy_version_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      processed_at: null,
    },
  ],
  agent_policy_versions: [
    {
      id: 'policy-1',
      org_id: 'org-1',
      version: 1,
      status: 'active',
      summary: 'Initial policy',
      diff: {},
      approved_by: 'user-123',
      approved_at: new Date().toISOString(),
      rolled_back_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  learning_metrics: [
    {
      id: 'metric-1',
      org_id: 'org-1',
      window_name: '24h',
      metric: 'run_success_rate',
      value: 0.88,
      dims: { total_runs: 5, completed_runs: 4, failed_runs: 1 },
      computed_at: new Date().toISOString(),
    },
  ],
  query_hints: [
    {
      id: 'hint-1',
      org_id: 'org-1',
      policy_version_id: 'policy-1',
      hint_type: 'allowlist',
      phrase: 'site:example.com',
      weight: 1.0,
      juris_code: null,
      topic: null,
      activated_at: new Date().toISOString(),
    },
  ],
  citation_canonicalizer: [
    {
      id: 'canon-1',
      org_id: 'org-1',
      pattern: 'http://',
      replacement: 'https://',
      jurisdiction: null,
      activated_at: new Date().toISOString(),
      policy_version_id: 'policy-1',
    },
  ],
  denylist_deboost: [
    {
      id: 'deny-1',
      org_id: 'org-1',
      juris_code: null,
      reason: 'non-official source',
      pattern: 'unofficial.example',
      action: 'deboost',
      weight: null,
      activated_at: new Date().toISOString(),
      policy_version_id: 'policy-1',
    },
  ],
  learning_signals: [],
};

const dataStore: Record<string, any[]> = {};

function resetDataStore() {
  for (const key of Object.keys(dataStore)) {
    delete dataStore[key];
  }
  for (const [key, value] of Object.entries(initialData)) {
    dataStore[key] = value.map((item) => JSON.parse(JSON.stringify(item)));
  }
}

function applyFilters(rows: any[], filters: Array<{ type: string; field: string; value?: any; values?: any[]; op?: string }>) {
  return rows.filter((row) => {
    for (const filter of filters) {
      const value = row[filter.field];
      if (filter.type === 'eq' && value !== filter.value) {
        return false;
      }
      if (filter.type === 'in' && !filter.values!.includes(value)) {
        return false;
      }
      if (filter.type === 'gte' && String(value) < String(filter.value)) {
        return false;
      }
      if (filter.type === 'not') {
        if (filter.op === 'is' && filter.value === null && value === null) {
          return false;
        }
      }
    }
    return true;
  });
}

class TableOperation {
  private filters: Array<{ type: string; field: string; value?: any; values?: any[]; op?: string }> = [];
  private ordering: { field: string; ascending: boolean } | null = null;
  private limitValue: number | null = null;
  private singleMode: 'single' | 'maybe' | null = null;
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: any = null;

  constructor(private readonly table: string) {}

  select() {
    this.action = 'select';
    return this;
  }

  insert(payload: any) {
    this.action = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: any) {
    this.action = 'update';
    this.payload = payload;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push({ type: 'eq', field, value });
    return this;
  }

  in(field: string, values: any[]) {
    this.filters.push({ type: 'in', field, values });
    return this;
  }

  gte(field: string, value: any) {
    this.filters.push({ type: 'gte', field, value });
    return this;
  }

  not(field: string, op: string, value: any) {
    this.filters.push({ type: 'not', field, op, value });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.ordering = { field, ascending: options?.ascending !== false };
    return this;
  }

  limit(value: number) {
    this.limitValue = value;
    return this;
  }

  maybeSingle() {
    this.singleMode = 'maybe';
    return this;
  }

  single() {
    this.singleMode = 'single';
    return this;
  }

  private clone(row: any) {
    return JSON.parse(JSON.stringify(row));
  }

  private async execute() {
    const rows = dataStore[this.table] ?? [];
    if (this.action === 'select') {
      let result = applyFilters(rows, this.filters).map((row) => this.clone(row));
      if (this.ordering) {
        const { field, ascending } = this.ordering;
        result.sort((a, b) => {
          const av = a[field];
          const bv = b[field];
          if (av === bv) return 0;
          return (av > bv ? 1 : -1) * (ascending ? 1 : -1);
        });
      }
      if (this.limitValue != null) {
        result = result.slice(0, this.limitValue);
      }
      if (this.singleMode) {
        return { data: result[0] ?? null, error: null };
      }
      return { data: result, error: null };
    }

    if (this.action === 'insert') {
      const payloadArray = Array.isArray(this.payload) ? this.payload : [this.payload];
      const inserted = payloadArray.map((item: any) => {
        const copy = { ...item };
        if (!copy.id) {
          copy.id = `mock-${Math.random().toString(36).slice(2)}`;
        }
        if (!copy.created_at) {
          copy.created_at = new Date().toISOString();
        }
        if (!copy.updated_at) {
          copy.updated_at = copy.created_at;
        }
        return copy;
      });
      if (!dataStore[this.table]) {
        dataStore[this.table] = [];
      }
      dataStore[this.table].push(...inserted);
      return { data: inserted, error: null };
    }

    if (this.action === 'update') {
      const result = applyFilters(rows, this.filters);
      for (const row of rows) {
        if (result.includes(row)) {
          Object.assign(row, this.payload, { updated_at: new Date().toISOString() });
        }
      }
      return { data: result.map((row) => this.clone(row)), error: null };
    }

    if (this.action === 'delete') {
      const remaining = applyFilters(rows, this.filters);
      dataStore[this.table] = rows.filter((row) => !remaining.includes(row));
      return { data: [], error: null };
    }

    return { data: [], error: null };
  }

  then(resolve: any, reject: any) {
    return this.execute().then(resolve, reject);
  }
}

const supabaseStub = {
  from(table: string) {
    return new TableOperation(table);
  },
  storage: {
    async getBucket() {
      return { data: { id: 'documents' }, error: null };
    },
    async createBucket() {
      return { data: null, error: null };
    },
  },
  channel() {
    const channelObj: any = {
      on: () => channelObj,
      subscribe: (handler?: (status: string) => void) => {
        handler?.('SUBSCRIBED');
        return { unsubscribe() {} };
      },
    };
    return channelObj;
  },
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => supabaseStub),
}));

let app: any;

function createMockResponse() {
  let statusCode = 200;
  let payload: any;
  const res: any = {};
  res.status = vi.fn((code: number) => {
    statusCode = code;
    return res;
  });
  res.json = vi.fn((data: any) => {
    payload = data;
    return res;
  });
  res.send = vi.fn((data: any) => {
    payload = data;
    return res;
  });
  res.getStatus = () => statusCode;
  res.getBody = () => payload;
  return res;
}

function findRouteHandler(method: string, path: string) {
  const stack = app._router.stack as any[];
  for (const layer of stack) {
    if (!layer.route) continue;
    if (layer.route.path === path && layer.route.methods[method.toLowerCase()]) {
      return layer.route.stack[0].handle;
    }
  }
  throw new Error(`Route handler not found for ${method.toUpperCase()} ${path}`);
}

async function invokeRoute(method: string, path: string, options: { query?: any; body?: any } = {}) {
  const handler = findRouteHandler(method, path);
  const req: any = {
    method: method.toUpperCase(),
    query: options.query ?? {},
    body: options.body ?? {},
    headers: { authorization: 'Bearer stub' },
    header(name: string) {
      return this.headers[name.toLowerCase()];
    },
    get(name: string) {
      return this.header(name);
    },
    user: { sub: 'user-123' },
    json: async () => options.body ?? {},
  };
  const res = createMockResponse();
  await handler(req, res);
  return { status: res.getStatus(), body: res.getBody() };
}

beforeAll(async () => {
  process.env.SUPABASE_URL = 'https://stub.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  process.env.SUPABASE_JWT_SECRET = 'test-secret';
  process.env.OPENAI_API_KEY = 'test-openai';
  resetDataStore();
  const module = await import('../../services/rag/index.ts');
  app = module.default;
});

afterEach(() => {
  resetDataStore();
});

describe('Learning API endpoints', () => {
  it('lists pending learning jobs', async () => {
    const res = await invokeRoute('get', '/api/learning/jobs', {
      query: { orgSlug: 'acme' },
    });
    expect(res.status).toBe(200);
    expect(res.body.jobs).toHaveLength(1);
    expect(res.body.jobs[0].status).toBe('PENDING');
  });

  it('approves a learning job and transitions it to READY', async () => {
    const res = await invokeRoute('post', '/api/learning/approve', {
      body: { orgSlug: 'acme', jobId: 'job-1' },
    });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('READY');
    const jobsRes = await invokeRoute('get', '/api/learning/jobs', {
      query: { orgSlug: 'acme', status: 'READY' },
    });
    expect(jobsRes.body.jobs[0].status).toBe('READY');
    expect(dataStore.learning_signals.length).toBeGreaterThan(0);
  });

  it('returns policy versions and metrics', async () => {
    const policiesRes = await invokeRoute('get', '/api/learning/policies', {
      query: { orgSlug: 'acme' },
    });
    expect(policiesRes.status).toBe(200);
    expect(policiesRes.body.policies).toHaveLength(1);

    const metricsRes = await invokeRoute('get', '/api/learning/metrics', {
      query: { orgSlug: 'acme', metric: 'run_success_rate' },
    });
    expect(metricsRes.status).toBe(200);
    expect(metricsRes.body.metrics[0].metric).toBe('run_success_rate');
  });

  it('rolls back a policy version and removes associated artifacts', async () => {
    const res = await invokeRoute('post', '/api/learning/rollback', {
      body: { orgSlug: 'acme', policyVersionId: 'policy-1' },
    });
    expect(res.status).toBe(200);
    const policy = dataStore.agent_policy_versions.find((p) => p.id === 'policy-1');
    expect(policy?.status).toBe('rolled_back');
    expect(dataStore.query_hints.length).toBe(0);
    expect(dataStore.citation_canonicalizer.length).toBe(0);
    expect(dataStore.denylist_deboost.length).toBe(0);
  });
});
