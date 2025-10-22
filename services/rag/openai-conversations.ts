import { buildOpenAiUrl } from '../../lib/openai/url';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type ConversationRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ConversationContentBlock {
  type: string;
  [key: string]: JsonValue;
}

export interface ConversationTextContent extends ConversationContentBlock {
  type: 'input_text' | 'output_text';
  text: string;
}

export interface ConversationImageContent extends ConversationContentBlock {
  type: 'input_image';
  image_url: string;
  detail?: 'low' | 'high' | 'auto';
}

export type ConversationContent = ConversationTextContent | ConversationImageContent | ConversationContentBlock;

export interface OpenAiConversation {
  id: string;
  object: 'conversation';
  created_at: number;
  metadata?: Record<string, string> | null;
}

export interface ConversationMessageItem {
  id: string;
  object: 'conversation.item';
  type: 'message';
  role: ConversationRole;
  status?: 'in_progress' | 'completed' | 'cancelled' | string;
  content: ConversationContent[];
  metadata?: Record<string, string> | null;
  created_at?: number;
}

export interface ConversationToolCallItem {
  id: string;
  object: 'conversation.item';
  type: 'tool_call' | 'response' | 'tool_output';
  status?: 'in_progress' | 'completed' | 'cancelled' | string;
  metadata?: Record<string, string> | null;
  created_at?: number;
  [key: string]: JsonValue;
}

export type OpenAiConversationItem = ConversationMessageItem | ConversationToolCallItem;

export interface OpenAiListResponse<T> {
  object: 'list';
  data: T[];
  first_id?: string | null;
  last_id?: string | null;
  has_more?: boolean;
}

export interface ConversationItemInput {
  type: string;
  status?: 'in_progress' | 'completed' | 'cancelled' | string;
  metadata?: Record<string, string>;
  [key: string]: JsonValue | undefined;
}

export interface ConversationMessageInput extends ConversationItemInput {
  type: 'message';
  role: ConversationRole;
  content: ConversationContent[];
}

interface BaseConversationOptions {
  openAiApiKey?: string;
  logError: (message: string, error: unknown, meta?: Record<string, unknown>) => void;
  logInfo?: (message: string, meta?: Record<string, unknown>) => void;
  signal?: AbortSignal;
}

interface RequestConfig<T> {
  path: string;
  method?: 'GET' | 'POST' | 'DELETE';
  query?: Record<string, string | string[] | undefined | null>;
  body?: unknown;
  options: BaseConversationOptions;
  errorEvent: string;
  successEvent?: { message: string; meta?: Record<string, unknown> | ((result: T) => Record<string, unknown> | void) };
  errorMeta?: Record<string, unknown>;
}

interface LoggedError extends Error {
  __logged?: boolean;
}

function markLogged(error: unknown) {
  if (error && typeof error === 'object') {
    (error as LoggedError).__logged = true;
  }
}

function wasLogged(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as LoggedError).__logged);
}

function resolveApiKey(options: BaseConversationOptions): string {
  const apiKey = options.openAiApiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key is required for Conversations API requests');
  }
  return apiKey;
}

function buildUrl(path: string, query?: Record<string, string | string[] | undefined | null>): string {
  const url = new URL(buildOpenAiUrl(path));
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        value.forEach((entry) => {
          if (entry !== undefined && entry !== null) {
            url.searchParams.append(key, String(entry));
          }
        });
      } else if (value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function requestConversationsEndpoint<T>({
  path,
  method = 'GET',
  query,
  body,
  options,
  errorEvent,
  successEvent,
  errorMeta,
}: RequestConfig<T>): Promise<T> {
  const apiKey = resolveApiKey(options);
  const url = buildUrl(path, query);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  };

  const init: RequestInit = {
    method,
    headers,
    signal: options.signal,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, init);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const error: LoggedError = new Error(
        `OpenAI Conversations API ${method} ${path} failed with status ${res.status}: ${text}`,
      );
      markLogged(error);
      options.logError(errorEvent, error, { status: res.status, path, method, ...(errorMeta ?? {}) });
      throw error;
    }

    const result = (await res.json()) as T;
    if (successEvent) {
      const metaValue =
        typeof successEvent.meta === 'function' ? successEvent.meta(result) : successEvent.meta ?? undefined;
      options.logInfo?.(successEvent.message, metaValue);
    }
    return result;
  } catch (error) {
    if (!wasLogged(error)) {
      options.logError(errorEvent, error, { path, method, ...(errorMeta ?? {}) });
      markLogged(error);
    }
    throw error;
  }
}

export interface CreateConversationOptions extends BaseConversationOptions {
  items?: ConversationItemInput[];
  metadata?: Record<string, string>;
}

export function createConversation(options: CreateConversationOptions): Promise<OpenAiConversation> {
  const payload: Record<string, unknown> = {};
  if (options.items?.length) {
    payload.items = options.items;
  }
  if (options.metadata && Object.keys(options.metadata).length > 0) {
    payload.metadata = options.metadata;
  }

  return requestConversationsEndpoint<OpenAiConversation>({
    path: 'conversations',
    method: 'POST',
    body: Object.keys(payload).length > 0 ? payload : undefined,
    options,
    errorEvent: 'openai.conversation_create_failed',
    successEvent: {
      message: 'openai.conversation_created',
      meta: (conversation) => ({ conversationId: conversation.id }),
    },
  });
}

export interface GetConversationOptions extends BaseConversationOptions {
  conversationId: string;
}

