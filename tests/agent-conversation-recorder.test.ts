import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createConversationMock, createConversationItemsMock } = vi.hoisted(() => ({
  createConversationMock: vi.fn(),
  createConversationItemsMock: vi.fn(),
}));

vi.mock('../services/rag/openai-conversations', async () => {
  const actual = await vi.importActual<typeof import('../services/rag/openai-conversations')>(
    '../services/rag/openai-conversations',
  );
  return {
    ...actual,
    createConversation: createConversationMock,
    createConversationItems: createConversationItemsMock,
  };
});

import { AgentConversationRecorder } from '../services/rag/agent-conversation-recorder';

describe('AgentConversationRecorder', () => {
  beforeEach(() => {
    createConversationMock.mockReset();
    createConversationItemsMock.mockReset();
    createConversationMock.mockResolvedValue({
      id: 'conv_test',
      object: 'conversation',
      created_at: 123,
      metadata: {},
    } as any);
    createConversationItemsMock.mockResolvedValue({} as any);
  });

  it('records plain text items with trimmed content and metadata', async () => {
    const logError = vi.fn();
    const recorder = await AgentConversationRecorder.start({
      orgId: 'org_1',
      orgSlug: 'demo',
      agentType: 'AUDIT',
      mode: 'plain',
      systemPrompt: 'You are helpful',
      userPrompt: 'Hello',
      source: 'agent_stream_plain',
      userId: 'user_123',
      agentSessionId: 'session_456',
      supabaseRunId: 'run_789',
      logError,
      logInfo: vi.fn(),
    });

    await recorder.recordPlainText({ text: '  Final answer  ', responseId: 'resp_456', stage: 'completed' });

    expect(createConversationItemsMock).toHaveBeenCalledTimes(1);
    const call = createConversationItemsMock.mock.calls[0];
    const payload = call?.[0] as { items: Array<Record<string, any>> };
    expect(payload.conversationId).toBe('conv_test');
    expect(payload.items).toHaveLength(1);
    const [item] = payload.items;
    expect(item.content?.[0]?.text).toBe('Final answer');
    expect(item.metadata).toMatchObject({
      agent_session_id: 'session_456',
      supabase_run_id: 'run_789',
      response_id: 'resp_456',
      stage: 'completed',
      user_id: 'user_123',
    });
    expect(logError).not.toHaveBeenCalled();
  });

  it('skips recording when conversation missing or text empty', async () => {
    const recorder = await AgentConversationRecorder.start({
      orgId: 'org_1',
      orgSlug: 'demo',
      agentType: 'AUDIT',
      mode: 'plain',
      systemPrompt: 'You are helpful',
      userPrompt: 'Hello',
      source: 'agent_stream_plain',
      logError: vi.fn(),
      logInfo: vi.fn(),
    });

    await recorder.recordPlainText({ text: '   ' });
    expect(createConversationItemsMock).not.toHaveBeenCalled();
  });
});
