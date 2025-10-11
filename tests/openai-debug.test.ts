import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createOpenAiDebugLogger } from '../services/rag/openai-debug';

describe('createOpenAiDebugLogger', () => {
  const fromMock = vi.fn();
  const supabase = { from: fromMock } as any;

  beforeEach(() => {
    fromMock.mockReset();
    vi.restoreAllMocks();
  });

  it('no-ops when disabled', async () => {
    const logger = createOpenAiDebugLogger({
      supabase,
      apiKey: undefined,
      enabled: false,
      fetchDetails: false,
      logError: vi.fn(),
    });
    await logger({ endpoint: 'responses.create', response: { id: 'resp_1' } });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('persists debug event without details', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockReturnValue({ upsert: upsertMock });

    const logger = createOpenAiDebugLogger({
      supabase,
      apiKey: undefined,
      enabled: true,
      fetchDetails: false,
      logError: vi.fn(),
      logInfo: vi.fn(),
    });

    await logger({ endpoint: 'responses.create', response: { id: 'resp_42', model: 'gpt', usage: { total_tokens: 10 } } });

    expect(fromMock).toHaveBeenCalledWith('openai_debug_events');
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request_id: 'resp_42',
        model: 'gpt',
        endpoint: 'responses.create',
        metadata: expect.objectContaining({
          tags: expect.arrayContaining(['endpoint:responses.create', 'model:gpt']),
          quota_tag: null,
        }),
      }),
      { onConflict: 'request_id' },
    );
  });

  it('fetches debug details when enabled', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockReturnValue({ upsert: upsertMock });

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ response: { status_code: 200 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    const logger = createOpenAiDebugLogger({
      supabase,
      apiKey: 'sk-test',
      enabled: true,
      fetchDetails: true,
      logError: vi.fn(),
      logInfo: vi.fn(),
    });

    await logger({ endpoint: 'responses.create', response: { id: 'resp_debug', model: 'gpt-4.1' } });

    expect(fetchSpy).toHaveBeenCalledWith('https://api.openai.com/v1/requests/resp_debug/debug', expect.any(Object));
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request_id: 'resp_debug',
        debug: expect.any(Object),
        metadata: expect.objectContaining({
          tags: expect.arrayContaining(['endpoint:responses.create', 'model:gpt-4.1', 'status:200']),
        }),
      }),
      { onConflict: 'request_id' },
    );
  });
});
