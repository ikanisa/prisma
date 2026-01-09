import type OpenAI from 'openai';
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionListParams,
  ChatCompletionStoreMessage,
  ChatCompletionUpdateParams,
} from 'openai/resources/chat/completions';
import type { MessageListParams } from 'openai/resources/chat/completions/messages';
import type { Stream } from 'openai/streaming';

import type { OpenAiDebugEvent } from './openai-debug.js';
import type { OpenAiClientWithDebug } from './openai-debug.js';

type ChatCompletionCreatePayload = ChatCompletionCreateParamsNonStreaming & { stream?: false };

type DebugLogger = (event: OpenAiDebugEvent) => Promise<void> | void;

type LogError = (message: string, error: unknown, meta?: Record<string, unknown>) => void;

interface BaseOptions {
  client: OpenAiClientWithDebug | OpenAI;
  debugLogger?: DebugLogger;
  logError?: LogError;
  orgId?: string | null;
  quotaTag?: string | null;
  tags?: string[];
}

interface CreateOptions extends BaseOptions {
  payload: ChatCompletionCreatePayload;
  metadata?: Record<string, unknown>;
  requestLogPayload?: unknown;
}

interface StreamOptions extends BaseOptions {
  payload: ChatCompletionCreateParamsStreaming;
  metadata?: Record<string, unknown>;
  requestLogPayload?: unknown;
}

export interface ChatCompletionStreamHandle {
  stream: Stream<ChatCompletionChunk>;
  logCompletion: (context?: { response?: unknown; metadata?: Record<string, unknown> }) => Promise<void>;
}

interface RetrieveOptions extends BaseOptions {
  completionId: string;
  metadata?: Record<string, unknown>;
}

interface UpdateOptions extends BaseOptions {
  completionId: string;
  payload: ChatCompletionUpdateParams;
  metadata?: Record<string, unknown>;
}

interface DeleteOptions extends BaseOptions {
  completionId: string;
  metadata?: Record<string, unknown>;
}

interface ListOptions extends BaseOptions {
  query?: ChatCompletionListParams;
  metadata?: Record<string, unknown>;
}

interface ListMessagesOptions extends BaseOptions {
  completionId: string;
  query?: MessageListParams;
  metadata?: Record<string, unknown>;
}

export interface ChatCompletionListResult {
  items: ChatCompletion[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface ChatCompletionMessagesResult {
  items: ChatCompletionStoreMessage[];
  hasMore: boolean;
  nextCursor: string | null;
}

function getDebugLogger(options: BaseOptions): DebugLogger | undefined {
  if (options.debugLogger) {
    return options.debugLogger;
  }
  const candidate = (options.client as Partial<OpenAiClientWithDebug>).debugLogger;
  if (typeof candidate === 'function') {
    return candidate as DebugLogger;
  }
  return undefined;
}

function mergeMetadata(base: Record<string, unknown> | undefined, extra: Record<string, unknown> | undefined) {
  if (!base && !extra) return undefined;
  return { ...(base ?? {}), ...(extra ?? {}) };
}

function handleError(options: BaseOptions, endpoint: string, error: unknown) {
  options.logError?.(`openai.${endpoint.replace(/\./g, '_')}_failed`, error, {
    orgId: options.orgId ?? null,
    quotaTag: options.quotaTag ?? null,
  });
}

function normaliseRequestPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }
  try {
    return JSON.parse(JSON.stringify(payload));
  } catch {
    return payload;
  }
}

export async function createChatCompletion(options: CreateOptions): Promise<ChatCompletion> {
  const { client, payload } = options;
  try {
    const completion = (await client.chat.completions.create(payload)) as ChatCompletion;
    const logger = getDebugLogger(options);
    if (logger) {
      await logger({
        endpoint: 'chat.completions.create',
        response: completion as any,
        requestPayload: normaliseRequestPayload(options.requestLogPayload ?? payload),
        metadata: mergeMetadata(options.metadata, { store: Boolean((payload as any).store) }),
        orgId: options.orgId ?? null,
        tags: options.tags,
        quotaTag: options.quotaTag ?? null,
      });
    }
    return completion;
  } catch (error) {
    handleError(options, 'chat.completions.create', error);
    throw error;
  }
}

export async function streamChatCompletion(options: StreamOptions): Promise<ChatCompletionStreamHandle> {
  const { client, payload } = options;
  const requestLogPayload = options.requestLogPayload ?? payload;
  const metadata = mergeMetadata(options.metadata, { store: Boolean((payload as any).store) });
  try {
    const stream = (await client.chat.completions.create(payload)) as Stream<ChatCompletionChunk>;
    const logger = getDebugLogger(options);
    return {
      stream,
      async logCompletion(context) {
        if (!logger) {
          return;
        }
        await logger({
          endpoint: 'chat.completions.create',
          response: (context?.response ?? {}) as any,
          requestPayload: normaliseRequestPayload(requestLogPayload),
          metadata: mergeMetadata(metadata, context?.metadata),
          orgId: options.orgId ?? null,
          tags: options.tags,
          quotaTag: options.quotaTag ?? null,
        });
      },
    };
  } catch (error) {
    handleError(options, 'chat.completions.create', error);
    throw error;
  }
}

