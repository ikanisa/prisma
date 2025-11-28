import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  listConversations,
  ConversationItemInput,
  createConversation,
  createConversationItems,
  deleteConversation,
  deleteConversationItem,
  getConversation,
  getConversationItem,
  listConversationItems,
  updateConversation,
} from '../services/rag/openai-conversations';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function successResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), { status: 200 });
}

describe('openai conversations service', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws when API key missing', async () => {
    const logError = vi.fn();
    await expect(
      createConversation({
        logError,
      }),
    ).rejects.toThrow(/OpenAI API key is required/);
    expect(logError).not.toHaveBeenCalled();
  });

  it('omits request body when no metadata or items provided', async () => {
    fetchMock.mockResolvedValue(successResponse({ id: 'conv_empty', object: 'conversation', created_at: 1 }));
    await createConversation({
      openAiApiKey: 'sk-test',
      logError: vi.fn(),
      logInfo: vi.fn(),
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });

  it('creates a conversation with metadata', async () => {
    fetchMock.mockResolvedValue(
      successResponse({ id: 'conv_123', object: 'conversation', created_at: 1, metadata: { topic: 'demo' } }),
    );
    const logInfo = vi.fn();
    const conversation = await createConversation({
      openAiApiKey: 'sk-test',
      metadata: { topic: 'demo' },
      logError: vi.fn(),
      logInfo,
    });

    expect(conversation.id).toBe('conv_123');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/conversations');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer sk-test',
      'Content-Type': 'application/json',
    });
    expect(init.body).toBe(JSON.stringify({ metadata: { topic: 'demo' } }));
    expect(logInfo).toHaveBeenCalledWith('openai.conversation_created', { conversationId: 'conv_123' });
  });

  it('retrieves and updates a conversation', async () => {
    fetchMock
      .mockResolvedValueOnce(successResponse({ id: 'conv_1', object: 'conversation', created_at: 1 }))
      .mockResolvedValueOnce(successResponse({ id: 'conv_1', object: 'conversation', created_at: 1, metadata: { stage: 'qa' } }));

    await getConversation({
      conversationId: 'conv_1',
      openAiApiKey: 'sk-test',
      logError: vi.fn(),
      logInfo: vi.fn(),
    });

    const [, getInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(getInit.method).toBe('GET');

    await updateConversation({
      conversationId: 'conv_1',
      metadata: { stage: 'qa' },
      openAiApiKey: 'sk-test',
      logError: vi.fn(),
      logInfo: vi.fn(),
    });

    const [updateUrl, updateInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(updateUrl).toBe('https://api.openai.com/v1/conversations/conv_1');
    expect(updateInit.method).toBe('POST');
    expect(updateInit.body).toBe(JSON.stringify({ metadata: { stage: 'qa' } }));
  });

  it('lists conversation items with filters', async () => {
    fetchMock.mockResolvedValue(
      successResponse({ object: 'list', data: [{ id: 'item_1', object: 'conversation.item', type: 'message' }] }),
    );
    const logInfo = vi.fn();
    const result = await listConversationItems({
      conversationId: 'conv_list',
      limit: 10,
      order: 'asc',
      include: ['message.output_text.logprobs', 'code_interpreter_call.outputs'],
      openAiApiKey: 'sk-test',
      logError: vi.fn(),
      logInfo,
    });

    expect(result.data).toHaveLength(1);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/v1/conversations/conv_list/items');
    expect(parsed.searchParams.get('limit')).toBe('10');
    expect(parsed.searchParams.get('order')).toBe('asc');
    expect(parsed.searchParams.getAll('include')).toEqual([
      'message.output_text.logprobs',
      'code_interpreter_call.outputs',
    ]);
    expect(logInfo).toHaveBeenCalledWith('openai.conversation_items_listed', {
      conversationId: 'conv_list',
      itemCount: 1,
    });
  });

  it('lists conversations with limit and order', async () => {
    fetchMock.mockResolvedValue(
      successResponse({
        object: 'list',
        data: [
          { id: 'conv_1', object: 'conversation', created_at: 1, metadata: { topic: 'one' } },
          { id: 'conv_2', object: 'conversation', created_at: 2, metadata: { topic: 'two' } },
        ],
        has_more: false,
      }),
    );

    const logInfo = vi.fn();
    const response = await listConversations({
      limit: 25,
      order: 'asc',
      openAiApiKey: 'sk-test',
      logError: vi.fn(),
      logInfo,
    });

    expect(response.data).toHaveLength(2);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/v1/conversations');
    expect(parsed.searchParams.get('limit')).toBe('25');
    expect(parsed.searchParams.get('order')).toBe('asc');
    expect(logInfo).toHaveBeenCalledWith('openai.conversations_listed', { conversationCount: 2 });
  });

  it('fetches a specific conversation item with include params', async () => {
    fetchMock.mockResolvedValue(
      successResponse({ id: 'item_2', object: 'conversation.item', type: 'message', role: 'assistant' }),
    );

    await getConversationItem({
      conversationId: 'conv_item',
      itemId: 'item_2',
      include: ['message.output_text.logprobs'],
      openAiApiKey: 'sk-test',
      logError: vi.fn(),
      logInfo: vi.fn(),
    });

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/v1/conversations/conv_item/items/item_2');
    expect(parsed.searchParams.getAll('include')).toEqual(['message.output_text.logprobs']);
  });

  it('creates and deletes conversation items', async () => {
    const items: ConversationItemInput[] = [
      { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Hello' }] },
    ];

    fetchMock
      .mockResolvedValueOnce(successResponse({ object: 'list', data: [{ id: 'item_1', object: 'conversation.item', type: 'message' }] }))
      .mockResolvedValueOnce(successResponse({ id: 'conv_items', object: 'conversation', created_at: 2 }));

    await createConversationItems({
      conversationId: 'conv_items',
      items,
      include: ['message.output_text.logprobs'],
      openAiApiKey: 'sk-test',
      logError: vi.fn(),
      logInfo: vi.fn(),
    });

    const [createUrl, createInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(createUrl).toBe('https://api.openai.com/v1/conversations/conv_items/items');
    expect(createInit.method).toBe('POST');
    expect(createInit.body).toBe(JSON.stringify({ items, include: ['message.output_text.logprobs'] }));

    await deleteConversationItem({
      conversationId: 'conv_items',
      itemId: 'item_1',
      openAiApiKey: 'sk-test',
      logError: vi.fn(),
      logInfo: vi.fn(),
    });

    const [deleteUrl, deleteInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(deleteUrl).toBe('https://api.openai.com/v1/conversations/conv_items/items/item_1');
    expect(deleteInit.method).toBe('DELETE');
  });

  it('deletes a conversation', async () => {
    fetchMock.mockResolvedValue(successResponse({ id: 'conv_del', object: 'conversation.deleted', deleted: true }));
    await deleteConversation({
      conversationId: 'conv_del',
      openAiApiKey: 'sk-test',
      logError: vi.fn(),
      logInfo: vi.fn(),
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/conversations/conv_del');
    expect(init.method).toBe('DELETE');
  });

  it('propagates API errors and logs them once', async () => {
    fetchMock.mockResolvedValue(new Response('oops', { status: 500 }));
    const logError = vi.fn();

    await expect(
      getConversation({
        conversationId: 'conv_err',
        openAiApiKey: 'sk-test',
        logError,
      }),
    ).rejects.toThrow(/failed with status 500/);

    expect(logError).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith(
      'openai.conversation_fetch_failed',
      expect.any(Error),
      expect.objectContaining({ path: `conversations/${encodeURIComponent('conv_err')}`, status: 500 }),
    );
  });
});
