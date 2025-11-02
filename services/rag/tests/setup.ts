import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { vi } from 'vitest';

type QueryResult = {
  data: any;
  error: any;
  status?: number;
  count?: number | null;
};

type ResponseProvider =
  | QueryResult
  | (() => QueryResult | Promise<QueryResult>)
  | Array<QueryResult | (() => QueryResult | Promise<QueryResult>)>;

type TableConfig = {
  default?: ResponseProvider;
  maybeSingle?: ResponseProvider;
  single?: ResponseProvider;
  insert?: ResponseProvider;
};

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.ENVIRONMENT = process.env.ENVIRONMENT ?? 'test';
process.env.SERVICE_VERSION = process.env.SERVICE_VERSION ?? 'test';
process.env.OTEL_SERVICE_NAME = process.env.OTEL_SERVICE_NAME ?? 'rag-service-test';
process.env.SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'service-role-key';
process.env.SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? 'test-jwt-secret';
process.env.SUPABASE_JWT_AUDIENCE = process.env.SUPABASE_JWT_AUDIENCE ?? 'authenticated';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? 'sk-test';
process.env.API_RATE_LIMIT = process.env.API_RATE_LIMIT ?? '120';
process.env.API_RATE_WINDOW_SECONDS = process.env.API_RATE_WINDOW_SECONDS ?? '60';
delete process.env.EMBEDDING_ALERT_WEBHOOK;
delete process.env.TELEMETRY_ALERT_WEBHOOK;
delete process.env.RATE_LIMIT_ALERT_WEBHOOK;
delete process.env.ERROR_NOTIFY_WEBHOOK;
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://user:pass@localhost:5432/test';

const defaultQueryResult: QueryResult = { data: null, error: null, status: 200, count: null };

class SupabaseMock {
  private tableConfigs = new Map<string, TableConfig>();
  private inserts = new Map<string, any[]>();
  private updates = new Map<string, any[]>();
  private upserts = new Map<string, any[]>();

  readonly client = {
    from: (table: string) => this.createQueryChain(table),
    rpc: vi.fn(async () => ({ data: null, error: null })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
      })),
    })),
    storage: {
      getBucket: vi.fn(async () => ({ data: { name: 'documents' }, error: null })),
      createBucket: vi.fn(async () => ({ data: { name: 'documents' }, error: null })),
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ data: null, error: null })),
        download: vi.fn(async () => ({ data: null, error: null })),
        remove: vi.fn(async () => ({ data: null, error: null })),
        list: vi.fn(async () => ({ data: [], error: null })),
      })),
    },
  };

  reset(): void {
    this.tableConfigs.clear();
    this.inserts.clear();
    this.updates.clear();
    this.upserts.clear();
  }

  configure(table: string, config: TableConfig): void {
    const existing = this.tableConfigs.get(table) ?? {};
    this.tableConfigs.set(table, { ...existing, ...config });
  }

  getInsertions(table: string): any[] {
    return this.inserts.get(table) ?? [];
  }

  private record(map: Map<string, any[]>, table: string, payload: any): void {
    const entry = map.get(table) ?? [];
    entry.push(payload);
    map.set(table, entry);
  }

  private async resolve(table: string, method: keyof TableConfig): Promise<QueryResult> {
    const config = this.tableConfigs.get(table);
    let provider = config?.[method] ?? config?.default;
    if (!provider && method === 'insert') {
      provider = { data: { id: randomUUID() }, error: null };
    }
    const result = await this.consume(provider);
    return result ?? defaultQueryResult;
  }

  private async consume(provider?: ResponseProvider): Promise<QueryResult | null> {
    if (!provider) return null;
    if (Array.isArray(provider)) {
      const next = provider.shift();
      return this.consume(next as ResponseProvider | undefined);
    }
    if (typeof provider === 'function') {
      const value = await provider();
      return value ?? defaultQueryResult;
    }
    return provider ?? defaultQueryResult;
  }

  private createInsertSelectChain(table: string): any {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get: (_target, prop) => {
        if (prop === 'single' || prop === 'maybeSingle') {
          return async () => this.resolve(table, 'insert');
        }
        return () => new Proxy({}, handler);
      },
    };
    return new Proxy({}, handler);
  }

  private createInsertChain(table: string): any {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get: (_target, prop) => {
        if (prop === 'select') {
          return () => this.createInsertSelectChain(table);
        }
        if (prop === 'single' || prop === 'maybeSingle') {
          return async () => this.resolve(table, 'insert');
        }
        return () => new Proxy({}, handler);
      },
    };
    return new Proxy({}, handler);
  }

  private createQueryChain(table: string): any {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get: (_target, prop) => {
        if (prop === 'maybeSingle') {
          return async () => this.resolve(table, 'maybeSingle');
        }
        if (prop === 'single') {
          return async () => this.resolve(table, 'single');
        }
        if (prop === 'insert') {
          return (payload: any) => {
            this.record(this.inserts, table, payload);
            return this.createInsertChain(table);
          };
        }
        if (prop === 'update') {
          return (payload: any) => {
            this.record(this.updates, table, payload);
            return new Proxy({}, handler);
          };
        }
        if (prop === 'upsert') {
          return (payload: any) => {
            this.record(this.upserts, table, payload);
            return new Proxy({}, handler);
          };
        }
        if (prop === 'delete' || prop === 'order' || prop === 'limit' || prop === 'eq' || prop === 'neq' || prop === 'lte' || prop === 'gte' || prop === 'is' || prop === 'filter' || prop === 'match' || prop === 'not' || prop === 'contains' || prop === 'overlaps' || prop === 'like' || prop === 'ilike' || prop === 'textSearch' || prop === 'returns' || prop === 'range' || prop === 'in' || prop === 'throwOnError' || prop === 'orderBy' || prop === 'count' || prop === 'on') {
          return () => new Proxy({}, handler);
        }
        if (prop === 'select') {
          return () => new Proxy({}, handler);
        }
        return undefined;
      },
    };
    return new Proxy({}, handler);
  }
}