export async function retrieveChatCompletion(options: RetrieveOptions): Promise<ChatCompletion> {
  const { client, completionId } = options;
  try {
    const completion = await client.chat.completions.retrieve(completionId);
    const logger = getDebugLogger(options);
    if (logger) {
      await logger({
        endpoint: 'chat.completions.retrieve',
        response: completion as any,
        requestPayload: { completionId },
        metadata: mergeMetadata(options.metadata, {}),
        orgId: options.orgId ?? null,
        tags: options.tags,
        quotaTag: options.quotaTag ?? null,
      });
    }
    return completion;
  } catch (error) {
    handleError(options, 'chat.completions.retrieve', error);
    throw error;
  }
}

export async function updateChatCompletion(options: UpdateOptions): Promise<ChatCompletion> {
  const { client, completionId, payload } = options;
  try {
    const completion = await client.chat.completions.update(completionId, payload);
    const logger = getDebugLogger(options);
    if (logger) {
      await logger({
        endpoint: 'chat.completions.update',
        response: completion as any,
        requestPayload: { completionId, payload: normaliseRequestPayload(payload) },
        metadata: mergeMetadata(options.metadata, {}),
        orgId: options.orgId ?? null,
        tags: options.tags,
        quotaTag: options.quotaTag ?? null,
      });
    }
    return completion;
  } catch (error) {
    handleError(options, 'chat.completions.update', error);
    throw error;
  }
}

export async function deleteChatCompletion(options: DeleteOptions): Promise<boolean> {
  const { client, completionId } = options;
  try {
    const result = await client.chat.completions.del(completionId);
    const logger = getDebugLogger(options);
    if (logger) {
      await logger({
        endpoint: 'chat.completions.delete',
        response: result as any,
        requestPayload: { completionId },
        metadata: mergeMetadata(options.metadata, {}),
        orgId: options.orgId ?? null,
        tags: options.tags,
        quotaTag: options.quotaTag ?? null,
      });
    }
    return Boolean(result?.deleted);
  } catch (error) {
    handleError(options, 'chat.completions.delete', error);
    throw error;
  }
}

export async function listChatCompletions(options: ListOptions): Promise<ChatCompletionListResult> {
  const { client, query } = options;
  try {
    const page = await client.chat.completions.list(query ?? {});
    const items = Array.from(page.data ?? []);
    const nextParams = page.nextPageParams();
    const result: ChatCompletionListResult = {
      items,
      hasMore: Boolean(page.has_more),
      nextCursor: nextParams && 'after' in nextParams ? (nextParams.after ?? null) : null,
    };

    const logger = getDebugLogger(options);
    if (logger) {
      await logger({
        endpoint: 'chat.completions.list',
        response: { id: undefined, object: 'list', count: items.length } as any,
        requestPayload: normaliseRequestPayload(query ?? {}),
        metadata: mergeMetadata(options.metadata, { hasMore: result.hasMore, nextCursor: result.nextCursor }),
        orgId: options.orgId ?? null,
        tags: options.tags,
        quotaTag: options.quotaTag ?? null,
      });
    }

    return result;
  } catch (error) {
    handleError(options, 'chat.completions.list', error);
    throw error;
  }
}

export async function listChatCompletionMessages(options: ListMessagesOptions): Promise<ChatCompletionMessagesResult> {
  const { client, completionId, query } = options;
  try {
    const page = await client.chat.completions.messages.list(completionId, query ?? {});
    const items = Array.from(page.data ?? []);
    const nextParams = page.nextPageParams();
    const result: ChatCompletionMessagesResult = {
      items,
      hasMore: Boolean(page.has_more),
      nextCursor: nextParams && 'after' in nextParams ? (nextParams.after ?? null) : null,
    };

    const logger = getDebugLogger(options);
    if (logger) {
      await logger({
        endpoint: 'chat.completions.messages.list',
        response: { id: completionId, object: 'list.messages', count: items.length } as any,
        requestPayload: { completionId, ...(query ?? {}) },
        metadata: mergeMetadata(options.metadata, { hasMore: result.hasMore, nextCursor: result.nextCursor }),
        orgId: options.orgId ?? null,
        tags: options.tags,
        quotaTag: options.quotaTag ?? null,
      });
    }

    return result;
  } catch (error) {
    handleError(options, 'chat.completions.messages.list', error);
    throw error;
  }
}
