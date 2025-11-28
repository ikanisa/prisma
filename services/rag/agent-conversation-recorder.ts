import {
  ConversationContent,
  ConversationItemInput,
  ConversationMessageInput,
  createConversation,
  createConversationItems,
  type OpenAiConversation,
} from './openai-conversations.js';

interface RecorderDeps {
  logError: (message: string, error: unknown, meta?: Record<string, unknown>) => void;
  logInfo?: (message: string, meta?: Record<string, unknown>) => void;
  openAiApiKey?: string;
}

interface RecorderContext {
  userId?: string;
  agentSessionId?: string;
  engagementId?: string;
  supabaseRunId?: string;
}

interface StartConversationOptions extends RecorderDeps {
  orgId: string;
  orgSlug: string;
  agentType: string;
  mode: 'plain' | 'tools' | string;
  systemPrompt: string;
  userPrompt: string;
  context?: string;
  source?: string;
  metadata?: Record<string, string>;
  userId?: string;
  agentSessionId?: string;
  engagementId?: string;
  supabaseRunId?: string;
  toolNames?: string[];
}

interface RecordResponseOptions {
  response: any;
  stage: string;
  iteration: number;
}

interface RecordToolResultOptions {
  callId: string;
  toolName?: string;
  output: unknown;
  stage: string;
  status: 'completed' | 'failed';
}

interface RecordPlainTextOptions {
  text: string;
  stage?: string;
  responseId?: string;
  status?: 'completed' | 'cancelled' | 'failed';
}

const METADATA_VALUE_LIMIT = 512;

function truncateMetadata(value: string): string {
  if (value.length <= METADATA_VALUE_LIMIT) {
    return value;
  }
  return value.slice(0, METADATA_VALUE_LIMIT);
}

function serialiseJson(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
}

function toMetadataRecord(entries: Array<[string, string | undefined]>): Record<string, string> | undefined {
  const record: Record<string, string> = {};
  for (const [key, value] of entries) {
    if (!value) continue;
    record[key] = truncateMetadata(value);
  }
  return Object.keys(record).length > 0 ? record : undefined;
}

function normaliseContent(content: unknown): ConversationContent[] {
  if (!Array.isArray(content)) {
    return [];
  }
  const blocks: ConversationContent[] = [];
  for (const entry of content) {
    if (!entry || typeof entry !== 'object') continue;
    const type = typeof (entry as { type?: unknown }).type === 'string' ? (entry as { type: string }).type : undefined;
    if (!type) continue;
    if ((entry as { text?: unknown }).text && typeof (entry as { text?: unknown }).text === 'string') {
      blocks.push({ type, text: (entry as { text: string }).text } as ConversationContent);
      continue;
    }
    const block: Record<string, string> = { type };
    for (const [key, value] of Object.entries(entry as Record<string, unknown>)) {
      if (key === 'type') continue;
      block[key] = serialiseJson(value);
    }
    blocks.push(block as ConversationContent);
  }
  return blocks;
}

function buildInitialItems(options: StartConversationOptions): ConversationMessageInput[] {
  const userText = options.context
    ? `${options.userPrompt}\n\nContext:\n${options.context}`
    : options.userPrompt;
  return [
    {
      type: 'message',
      role: 'system',
      content: [{ type: 'input_text', text: options.systemPrompt }],
    },
    {
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text: userText }],
    },
  ];
}

function buildConversationMetadata(options: StartConversationOptions): Record<string, string> | undefined {
  const base: Array<[string, string | undefined]> = [
    ['org_id', options.orgId],
    ['org_slug', options.orgSlug],
    ['agent_type', options.agentType],
    ['mode', options.mode],
    ['source', options.source ?? 'agent_chat'],
    ['user_id', options.userId],
    ['agent_session_id', options.agentSessionId],
    ['engagement_id', options.engagementId],
    ['supabase_run_id', options.supabaseRunId],
    ['has_context', options.context ? 'true' : 'false'],
    ['toolset', options.toolNames && options.toolNames.length > 0 ? options.toolNames.join(',') : undefined],
  ];

  if (options.metadata) {
    for (const [key, value] of Object.entries(options.metadata)) {
      if (typeof value === 'string') {
        base.push([key, value]);
      }
    }
  }

  base.push(['initial_prompt_preview', options.userPrompt.slice(0, 120)]);
  if (options.context) {
    base.push(['context_present', 'true']);
  }

  return toMetadataRecord(base);
}