export function getConversation(options: GetConversationOptions): Promise<OpenAiConversation> {
  const { conversationId } = options;
  return requestConversationsEndpoint<OpenAiConversation>({
    path: `conversations/${encodeURIComponent(conversationId)}`,
    method: 'GET',
    options,
    errorEvent: 'openai.conversation_fetch_failed',
    successEvent: {
      message: 'openai.conversation_fetched',
      meta: { conversationId },
    },
  });
}

export interface UpdateConversationOptions extends BaseConversationOptions {
  conversationId: string;
  metadata: Record<string, string>;
}

export function updateConversation(options: UpdateConversationOptions): Promise<OpenAiConversation> {
  const { conversationId, metadata } = options;
  return requestConversationsEndpoint<OpenAiConversation>({
    path: `conversations/${encodeURIComponent(conversationId)}`,
    method: 'POST',
    body: { metadata },
    options,
    errorEvent: 'openai.conversation_update_failed',
    successEvent: {
      message: 'openai.conversation_updated',
      meta: { conversationId },
    },
  });
}

export interface DeleteConversationOptions extends BaseConversationOptions {
  conversationId: string;
}

export function deleteConversation(options: DeleteConversationOptions): Promise<{
  id: string;
  object: string;
  deleted: boolean;
}> {
  const { conversationId } = options;
  return requestConversationsEndpoint({
    path: `conversations/${encodeURIComponent(conversationId)}`,
    method: 'DELETE',
    options,
    errorEvent: 'openai.conversation_delete_failed',
    successEvent: {
      message: 'openai.conversation_deleted',
      meta: { conversationId },
    },
  });
}

export interface ListConversationsOptions extends BaseConversationOptions {
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
}

export function listConversations(options: ListConversationsOptions): Promise<OpenAiListResponse<OpenAiConversation>> {
  const { limit, order, after } = options;
  return requestConversationsEndpoint<OpenAiListResponse<OpenAiConversation>>({
    path: 'conversations',
    method: 'GET',
    query: {
      limit: typeof limit === 'number' ? String(limit) : undefined,
      order,
      after,
    },
    options,
    errorEvent: 'openai.conversation_list_failed',
  }).then((response) => {
    options.logInfo?.('openai.conversations_listed', {
      conversationCount: Array.isArray(response.data) ? response.data.length : undefined,
    });
    return response;
  });
}

export interface ListConversationItemsOptions extends BaseConversationOptions {
  conversationId: string;
  limit?: number;
  order?: 'asc' | 'desc';
  after?: string;
  include?: string[];
}

export function listConversationItems(options: ListConversationItemsOptions): Promise<OpenAiListResponse<OpenAiConversationItem>> {
  const { conversationId, limit, order, after, include } = options;
  return requestConversationsEndpoint<OpenAiListResponse<OpenAiConversationItem>>({
    path: `conversations/${encodeURIComponent(conversationId)}/items`,
    method: 'GET',
    query: {
      limit: typeof limit === 'number' ? String(limit) : undefined,
      order,
      after,
      include: include && include.length > 0 ? include : undefined,
    },
    options,
    errorEvent: 'openai.conversation_items_list_failed',
  }).then((response) => {
    options.logInfo?.('openai.conversation_items_listed', {
      conversationId,
      itemCount: Array.isArray(response.data) ? response.data.length : undefined,
    });
    return response;
  });
}

export interface CreateConversationItemsOptions extends BaseConversationOptions {
  conversationId: string;
  items: ConversationItemInput[];
  include?: string[];
}

export function createConversationItems(options: CreateConversationItemsOptions): Promise<OpenAiListResponse<OpenAiConversationItem>> {
  const { conversationId, items, include } = options;
  return requestConversationsEndpoint({
    path: `conversations/${encodeURIComponent(conversationId)}/items`,
    method: 'POST',
    body: {
      items,
      ...(include && include.length > 0 ? { include } : {}),
    },
    options,
    errorEvent: 'openai.conversation_items_create_failed',
    successEvent: {
      message: 'openai.conversation_items_created',
      meta: { conversationId, itemCount: items.length },
    },
  });
}

export interface GetConversationItemOptions extends BaseConversationOptions {
  conversationId: string;
  itemId: string;
  include?: string[];
}

export function getConversationItem(options: GetConversationItemOptions): Promise<OpenAiConversationItem> {
  const { conversationId, itemId, include } = options;
  return requestConversationsEndpoint({
    path: `conversations/${encodeURIComponent(conversationId)}/items/${encodeURIComponent(itemId)}`,
    method: 'GET',
    query: {
      include: include && include.length > 0 ? include : undefined,
    },
    options,
    errorEvent: 'openai.conversation_item_fetch_failed',
    successEvent: {
      message: 'openai.conversation_item_fetched',
      meta: { conversationId, itemId },
    },
  });
}

export interface DeleteConversationItemOptions extends BaseConversationOptions {
  conversationId: string;
  itemId: string;
}

export function deleteConversationItem(options: DeleteConversationItemOptions): Promise<OpenAiConversation> {
  const { conversationId, itemId } = options;
  return requestConversationsEndpoint({
    path: `conversations/${encodeURIComponent(conversationId)}/items/${encodeURIComponent(itemId)}`,
    method: 'DELETE',
    options,
    errorEvent: 'openai.conversation_item_delete_failed',
    successEvent: {
      message: 'openai.conversation_item_deleted',
      meta: { conversationId, itemId },
    },
  });
}
