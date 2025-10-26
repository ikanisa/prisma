import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSupabaseStub } from '../stubs/supabase-client';

const completionCreateMock = vi.fn();
const completionRetrieveMock = vi.fn();
const completionUpdateMock = vi.fn();
const completionDeleteMock = vi.fn();
const completionListMock = vi.fn();
const completionMessagesListMock = vi.fn();

const openAiStub = {
  chat: {
    completions: {
      create: completionCreateMock,
      retrieve: completionRetrieveMock,
      update: completionUpdateMock,
      del: completionDeleteMock,
      list: completionListMock,
      messages: {
        list: completionMessagesListMock,
      },
    },
  },
};

const initialData: Record<string, any[]> = {
  organizations: [{ id: 'org-1', slug: 'acme' }],
  memberships: [{ org_id: 'org-1', user_id: 'user-123', role: 'SYSTEM_ADMIN' }],
  openai_debug_events: [],
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

const supabaseStub = createSupabaseStub(dataStore);

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

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => supabaseStub),
}));

vi.mock('@prisma-glow/lib/secrets', () => ({
  getSupabaseServiceRoleKey: vi.fn(async () => 'service-role-key'),
  getSupabaseJwtSecret: vi.fn(async () => 'test-jwt-secret'),
}));

vi.mock('@prisma-glow/lib/openai/client', () => ({
  getOpenAIClient: vi.fn(() => openAiStub),
}));

vi.mock('../../services/rag/openai-agent-service', () => ({
  syncAgentToolsFromRegistry: vi.fn(),
  isAgentPlatformEnabled: vi.fn(() => false),
  getOpenAiAgentId: vi.fn(),
  createAgentThread: vi.fn(),
  createAgentRun: vi.fn(),
}));

vi.mock('../../services/rag/knowledge/ingestion', () => ({
  scheduleLearningRun: vi.fn(),
  getDriveConnectorMetadata: vi.fn(),
  previewDriveDocuments: vi.fn(),
  processDriveChanges: vi.fn(),
  getConnectorIdForOrg: vi.fn(),
  triggerDriveBackfill: vi.fn(),
  downloadDriveFile: vi.fn(),
  isSupportedDriveMime: vi.fn(() => true),
  isManifestFile: vi.fn(() => false),
  parseManifestBuffer: vi.fn(),
}));

vi.mock('../../services/rag/knowledge/web', () => ({
  listWebSources: vi.fn(() => []),
  getWebSource: vi.fn(() => null),
}));

vi.mock('../../services/rag/chatkit-session-service', () => ({
  upsertChatkitSession: vi.fn(),
  cancelChatkitSession: vi.fn(),
  resumeChatkitSession: vi.fn(),
  fetchChatkitSession: vi.fn(),
  recordChatkitTranscript: vi.fn(),
  listChatkitTranscripts: vi.fn(() => ({ items: [] })),
}));

vi.mock('../../services/rag/openai-media', () => ({
  generateSoraVideo: vi.fn(),
}));

vi.mock('../../services/rag/openai-audio', () => ({
  transcribeAudioBuffer: vi.fn(),
  synthesizeSpeech: vi.fn(),
}));

vi.mock('../../services/rag/openai-realtime', () => ({
  createRealtimeSession: vi.fn(),
  getRealtimeTurnServers: vi.fn(() => ({ servers: [] })),
}));

let app: any;