function buildItemMetadata(meta: {
  stage?: string;
  iteration?: number;
  responseId?: string;
  fragmentId?: string;
  toolCallId?: string;
  toolName?: string;
  status?: string;
}, context?: RecorderContext): Record<string, string> | undefined {
  return toMetadataRecord([
    ['stage', meta.stage],
    ['iteration', meta.iteration !== undefined ? String(meta.iteration) : undefined],
    ['response_id', meta.responseId],
    ['fragment_id', meta.fragmentId],
    ['tool_call_id', meta.toolCallId],
    ['tool_name', meta.toolName],
    ['status', meta.status],
    ['agent_session_id', context?.agentSessionId],
    ['engagement_id', context?.engagementId],
    ['supabase_run_id', context?.supabaseRunId],
    ['user_id', context?.userId],
  ]);
}

function extractResponseItems(
  options: RecordResponseOptions & { conversationId: string; context?: RecorderContext },
): ConversationItemInput[] {
  const { response, stage, iteration } = options;
  const responseId = typeof response?.id === 'string' ? response.id : undefined;
  const outputs = Array.isArray(response?.output) ? response.output : [];
  const items: ConversationItemInput[] = [];

  for (const entry of outputs) {
    if (!entry || typeof entry !== 'object') continue;
    const type = typeof entry.type === 'string' ? entry.type : undefined;
    if (!type) continue;
    const fragmentId = typeof entry.id === 'string' ? entry.id : undefined;
    const status = typeof entry.status === 'string' ? entry.status : undefined;
    if (type === 'message') {
      const role = typeof entry.role === 'string' ? entry.role : 'assistant';
      const content = normaliseContent((entry as { content?: unknown }).content);
      if (content.length === 0) continue;
      const item: ConversationMessageInput = {
        type: 'message',
        role: role as ConversationMessageInput['role'],
        content,
        status,
      };
      const metadata = buildItemMetadata({
        stage,
        iteration,
        responseId,
        fragmentId,
        status,
      }, options.context);
      if (metadata) {
        item.metadata = metadata;
      }
      items.push(item);
      continue;
    }

    const payload: ConversationItemInput = {
      type,
      status,
    };
    const metadata = buildItemMetadata({ stage, iteration, responseId, fragmentId, status }, options.context);
    if (metadata) {
      payload.metadata = metadata;
    }

    for (const [key, value] of Object.entries(entry as Record<string, unknown>)) {
      if (key === 'type' || key === 'status') continue;
      if (value === undefined) continue;
      payload[key] = serialiseJson(value);
    }

    items.push(payload);
  }

  if (items.length === 0) {
    const text = Array.isArray(response?.output_text)
      ? response.output_text.join('')
      : typeof response?.output_text === 'string'
        ? response.output_text
        : undefined;
    if (text) {
      const metadata = buildItemMetadata({ stage, iteration, responseId, status: 'completed' }, options.context);
      items.push({
        type: 'message',
        role: 'assistant',
        content: [{ type: 'output_text', text }],
        status: 'completed',
        ...(metadata ? { metadata } : {}),
      } as ConversationMessageInput);
    }
  }

  return items;
}