export const supabaseMock = new SupabaseMock();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => supabaseMock.client),
}));

vi.mock('@prisma-glow/lib/secrets', () => ({
  getSupabaseJwtSecret: vi.fn(async () => process.env.SUPABASE_JWT_SECRET ?? 'test-jwt-secret'),
  getSupabaseServiceRoleKey: vi.fn(async () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'service-role-key'),
}));

vi.mock('@prisma-glow/analytics', () => ({
  createAnalyticsClient: vi.fn(() => ({
    track: vi.fn(),
    flush: vi.fn(),
  })),
}));

vi.mock('@prisma-glow/lib/security/signed-url-policy', () => ({
  getSignedUrlTTL: () => 60,
}));

vi.mock('@prisma-glow/agents/runtime', () => ({
  generateAgentPlan: vi.fn(async () => ({ steps: [] })),
}));

vi.mock('@prisma-glow/agents/types', () => ({
  roleFromString: (role: string) => role,
  ROLE_PRIORITY: {
    SYSTEM_ADMIN: 3,
    MANAGER: 2,
    STAFF: 1,
    REVIEWER: 1,
    OBSERVER: 0,
  },
}));

const createOpenAiProxy = () =>
  new Proxy(() => {}, {
    get: () => createOpenAiProxy(),
    apply: () => Promise.resolve({}),
  });

vi.mock('@prisma-glow/lib/openai/client', () => ({
  getOpenAIClient: vi.fn(() => createOpenAiProxy()),
}));

vi.mock('@prisma-glow/lib/openai/file-search', () => ({
  runOpenAiFileSearch: vi.fn(async () => ({ results: [] })),
}));

vi.mock('@prisma-glow/lib/openai/workloads', () => ({
  readOpenAiWorkloadEnv: vi.fn(() => ({ workload: 'standard', requestTags: [] })),
}));

vi.mock('pg', () => ({
  Client: vi.fn(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    end: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue({ rows: [] }),
  })),
}));

global.fetch = vi.fn(async () => ({
  ok: true,
  status: 200,
  json: async () => ({}),
  text: async () => '',
})) as unknown as typeof fetch;

vi.mock('pdf-parse', () => ({
  default: vi.fn(async () => ({ text: '', numpages: 0 })),
}));

const modulePaths = vi.hoisted(() => {
  const repoRoot = new URL('../../../', import.meta.url);
  const ragRoot = new URL('../', import.meta.url);
  const resolveRepoModule = (relative: string) => new URL(relative, repoRoot).pathname;
  const resolveRagModule = (relative: string) => new URL(relative, ragRoot).pathname;

  return {
    analyticsEvents: resolveRepoModule('analytics/events/node.js'),
    notificationsFanout: resolveRagModule('./notifications/fanout.js'),
    mcpBootstrap: resolveRagModule('./mcp/bootstrap.js'),
    knowledgeIngestion: resolveRagModule('./knowledge/ingestion.js'),
    knowledgeWeb: resolveRagModule('./knowledge/web.js'),
    systemConfig: resolveRagModule('./system-config.js'),
    approvalService: resolveRagModule('./approval-service.js'),
    openaiDebug: resolveRagModule('./openai-debug.js'),
    openaiAgentService: resolveRagModule('./openai-agent-service.js'),
    openaiStream: resolveRagModule('./openai-stream.js'),
    openaiConversations: resolveRagModule('./openai-conversations.js'),
    agentRecorder: resolveRagModule('./agent-conversation-recorder.js'),
    openaiRealtime: resolveRagModule('./openai-realtime.js'),
    openaiMedia: resolveRagModule('./openai-media.js'),
    openaiAudio: resolveRagModule('./openai-audio.js'),
    chatkitService: resolveRagModule('./chatkit-session-service.js'),
    readiness: resolveRagModule('./readiness.js'),
    vector: resolveRagModule('./vector.js'),
  };
});