function createMockResponse() {
  let statusCode = 200;
  let payload: any;
  const headers: Record<string, string> = {};
  const listeners: Record<string, Set<(...args: any[]) => void>> = {};
  const writes: string[] = [];
  let headersSent = false;
  let writableEnded = false;

  const res: any = {};
  res.status = vi.fn((code: number) => {
    statusCode = code;
    return res;
  });
  res.json = vi.fn((data: any) => {
    payload = data;
    headersSent = true;
    writableEnded = true;
    return res;
  });
  res.set = vi.fn((key: string, value: string) => res.setHeader(key, value));
  res.setHeader = vi.fn((key: string, value: string) => {
    headers[key.toLowerCase()] = value;
    headersSent = true;
    return res;
  });
  res.getHeader = (key: string) => headers[key.toLowerCase()];
  res.getStatus = () => statusCode;
  res.getBody = () => payload;
  res.getWrites = () => writes.slice();
  res.flushHeaders = vi.fn(() => {
    headersSent = true;
  });
  res.write = vi.fn((chunk: any) => {
    headersSent = true;
    writes.push(typeof chunk === 'string' ? chunk : String(chunk));
    return true;
  });
  res.end = vi.fn(() => {
    writableEnded = true;
    return res;
  });
  res.on = vi.fn((event: string, listener: (...args: any[]) => void) => {
    if (!listeners[event]) {
      listeners[event] = new Set();
    }
    listeners[event].add(listener);
    return res;
  });
  res.removeListener = vi.fn((event: string, listener: (...args: any[]) => void) => {
    listeners[event]?.delete(listener);
    return res;
  });
  res.emit = (event: string, ...args: any[]) => {
    if (event === 'close') {
      writableEnded = true;
    }
    for (const listener of listeners[event] ?? []) {
      listener(...args);
    }
  };
  Object.defineProperty(res, 'headersSent', {
    get: () => headersSent,
  });
  Object.defineProperty(res, 'writableEnded', {
    get: () => writableEnded,
  });
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

async function invokeRoute(
  method: string,
  path: string,
  options: {
    query?: Record<string, any>;
    body?: Record<string, any>;
    params?: Record<string, any>;
    headers?: Record<string, string>;
    user?: { sub?: string } | null;
  } = {},
) {
  const handler = findRouteHandler(method, path);
  const req: any = {
    method: method.toUpperCase(),
    query: options.query ?? {},
    body: options.body ?? {},
    params: options.params ?? {},
    headers: {
      authorization: options.headers?.authorization ?? 'Bearer test-token',
      ...(options.headers ?? {}),
    },
    header(name: string) {
      return this.headers[name.toLowerCase()];
    },
    get(name: string) {
      return this.header(name);
    },
    requestId: 'req-123',
  };
  if (options.user !== null) {
    req.user = options.user ?? { sub: 'user-123' };
  }

  const res = createMockResponse();
  await handler(req, res);
  return { status: res.getStatus(), body: res.getBody(), res };
}

beforeAll(async () => {
  process.env.SUPABASE_URL = 'https://stub.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  process.env.SUPABASE_JWT_SECRET = 'test-jwt-secret';
  process.env.OPENAI_API_KEY = 'sk-test';
  process.env.OPENAI_REQUEST_TAGS = 'proxy-tests';
  process.env.OPENAI_REQUEST_QUOTA_TAG = 'quota-integration';
  process.env.OPENAI_DEBUG_LOGGING = 'true';
  process.env.OPENAI_DEBUG_FETCH_DETAILS = 'false';
  process.env.API_RATE_LIMIT = '100';
  process.env.API_RATE_WINDOW_SECONDS = '60';

  resetDataStore();
  const module = await import('../../services/rag/index.ts');
  app = module.default;
});

beforeEach(() => {
  resetDataStore();
  completionCreateMock.mockReset();
  completionRetrieveMock.mockReset();
  completionUpdateMock.mockReset();
  completionDeleteMock.mockReset();
  completionListMock.mockReset();
  completionMessagesListMock.mockReset();
});

describe('OpenAI chat completion proxy endpoints', () => {
  it('rejects create requests without an authenticated user', async () => {
    const result = await invokeRoute('post', '/api/openai/chat-completions', {
      body: { orgSlug: 'acme', payload: {} },
      user: null,
    });

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ error: 'invalid session' });
    expect(completionCreateMock).not.toHaveBeenCalled();
  });

  it('streams chat completion chunks via SSE and records debug metadata', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const chunks = [
      {
        id: 'chat_stream',
        object: 'chat.completion.chunk',
        model: 'gpt-test',
        created: 1,
        choices: [
          {
            index: 0,
            delta: { content: 'Hello' },
            finish_reason: null,
            logprobs: null,
          },
        ],
      },
      {
        id: 'chat_stream',
        object: 'chat.completion.chunk',
        model: 'gpt-test',
        created: 1,
        choices: [
          {
            index: 0,
            delta: { content: '!' },
            finish_reason: 'stop',
            logprobs: null,
          },
        ],
        usage: { total_tokens: 5 },
      },
    ];

    const stream = {
      controller: { abort: vi.fn() },
      async *[Symbol.asyncIterator]() {
        for (const chunk of chunks) {
          yield chunk;
        }
      },
    };

    completionCreateMock.mockResolvedValue(stream);

    try {
      const result = await invokeRoute('post', '/api/openai/chat-completions', {
        body: {
          orgSlug: 'acme',
          payload: {
            model: 'gpt-test',
            messages: [{ role: 'user', content: 'Hello' }],
            stream: true,
          },
        },
      });

      expect(result.status).toBe(200);
      expect(completionCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gpt-test', stream: true }),
      );
      expect(result.res.getHeader('content-type')).toBe('text/event-stream');
      const writes = result.res.getWrites();
      expect(writes).toContain(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      expect(writes[writes.length - 1]).toBe('data: [DONE]\n\n');
      expect(dataStore.openai_debug_events).toHaveLength(1);
      expect(dataStore.openai_debug_events[0]).toMatchObject({
        request_id: 'chat_stream',
        metadata: {
          extras: expect.objectContaining({ orgSlug: 'acme', streaming: true }),
        },
      });

      const metricsLog = consoleSpy.mock.calls
        .map(([entry]) => {
          if (typeof entry !== 'string') return null;
          try {
            return JSON.parse(entry);
          } catch {
            return null;
          }
        })
        .find((payload) => payload?.msg === 'openai.chat_completion_stream_metrics');

      expect(metricsLog).toMatchObject({
        msg: 'openai.chat_completion_stream_metrics',
        status: 'completed',
        chunkCount: 2,
        heartbeatIntervalMs: expect.any(Number),
      });
      expect(metricsLog?.durationMs).toBeGreaterThanOrEqual(0);
      expect(metricsLog?.timeToFirstChunkMs).toBeGreaterThanOrEqual(0);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('aborts the upstream stream when the client disconnects mid-stream', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    let abortReject: (() => void) | undefined;

    try {
      const stream = {
        controller: {
          abort: vi.fn(() => {
            abortReject?.();
          }),
        },
        async *[Symbol.asyncIterator]() {
          yield {
            id: 'chat_stream_abort',
            object: 'chat.completion.chunk',
            model: 'gpt-test',
            created: 1,
            choices: [
              {
                index: 0,
                delta: { content: 'Hello' },
                finish_reason: null,
                logprobs: null,
              },
            ],
          };

          await new Promise<never>((_, reject) => {
            abortReject = () => reject(new Error('aborted'));
          });
        },
      };

      completionCreateMock.mockResolvedValue(stream);

      const handler = findRouteHandler('post', '/api/openai/chat-completions');
      const req: any = {
        method: 'POST',
        query: {},
        body: {
          orgSlug: 'acme',
          payload: {
            model: 'gpt-test',
            messages: [{ role: 'user', content: 'Hello' }],
            stream: true,
          },
        },
        params: {},
        headers: { authorization: 'Bearer test-token' },
        header(name: string) {
          return this.headers[name.toLowerCase()];
        },
        get(name: string) {
          return this.header(name);
        },
        user: { sub: 'user-123' },
        requestId: 'req-123',
      };
      const res = createMockResponse();

      const handlerPromise = handler(req, res);

      await new Promise((resolve) => setTimeout(resolve, 0));

      const writesBeforeClose = res.getWrites();
      expect(writesBeforeClose).not.toHaveLength(0);
      const firstPayload = writesBeforeClose[0]?.replace(/^data: /, '').trim();
      expect(firstPayload).toBeTruthy();
      const parsed = JSON.parse(firstPayload ?? '{}');
      expect(parsed).toMatchObject({
        type: 'chunk',
        data: expect.objectContaining({ id: 'chat_stream_abort' }),
      });

      res.emit('close');

      await handlerPromise;

      expect(stream.controller.abort).toHaveBeenCalledTimes(1);
      const writes = res.getWrites();
      expect(writes).not.toContain(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      expect(writes).not.toContain('data: [DONE]\n\n');

      const metricsLog = consoleSpy.mock.calls
        .map(([entry]) => {
          if (typeof entry !== 'string') return null;
          try {
            return JSON.parse(entry);
          } catch {
            return null;
          }
        })
        .find((payload) => payload?.msg === 'openai.chat_completion_stream_metrics');

      expect(metricsLog).toMatchObject({
        msg: 'openai.chat_completion_stream_metrics',
        status: 'client_disconnect',
        chunkCount: 1,
      });
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('creates a stored chat completion and logs Supabase debug metadata', async () => {
    const completion = {
      id: 'chat_123',
      object: 'chat.completion',
      model: 'gpt-test',
      created: 123,
      usage: { total_tokens: 42 },
    };
    completionCreateMock.mockResolvedValue(completion);

    const result = await invokeRoute('post', '/api/openai/chat-completions', {
      body: {
        orgSlug: 'acme',
        metadata: { source: 'integration-test' },
        tags: ['alpha'],
        quotaTag: 'quota-a',
        requestLogPayload: { request: true },
        payload: {
          model: 'gpt-test',
          store: true,
          messages: [{ role: 'user', content: 'Ping' }],
        },
      },
    });

    expect(result.status).toBe(201);
    expect(result.body).toEqual({ completion });
    expect(completionCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-test', store: true }),
    );
    expect(dataStore.openai_debug_events).toHaveLength(1);
    expect(dataStore.openai_debug_events[0]).toMatchObject({
      request_id: 'chat_123',
      endpoint: 'chat.completions.create',
      metadata: expect.objectContaining({
        quota_tag: 'quota-a',
        extras: expect.objectContaining({ orgSlug: 'acme' }),
      }),
    });
  });

  it('lists stored completions for the organisation', async () => {
    completionListMock.mockResolvedValue({
      data: [{ id: 'chat_a' }],
      has_more: false,
      nextPageParams: () => null,
    });

    const result = await invokeRoute('get', '/api/openai/chat-completions', {
      query: { orgSlug: 'acme', limit: '5' },
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ items: [{ id: 'chat_a' }], hasMore: false, nextCursor: null });
    expect(completionListMock).toHaveBeenCalledWith({ after: undefined, limit: 5, model: undefined });
  });

  it('retrieves a stored completion by id', async () => {
    const completion = { id: 'chat_42', object: 'chat.completion' };
    completionRetrieveMock.mockResolvedValue(completion);

    const result = await invokeRoute('get', '/api/openai/chat-completions/:id', {
      query: { orgSlug: 'acme' },
      params: { id: 'chat_42' },
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ completion });
    expect(completionRetrieveMock).toHaveBeenCalledWith('chat_42');
    expect(dataStore.openai_debug_events).toHaveLength(1);
    expect(dataStore.openai_debug_events[0].endpoint).toBe('chat.completions.retrieve');
  });

  it('updates metadata on a stored completion', async () => {
    const completion = { id: 'chat_55', object: 'chat.completion', metadata: { foo: 'bar' } };
    completionUpdateMock.mockResolvedValue(completion);

    const result = await invokeRoute('patch', '/api/openai/chat-completions/:id', {
      params: { id: 'chat_55' },
      body: { orgSlug: 'acme', metadata: { foo: 'bar' } },
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ completion });
    expect(completionUpdateMock).toHaveBeenCalledWith('chat_55', { metadata: { foo: 'bar' } });
    expect(dataStore.openai_debug_events).toHaveLength(1);
    expect(dataStore.openai_debug_events[0].endpoint).toBe('chat.completions.update');
  });

  it('deletes a stored completion', async () => {
    completionDeleteMock.mockResolvedValue({ id: 'chat_77', deleted: true, object: 'chat.completion.deleted' });

    const result = await invokeRoute('delete', '/api/openai/chat-completions/:id', {
      query: { orgSlug: 'acme' },
      params: { id: 'chat_77' },
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ deleted: true });
    expect(completionDeleteMock).toHaveBeenCalledWith('chat_77');
    expect(dataStore.openai_debug_events).toHaveLength(1);
    expect(dataStore.openai_debug_events[0].endpoint).toBe('chat.completions.delete');
  });

  it('lists stored messages for a completion', async () => {
    completionMessagesListMock.mockResolvedValue({
      data: [{ id: 'msg_1' }],
      has_more: true,
      nextPageParams: () => ({ after: 'cursor-2' }),
    });

    const result = await invokeRoute('get', '/api/openai/chat-completions/:id/messages', {
      query: { orgSlug: 'acme', after: 'cursor-1', order: 'desc' },
      params: { id: 'chat_90' },
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      items: [{ id: 'msg_1' }],
      hasMore: true,
      nextCursor: 'cursor-2',
    });
    expect(completionMessagesListMock).toHaveBeenCalledWith('chat_90', {
      after: 'cursor-1',
      limit: undefined,
      order: 'desc',
    });
  });
});