function buildToolMessage(options: RecordToolResultOptions, context?: RecorderContext): ConversationMessageInput {
  const text = serialiseJson(options.output);
  const metadata = buildItemMetadata({
    stage: options.stage,
    status: options.status,
    toolCallId: options.callId,
    toolName: options.toolName,
  }, context);
  return {
    type: 'message',
    role: 'tool',
    content: [{ type: 'output_text', text }],
    status: options.status,
    ...(metadata ? { metadata } : {}),
  };
}

export class AgentConversationRecorder {
  private conversation?: OpenAiConversation;

  private constructor(private readonly deps: RecorderDeps, private readonly context: RecorderContext) {}

  static async start(options: StartConversationOptions): Promise<AgentConversationRecorder> {
    const recorder = new AgentConversationRecorder({
      logError: options.logError,
      logInfo: options.logInfo,
      openAiApiKey: options.openAiApiKey,
    }, {
      userId: options.userId,
      agentSessionId: options.agentSessionId,
      engagementId: options.engagementId,
      supabaseRunId: options.supabaseRunId,
    });

    try {
      const items = buildInitialItems(options);
      const metadata = buildConversationMetadata(options);
      const conversation = await createConversation({
        items,
        metadata,
        openAiApiKey: options.openAiApiKey,
        logError: options.logError,
        logInfo: options.logInfo,
      });
      recorder.conversation = conversation;
      options.logInfo?.('agent.conversation_started', {
        conversationId: conversation.id,
        orgId: options.orgId,
        agentType: options.agentType,
      });
    } catch (error) {
      options.logError('agent.conversation_start_failed', error, {
        orgId: options.orgId,
        agentType: options.agentType,
      });
    }

    return recorder;
  }

  get conversationId(): string | undefined {
    return this.conversation?.id;
  }

  getConversation(): OpenAiConversation | undefined {
    return this.conversation;
  }

  async recordResponse(options: RecordResponseOptions): Promise<void> {
    if (!this.conversation?.id) return;
    const items = extractResponseItems({ ...options, conversationId: this.conversation.id, context: this.context });
    if (items.length === 0) return;

    try {
      await createConversationItems({
        conversationId: this.conversation.id,
        items,
        openAiApiKey: this.deps.openAiApiKey,
        logError: this.deps.logError,
        logInfo: this.deps.logInfo,
      });
    } catch (error) {
      this.deps.logError('agent.conversation_items_append_failed', error, {
        conversationId: this.conversation.id,
        stage: options.stage,
      });
    }
  }

  async recordToolResult(options: RecordToolResultOptions): Promise<void> {
    if (!this.conversation?.id) return;
    const item = buildToolMessage(options, this.context);

    try {
      await createConversationItems({
        conversationId: this.conversation.id,
        items: [item],
        openAiApiKey: this.deps.openAiApiKey,
        logError: this.deps.logError,
        logInfo: this.deps.logInfo,
      });
    } catch (error) {
      this.deps.logError('agent.conversation_tool_append_failed', error, {
        conversationId: this.conversation.id,
        toolCallId: options.callId,
      });
    }
  }

  async recordPlainText(options: RecordPlainTextOptions): Promise<void> {
    if (!this.conversation?.id) return;
    const text = typeof options.text === 'string' ? options.text.trim() : '';
    if (!text) return;

    const item: ConversationMessageInput = {
      type: 'message',
      role: 'assistant',
      content: [{ type: 'output_text', text }],
      status: options.status ?? 'completed',
    };

    const metadata = buildItemMetadata(
      {
        stage: options.stage ?? 'stream_final',
        status: options.status ?? 'completed',
        responseId: options.responseId,
      },
      this.context,
    );

    if (metadata) {
      item.metadata = metadata;
    }

    try {
      await createConversationItems({
        conversationId: this.conversation.id,
        items: [item],
        openAiApiKey: this.deps.openAiApiKey,
        logError: this.deps.logError,
        logInfo: this.deps.logInfo,
      });
    } catch (error) {
      this.deps.logError('agent.conversation_plain_append_failed', error, {
        conversationId: this.conversation.id,
      });
    }
  }
}
