import { beforeEach, describe, expect, it, vi } from 'vitest';
import type OpenAI from 'openai';

import {
  createChatCompletion,
  deleteChatCompletion,
  listChatCompletionMessages,
  listChatCompletions,
  retrieveChatCompletion,
  updateChatCompletion,
} from '../services/rag/openai-chat-completions';

const createMock = vi.fn();
const retrieveMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
const listMock = vi.fn();
const messagesListMock = vi.fn();

const mockClient = {
  chat: {
    completions: {
      create: createMock,
      retrieve: retrieveMock,
      update: updateMock,
      del: deleteMock,
      list: listMock,
      messages: {
        list: messagesListMock,
      },
    },
  },
} as unknown as OpenAI;

describe('openai chat completions helpers', () => {
  const debugLogger = vi.fn();
  const logError = vi.fn();

  beforeEach(() => {
    createMock.mockReset();
    retrieveMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
    listMock.mockReset();
    messagesListMock.mockReset();
    debugLogger.mockReset();
    logError.mockReset();
  });

  it('creates chat completion and logs debug metadata', async () => {
    const completion = {
      id: 'chat_1',
      object: 'chat.completion',
      created: 123,
      model: 'gpt-test',
      choices: [],
    };
    createMock.mockResolvedValue(completion);

    const payload = {
      model: 'gpt-test',
      messages: [{ role: 'user', content: 'Hello' }],
    } as Parameters<typeof createMock>[0];

    const result = await createChatCompletion({
      client: mockClient,
      payload,
      debugLogger,
      metadata: { source: 'unit' },
      orgId: 'org_123',
      tags: ['unit-test'],
      quotaTag: 'quota_a',
      requestLogPayload: { safe: true },
    });

    expect(result).toBe(completion);
    expect(createMock).toHaveBeenCalledWith(payload);
    expect(debugLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'chat.completions.create',
        response: completion,
        requestPayload: { safe: true },
        metadata: expect.objectContaining({ source: 'unit', store: false }),
        orgId: 'org_123',
        tags: ['unit-test'],
        quotaTag: 'quota_a',
      }),
    );
  });

  it('logs and rethrows create errors', async () => {
    const error = new Error('boom');
    createMock.mockRejectedValue(error);

    await expect(
      createChatCompletion({
        client: mockClient,
        payload: { model: 'gpt', messages: [] } as any,
        logError,
      }),
    ).rejects.toThrow('boom');

    expect(logError).toHaveBeenCalledWith(
      'openai.chat_completions_create_failed',
      error,
      expect.objectContaining({ orgId: null }),
    );
  });

  it('retrieves stored completion', async () => {
    const completion = { id: 'chat_2' };
    retrieveMock.mockResolvedValue(completion);

    const result = await retrieveChatCompletion({
      client: mockClient,
      completionId: 'chat_2',
      debugLogger,
    });

    expect(result).toBe(completion);
    expect(retrieveMock).toHaveBeenCalledWith('chat_2');
    expect(debugLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'chat.completions.retrieve',
        response: completion,
        requestPayload: { completionId: 'chat_2' },
      }),
    );
  });

  it('updates completion metadata', async () => {
    const completion = { id: 'chat_3' };
    updateMock.mockResolvedValue(completion);

    const result = await updateChatCompletion({
      client: mockClient,
      completionId: 'chat_3',
      payload: { metadata: { foo: 'bar' } },
      debugLogger,
    });

    expect(result).toBe(completion);
    expect(updateMock).toHaveBeenCalledWith('chat_3', { metadata: { foo: 'bar' } });
  });

  it('deletes completion and returns boolean', async () => {
    deleteMock.mockResolvedValue({ deleted: true });

    const result = await deleteChatCompletion({
      client: mockClient,
      completionId: 'chat_4',
      debugLogger,
    });

    expect(result).toBe(true);
    expect(deleteMock).toHaveBeenCalledWith('chat_4');
  });

  it('lists completions with pagination info', async () => {
    const page = {
      data: [{ id: 'chat_a' }, { id: 'chat_b' }],
      has_more: true,
      nextPageParams: () => ({ after: 'cursor_1' }),
    };
    listMock.mockResolvedValue(page);

    const result = await listChatCompletions({
      client: mockClient,
      query: { limit: 2 },
      debugLogger,
    });

    expect(result).toEqual({ items: page.data, hasMore: true, nextCursor: 'cursor_1' });
    expect(listMock).toHaveBeenCalledWith({ limit: 2 });
  });

  it('lists stored messages for a completion', async () => {
    const page = {
      data: [{ id: 'msg_1' }, { id: 'msg_2' }],
      has_more: false,
      nextPageParams: () => null,
    };
    messagesListMock.mockResolvedValue(page);

    const result = await listChatCompletionMessages({
      client: mockClient,
      completionId: 'chat_5',
      debugLogger,
    });

    expect(result).toEqual({ items: page.data, hasMore: false, nextCursor: null });
    expect(messagesListMock).toHaveBeenCalledWith('chat_5', {});
  });
});