vi.mock(modulePaths.analyticsEvents, () => {
  class AnalyticsEventValidationError extends Error {}
  return {
    AnalyticsEventValidationError,
    buildAutonomyTelemetryEvent: () => ({}),
    buildTelemetryAlertEvent: () => ({}),
    autonomyTelemetryRowFromEvent: () => ({}),
    telemetryAlertRowFromEvent: () => ({}),
    recordEventOnSpan: () => {},
  };
});

vi.mock(modulePaths.notificationsFanout, () => ({
  scheduleUrgentNotificationFanout: vi.fn(),
  startNotificationFanoutWorker: vi.fn(),
}));

vi.mock(modulePaths.mcpBootstrap, () => ({
  initialiseMcpInfrastructure: vi.fn(),
}));

vi.mock(modulePaths.knowledgeIngestion, () => ({
  scheduleLearningRun: vi.fn(),
  getDriveConnectorMetadata: vi.fn(),
  previewDriveDocuments: vi.fn(),
  processDriveChanges: vi.fn(),
  getConnectorIdForOrg: vi.fn(),
  triggerDriveBackfill: vi.fn(),
  downloadDriveFile: vi.fn(),
  isSupportedDriveMime: vi.fn(() => true),
  isManifestFile: vi.fn(() => false),
  parseManifestBuffer: vi.fn(() => ({})),
}));

vi.mock(modulePaths.knowledgeWeb, () => ({
  listWebSources: vi.fn(async () => []),
  getWebSource: vi.fn(async () => null),
}));

vi.mock(modulePaths.systemConfig, () => ({
  getUrlSourceSettings: vi.fn(async () => ({})),
}));

vi.mock(modulePaths.approvalService, () => ({
  APPROVAL_ACTION_LABELS: {},
  createAgentActionApproval: vi.fn(async () => 'approval-id'),
  insertAgentAction: vi.fn(async () => 'action-id'),
  normalizeApprovalAction: (kind: string) => kind,
  reshapeApprovalRow: (row: Record<string, unknown>) => row,
}));

vi.mock(modulePaths.openaiDebug, () => ({
  createOpenAiDebugLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock(modulePaths.openaiAgentService, () => ({
  syncAgentToolsFromRegistry: vi.fn(),
  isAgentPlatformEnabled: vi.fn(() => true),
  getOpenAiAgentId: vi.fn(async () => 'agent-id'),
  createAgentThread: vi.fn(async () => ({ id: 'thread-id' })),
  createAgentRun: vi.fn(async () => ({ id: 'run-id' })),
}));

vi.mock(modulePaths.openaiStream, () => ({
  streamOpenAiResponse: vi.fn(),
}));

vi.mock(modulePaths.openaiConversations, () => ({
  createConversationItems: vi.fn(),
  deleteConversation: vi.fn(),
  getConversation: vi.fn(),
  listConversationItems: vi.fn(),
  listConversations: vi.fn(),
}));

vi.mock(modulePaths.agentRecorder, () => ({
  AgentConversationRecorder: class {
    record = vi.fn();
  },
}));

vi.mock(modulePaths.openaiRealtime, () => ({
  createRealtimeSession: vi.fn(async () => ({ id: 'session-id' })),
  getRealtimeTurnServers: vi.fn(async () => []),
}));

vi.mock(modulePaths.openaiMedia, () => ({
  generateSoraVideo: vi.fn(async () => ({ url: 'https://example.com/video.mp4' })),
}));

vi.mock(modulePaths.openaiAudio, () => ({
  transcribeAudioBuffer: vi.fn(async () => ({ text: '' })),
  synthesizeSpeech: vi.fn(async () => Buffer.from('')),
}));

vi.mock(modulePaths.chatkitService, () => ({
  upsertChatkitSession: vi.fn(),
  cancelChatkitSession: vi.fn(),
  resumeChatkitSession: vi.fn(),
  fetchChatkitSession: vi.fn(),
  recordChatkitTranscript: vi.fn(),
  listChatkitTranscripts: vi.fn(async () => []),
}));

vi.mock(modulePaths.readiness, () => ({
  buildReadinessSummary: vi.fn(() => ({ status: 'ready' })),
}));

vi.mock(modulePaths.vector, () => ({
  vector: (value: unknown) => value,
}));

export function configureSupabaseTable(table: string, config: TableConfig): void {
  supabaseMock.configure(table, config);
}

export function resetSupabase(): void {
  supabaseMock.reset();
}

export function getSupabaseInsertions(table: string): any[] {
  return supabaseMock.getInsertions(table);
}

export function createAuthHeader(payload: Partial<jwt.JwtPayload> = {}): string {
  const secret = process.env.SUPABASE_JWT_SECRET ?? 'test-jwt-secret';
  const audience = process.env.SUPABASE_JWT_AUDIENCE ?? 'authenticated';
  const { aud: _ignoredAud, sub, ...claims } = payload;
  const token = jwt.sign(
    {
      ...claims,
      sub: sub ?? 'user-123',
    },
    secret,
    { algorithm: 'HS256', expiresIn: '10m', audience }
  );
  return `Bearer ${token}`;
}

