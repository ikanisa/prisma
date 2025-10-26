"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import { cn } from '@/lib/utils';
import { clientEnv } from '@/src/env.client';
import {
  buildModelResponsePayload,
  createMessageDraft,
  createToolOutputDraft,
  type MessageContentType,
  type ResponseMessageDraft,
  type ResponseToolOutputDraft,
} from './respond-helpers';
import { logger } from '@/lib/logger';

const API_BASE = clientEnv.NEXT_PUBLIC_API_BASE
  ? clientEnv.NEXT_PUBLIC_API_BASE.replace(/\/$/, '')
  : '';

const RESPONSE_MESSAGES_STORAGE_KEY = 'agent-chat.responses.messages';
const RESPONSE_TOOL_OUTPUTS_STORAGE_KEY = 'agent-chat.responses.tool-outputs';
const DEFAULT_RESPONSE_MESSAGE = () =>
  createMessageDraft({
    role: 'user',
    content: 'Summarise the key control objectives for this engagement.',
  });

const DEFAULT_TOOL_OUTPUT = () =>
  createToolOutputDraft({
    toolCallId: 'audit.findings.review',
    outputType: 'json',
    output: JSON.stringify({ status: 'ok' }, null, 2),
  });

const SECTION_CARD_CLASS =
  'space-y-4 rounded-2xl border border-border/60 bg-card/90 p-6 shadow-sm shadow-brand-500/10 backdrop-blur';
const FIELD_LABEL_CLASS = 'flex flex-col gap-2 text-sm font-medium text-foreground';
const COMPACT_LABEL_CLASS =
  'flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground';
const INPUT_CLASS =
  'rounded-xl border border-border/70 bg-background px-3 py-2 text-sm text-foreground shadow-sm transition focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 placeholder:text-muted-foreground';
const COMPACT_INPUT_CLASS =
  'rounded-lg border border-border/70 bg-background px-2 py-1 text-xs text-foreground transition focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 placeholder:text-muted-foreground';
const TEXTAREA_CLASS =
  'min-h-[120px] rounded-xl border border-border/70 bg-background px-3 py-2 text-sm text-foreground shadow-sm transition focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 placeholder:text-muted-foreground';
const SMALL_TEXTAREA_CLASS =
  'min-h-[90px] rounded-lg border border-border/70 bg-background px-2 py-1 text-xs text-foreground transition focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 placeholder:text-muted-foreground';
const PRIMARY_BUTTON_CLASS =
  'inline-flex items-center justify-center rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-60';
const SECONDARY_BUTTON_CLASS =
  'inline-flex items-center justify-center rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-60';
const DESTRUCTIVE_BUTTON_CLASS =
  'inline-flex items-center justify-center rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 disabled:cursor-not-allowed disabled:opacity-60';
const PILL_BADGE_CLASS =
  'inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground';
const EMPHASIS_BADGE_CLASS =
  'inline-flex items-center rounded-full bg-success-100 px-2.5 py-1 text-[0.7rem] font-medium text-success-700';

const parseStoredDrafts = <T,>(
  raw: unknown,
  normalize: (entry: Record<string, unknown>) => T | null,
  fallback: () => T,
): T[] => {
  if (!Array.isArray(raw)) {
    return [fallback()];
  }
  const revived = raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      return normalize(entry as Record<string, unknown>);
    })
    .filter((value): value is T => value !== null);
  return revived.length > 0 ? revived : [fallback()];
};

const loadStoredMessages = (): ResponseMessageDraft[] => {
  if (typeof window === 'undefined') {
    return [DEFAULT_RESPONSE_MESSAGE()];
  }
  try {
    const raw = window.localStorage.getItem(RESPONSE_MESSAGES_STORAGE_KEY);
    if (!raw) {
      return [DEFAULT_RESPONSE_MESSAGE()];
    }
    const parsed = JSON.parse(raw) as unknown;
    return parseStoredDrafts<ResponseMessageDraft>(
      parsed,
      (entry) => {
        const content = typeof entry.content === 'string' ? entry.content : '';
        const role = typeof entry.role === 'string' ? entry.role : 'user';
        const name = typeof entry.name === 'string' ? entry.name : '';
        const contentType: MessageContentType =
          entry.contentType === 'json' ? 'json' : 'text';
        return createMessageDraft({
          id: typeof entry.id === 'string' && entry.id ? entry.id : undefined,
          role,
          name,
          content,
          contentType,
        });
      },
      DEFAULT_RESPONSE_MESSAGE,
    );
  } catch (error) {
    logger.warn('agent_chat.restore_messages_failed', error);
    return [DEFAULT_RESPONSE_MESSAGE()];
  }
};

const loadStoredToolOutputs = (): ResponseToolOutputDraft[] => {
  if (typeof window === 'undefined') {
    return [DEFAULT_TOOL_OUTPUT()];
  }
  try {
    const raw = window.localStorage.getItem(RESPONSE_TOOL_OUTPUTS_STORAGE_KEY);
    if (!raw) {
      return [DEFAULT_TOOL_OUTPUT()];
    }
    const parsed = JSON.parse(raw) as unknown;
    return parseStoredDrafts<ResponseToolOutputDraft>(
      parsed,
      (entry) => {
        const toolCallId = typeof entry.toolCallId === 'string' ? entry.toolCallId : '';
        const output = typeof entry.output === 'string' ? entry.output : '';
        const outputType: MessageContentType =
          entry.outputType === 'json' ? 'json' : 'text';
        if (!toolCallId && !output) {
          return null;
        }
        return createToolOutputDraft({
          id: typeof entry.id === 'string' && entry.id ? entry.id : undefined,
          toolCallId,
          output,
          outputType,
        });
      },
      DEFAULT_TOOL_OUTPUT,
    );
  } catch (error) {
    logger.warn('agent_chat.restore_tool_outputs_failed', error);
    return [DEFAULT_TOOL_OUTPUT()];
  }
};

interface StreamMessage {
  type: string;
  data?: unknown;
}

type ConversationStartedPayload = {
  conversationId: string;
  agentSessionId?: string;
  supabaseRunId?: string;
};

function isConversationStartedPayload(data: unknown): data is ConversationStartedPayload {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const record = data as Record<string, unknown>;
  return typeof record.conversationId === 'string';
}

type ChatkitSessionRow = {
  id: string;
  agent_session_id: string;
  chatkit_session_id: string;
  status: 'ACTIVE' | 'CANCELLED' | 'COMPLETED';
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type ConversationSummary = {
  id: string;
  created_at: number;
  metadata?: Record<string, string> | null;
};

type ConversationContentPart = {
  type: string;
  text?: string;
  output_text?: string;
  image_url?: string;
  [key: string]: unknown;
};

type ConversationItemRow = {
  id: string;
  type: string;
  role?: string;
  status?: string;
  content?: ConversationContentPart[];
  metadata?: Record<string, string> | null;
};

type ConversationFilters = {
  mode: 'all' | 'plain' | 'tools' | 'manual';
  agentType: 'all' | 'AUDIT' | 'FINANCE' | 'TAX';
  hasContext: 'any' | 'true' | 'false';
  source: 'all' | 'agent_chat' | 'agent_stream_plain' | 'agent_stream_tools' | 'agent_manual';
  timeRange: 'all' | '24h' | '7d' | '30d';
  mineOnly: boolean;
  search: string;
};

function formatConversationTimestamp(timestamp: number): string {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }
  return date.toLocaleString();
}

function extractItemContent(item: ConversationItemRow): string {
  if (!Array.isArray(item.content)) {
    return '';
  }
  const segments = item.content
    .map((part) => {
      if (!part || typeof part !== 'object') return '';
      if (typeof part.text === 'string' && part.text.length > 0) {
        return part.text;
      }
      if (typeof part.output_text === 'string' && part.output_text.length > 0) {
        return part.output_text;
      }
      if (typeof part.image_url === 'string' && part.image_url.length > 0) {
        return `[image] ${part.image_url}`;
      }
      return part.type ?? '';
    })
    .filter((segment) => segment && segment.length > 0);
  return segments.join('\n');
}

function describeConversationItem(item: ConversationItemRow): string {
  const content = extractItemContent(item);
  if (content) return content;
  if (item.metadata && Object.keys(item.metadata).length > 0) {
    return JSON.stringify(item.metadata, null, 2);
  }
  return JSON.stringify({ type: item.type, status: item.status }, null, 2);
}

export default function AgentChat() {
  const [question, setQuestion] = useState('Summarise ISA 315 key requirements for a senior manager.');
  const [orgSlug, setOrgSlug] = useState('demo');
  const [agentType, setAgentType] = useState<'AUDIT' | 'FINANCE' | 'TAX'>('AUDIT');
  const [engagementId, setEngagementId] = useState('');
  const [context, setContext] = useState('');
  const [events, setEvents] = useState<StreamMessage[]>([]);
  const [output, setOutput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamMode, setStreamMode] = useState<'plain' | 'tools'>('plain');
  const [agentSessionId, setAgentSessionId] = useState<string | null>(null);
  const [supabaseRunId, setSupabaseRunId] = useState('');
  const [startingSession, setStartingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [realtimeSession, setRealtimeSession] = useState<{
    clientSecret: string;
    sessionId?: string | null;
    expiresAt?: string | null;
    turnServers?: Array<{ urls: string; username?: string; credential?: string }>;
  } | null>(null);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const [realtimeVoice, setRealtimeVoice] = useState('verse');
  const [chatkitSession, setChatkitSession] = useState<ChatkitSessionRow | null>(null);
  const [chatkitLoading, setChatkitLoading] = useState(false);
  const [chatkitMessage, setChatkitMessage] = useState<string | null>(null);
  const [chatkitError, setChatkitError] = useState<string | null>(null);
  const [chatkitActionInFlight, setChatkitActionInFlight] = useState<'cancel' | 'resume' | null>(null);
  const [resumeNote, setResumeNote] = useState('');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationLoadingMore, setConversationLoadingMore] = useState(false);
  const [conversationItems, setConversationItems] = useState<ConversationItemRow[]>([]);
  const [conversationItemsLoading, setConversationItemsLoading] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [conversationFilters, setConversationFilters] = useState<ConversationFilters>({
    mode: 'all',
    agentType: 'all',
    hasContext: 'any',
    source: 'all',
    timeRange: 'all',
    mineOnly: false,
    search: '',
  });
  const [conversationCursor, setConversationCursor] = useState<string | null>(null);
  const [conversationHasMore, setConversationHasMore] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const [responseMessages, setResponseMessages] = useState<ResponseMessageDraft[]>(loadStoredMessages);
  const [responseToolOutputs, setResponseToolOutputs] = useState<ResponseToolOutputDraft[]>(loadStoredToolOutputs);
  const [responseModel, setResponseModel] = useState('');
  const [responseRequestJson, setResponseRequestJson] = useState('');
  const [responseError, setResponseError] = useState<string | null>(null);
  const [responseWarnings, setResponseWarnings] = useState<string[]>([]);
  const [responseInFlight, setResponseInFlight] = useState(false);
  const [responseResult, setResponseResult] = useState<Record<string, unknown> | null>(null);
  const [responseDurationMs, setResponseDurationMs] = useState<number | null>(null);
  const [lastResponsePayload, setLastResponsePayload] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(RESPONSE_MESSAGES_STORAGE_KEY, JSON.stringify(responseMessages));
  }, [responseMessages]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(RESPONSE_TOOL_OUTPUTS_STORAGE_KEY, JSON.stringify(responseToolOutputs));
  }, [responseToolOutputs]);

  const startAgentSession = useCallback(async () => {
    const trimmedOrg = orgSlug.trim();
    if (!trimmedOrg) {
      setSessionError('Organisation slug is required to start a session.');
      return;
    }
    setStartingSession(true);
    setSessionError(null);
    setSessionMessage(null);
    setRealtimeError(null);
    setChatkitError(null);
    setChatkitMessage(null);
    try {
      const payload: Record<string, unknown> = {
        orgSlug: trimmedOrg,
        agentType,
      };
      const trimmedEngagement = engagementId.trim();
      if (trimmedEngagement) {
        payload.engagementId = trimmedEngagement;
      }

      const res = await fetch(`${API_BASE}/api/agent/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Failed to start agent session (${res.status})`);
      }

      const body = (await res.json()) as { sessionId: string };
      setAgentSessionId(body.sessionId);
      setSessionMessage(`Agent session ${body.sessionId} started.`);
      setRealtimeSession(null);
      setChatkitSession(null);
      setResumeNote('');
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : 'Failed to start agent session');
    } finally {
      setStartingSession(false);
    }
  }, [agentType, engagementId, orgSlug]);

  const loadChatkitSession = useCallback(async (sessionId: string) => {
    setChatkitLoading(true);
    setChatkitError(null);
    try {
      const res = await fetch(`${API_BASE}/api/agent/chatkit/session/${encodeURIComponent(sessionId)}`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Failed to load ChatKit session (${res.status})`);
      }
      const body = (await res.json()) as { session: ChatkitSessionRow };
      setChatkitSession(body.session);
    } catch (err) {
      setChatkitError(err instanceof Error ? err.message : 'Failed to load ChatKit session');
      setChatkitSession(null);
    } finally {
      setChatkitLoading(false);
    }
  }, []);

  const loadConversations = useCallback(
    async (options?: { cursor?: string | null; append?: boolean }) => {
      const trimmedOrg = orgSlug.trim();
      if (!trimmedOrg) {
        setConversations([]);
        setConversationCursor(null);
        setConversationHasMore(false);
        return;
      }

      if (options?.append) {
        setConversationLoadingMore(true);
      } else {
        setConversationsLoading(true);
        setConversationHasMore(false);
      }
      setConversationError(null);

      try {
        const params = new URLSearchParams({ orgSlug: trimmedOrg, order: 'desc', limit: '20' });
        if (conversationFilters.mode !== 'all') {
          params.set('mode', conversationFilters.mode);
        }
        if (conversationFilters.agentType !== 'all') {
          params.set('agentType', conversationFilters.agentType);
        }
        if (conversationFilters.mineOnly) {
          params.set('mine', '1');
        }
        if (conversationFilters.hasContext !== 'any') {
          params.set('hasContext', conversationFilters.hasContext);
        }
        if (conversationFilters.source !== 'all') {
          params.set('source', conversationFilters.source);
        }
        if (conversationFilters.timeRange !== 'all') {
          params.set('since', conversationFilters.timeRange);
        }
        if (conversationFilters.search.trim()) {
          params.set('search', conversationFilters.search.trim());
        }
        if (options?.cursor) {
          params.set('after', options.cursor);
        }

        const res = await fetch(`${API_BASE}/api/agent/conversations?${params.toString()}`, {
          method: 'GET',
          credentials: 'include',
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Failed to load conversations (${res.status})`);
        }

        const body = (await res.json()) as {
          conversations?: ConversationSummary[];
          hasMore?: boolean;
          lastId?: string | null;
        };

        const incoming = body.conversations ?? [];
        setConversationCursor(body.lastId ?? null);
        setConversationHasMore(Boolean(body.hasMore));

        if (options?.append) {
          setConversations((prev) => {
            const merged = new Map(prev.map((conversation) => [conversation.id, conversation]));
            for (const conversation of incoming) {
              merged.set(conversation.id, conversation);
            }
            return Array.from(merged.values());
          });
        } else {
          setConversations(incoming);
        }
      } catch (error) {
        setConversationError(error instanceof Error ? error.message : 'Failed to load conversations');
      } finally {
        if (options?.append) {
          setConversationLoadingMore(false);
        } else {
          setConversationsLoading(false);
        }
      }
    },
    [conversationFilters, orgSlug],
  );

  const loadConversationItems = useCallback(
    async (conversationId: string) => {
      const trimmedOrg = orgSlug.trim();
      if (!trimmedOrg) {
        return;
      }
      setConversationItemsLoading(true);
      setConversationError(null);
      try {
        const params = new URLSearchParams({ orgSlug: trimmedOrg, order: 'asc', limit: '100' });
        const res = await fetch(
          `${API_BASE}/api/agent/conversations/${encodeURIComponent(conversationId)}/items?${params.toString()}`,
          {
            method: 'GET',
            credentials: 'include',
          },
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Failed to load conversation (${res.status})`);
        }
        const body = (await res.json()) as { items?: ConversationItemRow[] };
        setConversationItems(body.items ?? []);
      } catch (error) {
        setConversationError(error instanceof Error ? error.message : 'Failed to load conversation items');
      } finally {
        setConversationItemsLoading(false);
      }
    },
    [orgSlug],
  );

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      setSelectedConversationId(conversationId);
      conversationIdRef.current = conversationId;
      setConversationItems([]);
      void loadConversationItems(conversationId);
    },
    [loadConversationItems],
  );

  const updateConversationFilter = useCallback((key: keyof ConversationFilters, value: string | boolean) => {
    setConversationFilters((prev) => {
      if (prev[key] === value) {
        return prev;
      }
      return {
        ...prev,
        [key]: value,
      } as ConversationFilters;
    });
    setConversationCursor(null);
  }, []);

  const resetConversationFilters = useCallback(() => {
    setConversationFilters({
      mode: 'all',
      agentType: 'all',
      hasContext: 'any',
      source: 'all',
      timeRange: 'all',
      mineOnly: false,
      search: '',
    });
    setConversationCursor(null);
  }, []);

  const loadMoreConversations = useCallback(() => {
    if (!conversationCursor) return;
    void loadConversations({ cursor: conversationCursor, append: true });
  }, [conversationCursor, loadConversations]);

  useEffect(() => {
    const trimmed = orgSlug.trim();
    if (!trimmed) {
      setConversations([]);
      setConversationItems([]);
      setSelectedConversationId(null);
      setConversationCursor(null);
      setConversationHasMore(false);
      return;
    }

    const timer = setTimeout(() => {
      void loadConversations();
    }, 200);

    return () => {
      clearTimeout(timer);
    };
  }, [orgSlug, loadConversations]);

  const startStream = (mode: 'plain' | 'tools' = 'plain') => {
    if (!question.trim()) return;

    eventSourceRef.current?.close();
    setEvents([]);
    setOutput('');
    setStreaming(true);
    setStreamMode(mode);
    setConversationError(null);
    setConversationItems([]);
    setSelectedConversationId(null);
    conversationIdRef.current = null;

    const params = new URLSearchParams({
      orgSlug: orgSlug.trim(),
      question: question.trim(),
      agentType,
    });
    if (context.trim()) {
      params.set('context', context.trim());
    }
    if (engagementId.trim()) {
      params.set('engagementId', engagementId.trim());
    }
    if (agentSessionId) {
      params.set('agentSessionId', agentSessionId);
    }
    const trimmedRunId = supabaseRunId.trim();
    if (trimmedRunId) {
      params.set('supabaseRunId', trimmedRunId);
    }

    const path = mode === 'tools' ? '/api/agent/stream/execute' : '/api/agent/stream';
    const url = `${API_BASE}${path}?${params.toString()}`;
    const es = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      if (event.data === '[DONE]') {
        es.close();
        setStreaming(false);
        return;
      }

      try {
        const payload = JSON.parse(event.data) as StreamMessage;
        setEvents((prev) => [...prev, payload]);
        if (payload.type === 'started' && payload.data && typeof payload.data === 'object') {
          const data = payload.data as { agentSessionId?: string; supabaseRunId?: string };
          if (!agentSessionId && typeof data.agentSessionId === 'string') {
            setAgentSessionId(data.agentSessionId);
          }
          if (typeof data.supabaseRunId === 'string' && data.supabaseRunId.trim().length > 0) {
            setSupabaseRunId(data.supabaseRunId.trim());
          }
        }
        if (payload.type === 'conversation-started' && isConversationStartedPayload(payload.data)) {
          const data = payload.data;
          const id = data.conversationId;
          conversationIdRef.current = id;
          setSelectedConversationId(id);
          if (!agentSessionId && typeof data.agentSessionId === 'string') {
            setAgentSessionId(data.agentSessionId);
          }
          if (typeof data.supabaseRunId === 'string' && data.supabaseRunId.trim().length > 0) {
            setSupabaseRunId(data.supabaseRunId.trim());
          }
          void loadConversations();
          void loadConversationItems(id);
        }
        if (payload.type === 'text-delta' && typeof payload.data === 'string') {
          const segment = payload.data;
          setOutput((prev) => prev + segment);
        }
        if (payload.type === 'text-done' && typeof payload.data === 'string') {
          const finalSegment = payload.data;
          setOutput((prev) => prev + finalSegment);
        }
        if (payload.type === 'text-final' && typeof payload.data === 'string') {
          const finalText = payload.data;
          setOutput((prev) => (prev.length ? `${prev}\n${finalText}` : finalText));
        }
        if (payload.type === 'completed' && conversationIdRef.current) {
          void loadConversationItems(conversationIdRef.current);
        }
      } catch (err) {
        logger.warn('agent_chat.sse_parse_failed', { error: err, raw: event.data });
      }
    };

    es.onerror = () => {
      es.close();
      setStreaming(false);
    };
  };

  const stopStream = () => {
    eventSourceRef.current?.close();
    setStreaming(false);
  };

  const requestRealtimeSession = async () => {
    const trimmedOrg = orgSlug.trim();
    if (!trimmedOrg) {
      setRealtimeError('Organisation slug is required.');
      return;
    }
    if (!agentSessionId) {
      setRealtimeError('Start an agent session before requesting a realtime session.');
      return;
    }

    setRealtimeError(null);
    setRealtimeSession(null);
    setChatkitMessage(null);
    setChatkitError(null);
    try {
      const payload: Record<string, unknown> = {
        orgSlug: trimmedOrg,
        agentSessionId,
      };
      const voice = realtimeVoice.trim();
      if (voice) {
        payload.voice = voice;
      }
      const res = await fetch(`${API_BASE}/api/agent/realtime/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      const body = (await res.json()) as {
        clientSecret: string;
        sessionId?: string | null;
        expiresAt?: string | null;
        turnServers?: Array<{ urls: string; username?: string; credential?: string }>;
      };
      setRealtimeSession(body);
      if (body.sessionId) {
        await loadChatkitSession(body.sessionId);
        setChatkitMessage('Realtime session created and ChatKit metadata stored.');
      } else {
        setChatkitSession(null);
      }
    } catch (err) {
      setRealtimeError(err instanceof Error ? err.message : 'Failed to create realtime session');
    }
  };

  const cancelChatkitSession = useCallback(async () => {
    const sessionId = chatkitSession?.chatkit_session_id ?? realtimeSession?.sessionId ?? null;
    if (!sessionId) {
      setChatkitError('No ChatKit session available to cancel.');
      return;
    }
    setChatkitActionInFlight('cancel');
    setChatkitError(null);
    setChatkitMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/agent/chatkit/session/${encodeURIComponent(sessionId)}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Failed to cancel session (${res.status})`);
      }
      const body = (await res.json()) as { session: ChatkitSessionRow | null };
      setChatkitSession(body.session ?? null);
      setChatkitMessage('ChatKit session cancelled.');
    } catch (err) {
      setChatkitError(err instanceof Error ? err.message : 'Failed to cancel ChatKit session');
    } finally {
      setChatkitActionInFlight(null);
    }
  }, [chatkitSession, realtimeSession]);

  const resumeChatkitSession = useCallback(async () => {
    const sessionId = chatkitSession?.chatkit_session_id ?? realtimeSession?.sessionId ?? null;
    if (!sessionId) {
      setChatkitError('No ChatKit session available to resume.');
      return;
    }
    setChatkitActionInFlight('resume');
    setChatkitError(null);
    setChatkitMessage(null);
    try {
      const metadataPayload =
        resumeNote.trim().length > 0
          ? { metadata: { note: resumeNote.trim(), resumedFromUi: true } }
          : {};
      const res = await fetch(`${API_BASE}/api/agent/chatkit/session/${encodeURIComponent(sessionId)}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(metadataPayload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Failed to resume session (${res.status})`);
      }
      const body = (await res.json()) as { session: ChatkitSessionRow };
      setChatkitSession(body.session);
      setChatkitMessage('ChatKit session resumed.');
      setResumeNote('');
    } catch (err) {
      setChatkitError(err instanceof Error ? err.message : 'Failed to resume ChatKit session');
    } finally {
      setChatkitActionInFlight(null);
    }
  }, [chatkitSession, realtimeSession, resumeNote]);

  const chatkitSessionIdForActions = chatkitSession?.chatkit_session_id ?? realtimeSession?.sessionId ?? null;
  const chatkitStatus = chatkitSession?.status ?? (chatkitSessionIdForActions ? 'ACTIVE' : '—');
  const supabaseRunIdDisplay = supabaseRunId.trim();

  const moveResponseMessage = useCallback((messageId: string, delta: -1 | 1) => {
    setResponseMessages((prev) => {
      const currentIndex = prev.findIndex((entry) => entry.id === messageId);
      if (currentIndex === -1) {
        return prev;
      }
      const targetIndex = currentIndex + delta;
      if (targetIndex < 0 || targetIndex >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(currentIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }, []);

  const duplicateResponseMessage = useCallback((messageId: string) => {
    setResponseMessages((prev) => {
      const currentIndex = prev.findIndex((entry) => entry.id === messageId);
      if (currentIndex === -1) {
        return prev;
      }
      const original = prev[currentIndex];
      const clone = createMessageDraft({
        role: original.role,
        name: original.name,
        content: original.content,
        contentType: original.contentType,
      });
      const next = [...prev];
      next.splice(currentIndex + 1, 0, clone);
      return next;
    });
  }, []);

  const sendModelResponse = useCallback(async () => {
    const result = buildModelResponsePayload({
      orgSlug,
      model: responseModel,
      requestJson: responseRequestJson,
      messages: responseMessages,
      toolOutputs: responseToolOutputs,
    });

    if ('error' in result) {
      setResponseError(result.error);
      setResponseWarnings([]);
      return;
    }

    const payload = result.payload;

    setResponseInFlight(true);
    setResponseError(null);
    setResponseWarnings(result.warnings);
    setResponseResult(null);
    setResponseDurationMs(null);
    setLastResponsePayload(payload);

    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();

    try {
      const res = await fetch(`${API_BASE}/api/agent/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let body: Record<string, unknown> | null = null;
      if (text) {
        try {
          body = JSON.parse(text) as Record<string, unknown>;
        } catch (parseError) {
          throw new Error(
            parseError instanceof Error
              ? `Failed to parse response JSON: ${parseError.message}`
              : 'Failed to parse response JSON.',
          );
        }
      }

      if (!res.ok) {
        const errorMessage = (body?.error as string | undefined) ?? `Request failed (${res.status})`;
        throw new Error(errorMessage);
      }

      setResponseResult(body);
    } catch (err) {
      setResponseResult(null);
      setResponseError(err instanceof Error ? err.message : 'Failed to create model response.');
    } finally {
      const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
      setResponseDurationMs(Math.round(end - start));
      setResponseInFlight(false);
    }
  }, [orgSlug, responseMessages, responseModel, responseRequestJson, responseToolOutputs]);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Agent operations"
        title="Agent streaming playground"
        description="Streams partial output from the OpenAI Responses API. Provide an organisation slug you have access to, optional context, and prompts. This endpoint is gated by OPENAI_STREAMING_ENABLED on the backend."
      />

      <section aria-label="Stream controls" className={SECTION_CARD_CLASS}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className={FIELD_LABEL_CLASS}>
            Organisation slug
            <input
              value={orgSlug}
              onChange={(event) => setOrgSlug(event.target.value)}
              className={INPUT_CLASS}
              placeholder="org-slug"
            />
          </label>
          <label className={FIELD_LABEL_CLASS}>
            Agent persona
            <select
              value={agentType}
              onChange={(event) => setAgentType(event.target.value as typeof agentType)}
              className={INPUT_CLASS}
            >
              <option value="AUDIT">Audit</option>
              <option value="FINANCE">Finance</option>
              <option value="TAX">Tax</option>
            </select>
          </label>
          <label className={FIELD_LABEL_CLASS}>
            Engagement ID (optional)
            <input
              value={engagementId}
              onChange={(event) => setEngagementId(event.target.value)}
              className={INPUT_CLASS}
              placeholder="engagement-id"
            />
          </label>
          <label className={FIELD_LABEL_CLASS}>
            Supabase run ID (optional)
            <input
              value={supabaseRunId}
              onChange={(event) => setSupabaseRunId(event.target.value)}
              className={INPUT_CLASS}
              placeholder="run-uuid"
            />
          </label>
        </div>

        <label className={FIELD_LABEL_CLASS}>
          Question
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            className={TEXTAREA_CLASS}
            placeholder="Ask the agent..."
          />
        </label>

        <label className={FIELD_LABEL_CLASS}>
          Context (optional)
          <textarea
            value={context}
            onChange={(event) => setContext(event.target.value)}
            className={cn(TEXTAREA_CLASS, 'min-h-[80px]')}
            placeholder="Additional context that will be appended to the prompt"
          />
        </label>

        <label className={FIELD_LABEL_CLASS}>
          Realtime voice (optional)
          <input
            value={realtimeVoice}
            onChange={(event) => setRealtimeVoice(event.target.value)}
            className={INPUT_CLASS}
            placeholder="verse"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={startAgentSession}
            disabled={startingSession}
            className={PRIMARY_BUTTON_CLASS}
          >
            {startingSession ? 'Starting…' : agentSessionId ? 'Restart agent session' : 'Start agent session'}
          </button>
          <button
            type="button"
            onClick={() => startStream('plain')}
            disabled={streaming}
            className={cn(PRIMARY_BUTTON_CLASS, 'bg-brand-500 hover:bg-brand-600')}
          >
            {streaming && streamMode === 'plain' ? 'Streaming…' : 'Start stream'}
          </button>
          {streaming ? (
            <button
              type="button"
              onClick={stopStream}
              className={cn(DESTRUCTIVE_BUTTON_CLASS, 'text-destructive')}
            >
              Stop
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => startStream('tools')}
            disabled={streaming}
            className={cn(PRIMARY_BUTTON_CLASS, 'bg-brand-500 hover:bg-brand-600')}
          >
            {streaming && streamMode === 'tools' ? 'Streaming tools…' : 'Start tool stream'}
          </button>
          <button
            type="button"
            onClick={requestRealtimeSession}
            disabled={!agentSessionId}
            className={cn(SECONDARY_BUTTON_CLASS, 'text-brand-700')}
          >
            Request realtime session
          </button>
        </div>
        {sessionError ? (
          <p className="text-sm text-destructive" role="alert">
            {sessionError}
          </p>
        ) : null}
        {sessionMessage ? <p className="text-sm text-success-600">{sessionMessage}</p> : null}
        {realtimeError ? (
          <p className="text-sm text-destructive" role="alert">
            {realtimeError}
          </p>
        ) : null}
        {realtimeSession ? (
          <div className="space-y-2 rounded-2xl border border-dashed border-border/60 bg-muted/40 p-4 text-xs text-foreground">
            <p className="text-sm font-semibold text-foreground">Realtime session</p>
            <p>
              Client Secret: <code className="break-all font-mono">{realtimeSession.clientSecret}</code>
            </p>
            <p>
              Session ID:{' '}
              <span className="font-mono">
                {realtimeSession.sessionId ? realtimeSession.sessionId : 'n/a'}
              </span>
            </p>
            <p>
              Expires At:{' '}
              {realtimeSession.expiresAt
                ? new Date(realtimeSession.expiresAt).toLocaleString()
                : 'n/a'}
            </p>
            {realtimeSession.turnServers && realtimeSession.turnServers.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">TURN servers</p>
                <ul className="space-y-1 text-[0.7rem]">
                  {realtimeSession.turnServers.map((server, index) => (
                    <li key={`${server.urls}-${index}`} className="break-all">
                      <span className="font-mono">{server.urls}</span>
                      {server.username ? (
                        <span className="text-muted-foreground">
                          {' '}(user: {server.username}
                          {server.credential ? `, cred: ${server.credential}` : ''})
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="mt-2 text-muted-foreground">
              Use this secret with OpenAI’s Realtime WebRTC/WebSocket client to establish an audio/video session. It is ephemeral and should not be shared.
            </p>
          </div>
        ) : null}
        {agentSessionId ? (
          <div className="space-y-4 rounded-2xl border border-dashed border-border/60 bg-muted/30 p-4 text-xs text-foreground">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Agent session</p>
              <p>
                Session ID: <code className="break-all font-mono">{agentSessionId}</code>
              </p>
              {supabaseRunIdDisplay ? (
                <p>
                  Supabase Run ID: <code className="break-all font-mono">{supabaseRunIdDisplay}</code>
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (chatkitSessionIdForActions) {
                    void loadChatkitSession(chatkitSessionIdForActions);
                  }
                }}
                disabled={!chatkitSessionIdForActions || chatkitLoading}
                className={SECONDARY_BUTTON_CLASS}
              >
                {chatkitLoading ? 'Refreshing…' : 'Refresh ChatKit session'}
              </button>
              <button
                type="button"
                onClick={cancelChatkitSession}
                disabled={!chatkitSessionIdForActions || chatkitActionInFlight === 'cancel'}
                className={DESTRUCTIVE_BUTTON_CLASS}
              >
                {chatkitActionInFlight === 'cancel' ? 'Cancelling…' : 'Cancel ChatKit session'}
              </button>
              <button
                type="button"
                onClick={resumeChatkitSession}
                disabled={!chatkitSessionIdForActions || chatkitActionInFlight === 'resume'}
                className={cn(SECONDARY_BUTTON_CLASS, 'text-brand-700')}
              >
                {chatkitActionInFlight === 'resume' ? 'Resuming…' : 'Resume ChatKit session'}
              </button>
            </div>
            <div className="space-y-2">
              <p>
                Status: <span className="font-semibold text-foreground">{chatkitStatus}</span>
              </p>
              {chatkitSession?.metadata ? (
                <details className="rounded-2xl border border-border/60 bg-background/70 p-3 text-left text-[0.75rem]">
                  <summary className="cursor-pointer select-none text-sm font-medium text-foreground">Metadata</summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs">
                    {JSON.stringify(chatkitSession.metadata, null, 2)}
                  </pre>
                </details>
              ) : null}
              <p>
                Updated at: {chatkitSession?.updated_at ? new Date(chatkitSession.updated_at).toLocaleString() : '—'}
              </p>
            </div>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Resume note (optional)
              <input
                value={resumeNote}
                onChange={(event) => setResumeNote(event.target.value)}
                className={COMPACT_INPUT_CLASS}
                placeholder="Add a note when resuming"
              />
            </label>
            {chatkitError ? (
              <p className="text-sm text-destructive" role="alert">
                {chatkitError}
              </p>
            ) : null}
            {chatkitMessage ? <p className="text-sm text-success-600">{chatkitMessage}</p> : null}
          </div>
        ) : null}
      </section>

      <section aria-label="Agent output" className={cn(SECTION_CARD_CLASS, 'space-y-3')}>
        <h2 className="text-lg font-semibold text-foreground">Output</h2>
        <pre className="min-h-[160px] whitespace-pre-wrap rounded-2xl border border-border/50 bg-background/90 p-4 text-sm">
          {output || 'Awaiting output…'}
        </pre>
      </section>

      <section aria-label="Responses API" className={cn(SECTION_CARD_CLASS, 'space-y-4')}>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Responses API (single request)</h2>
          <p className="text-sm text-muted-foreground">
            Call the non-streaming <code>/api/agent/respond</code> endpoint to debug a single-turn model response. Provide an
            optional model override and JSON request body to supply tools, metadata, or tool outputs.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className={FIELD_LABEL_CLASS}>
            Model (optional)
            <input
              value={responseModel}
              onChange={(event) => setResponseModel(event.target.value)}
              className={INPUT_CLASS}
              placeholder="gpt-4.1-mini"
            />
          </label>
          <div className="md:col-span-2 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Messages</h3>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    setResponseMessages((prev) => [
                      ...prev,
                      createMessageDraft({ role: 'user' }),
                    ])
                  }
                  className={SECONDARY_BUTTON_CLASS}
                >
                  Add message
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Compose an ordered array of messages for the Responses API. Leave content blank to omit a message from the
              request.
            </p>
            <div className="space-y-3">
              {responseMessages.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-4 text-xs text-muted-foreground">
                  No messages configured. Add one above to include prompt content.
                </div>
              ) : null}
              {responseMessages.map((message, index) => (
                <div
                  key={message.id}
                  className="space-y-3 rounded-2xl border border-border/60 bg-background/90 p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Message {index + 1}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1 text-xs font-medium">
                        Role
                        <select
                          value={message.role}
                          onChange={(event) =>
                            setResponseMessages((prev) =>
                              prev.map((entry) =>
                                entry.id === message.id ? { ...entry, role: event.target.value } : entry,
                              ),
                            )
                          }
                          className={COMPACT_INPUT_CLASS}
                        >
                          <option value="user">user</option>
                          <option value="assistant">assistant</option>
                          <option value="system">system</option>
                          <option value="developer">developer</option>
                          <option value="tool">tool</option>
                        </select>
                      </label>
                      <label className="flex items-center gap-1 text-xs font-medium">
                        Content type
                        <select
                          value={message.contentType}
                          onChange={(event) =>
                            setResponseMessages((prev) =>
                              prev.map((entry) =>
                                entry.id === message.id
                                  ? { ...entry, contentType: event.target.value as MessageContentType }
                                  : entry,
                              ),
                            )
                          }
                          className={COMPACT_INPUT_CLASS}
                        >
                          <option value="text">Text</option>
                          <option value="json">JSON</option>
                        </select>
                      </label>
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          onClick={() => duplicateResponseMessage(message.id)}
                          className={cn(SECONDARY_BUTTON_CLASS, 'px-2 py-1 text-xs')}
                          aria-label={`Duplicate message ${index + 1}`}
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          onClick={() => moveResponseMessage(message.id, -1)}
                          disabled={index === 0}
                          className={cn(SECONDARY_BUTTON_CLASS, 'px-2 py-1 text-xs')}
                          aria-label={`Move message ${index + 1} up`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveResponseMessage(message.id, 1)}
                          disabled={index === responseMessages.length - 1}
                          className={cn(SECONDARY_BUTTON_CLASS, 'px-2 py-1 text-xs')}
                          aria-label={`Move message ${index + 1} down`}
                        >
                          ↓
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setResponseMessages((prev) => prev.filter((entry) => entry.id !== message.id))
                        }
                        className={cn(DESTRUCTIVE_BUTTON_CLASS, 'px-2 py-1 text-xs')}
                        aria-label={`Remove message ${index + 1}`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <label className={COMPACT_LABEL_CLASS}>
                    Name (optional)
                    <input
                      value={message.name}
                      onChange={(event) =>
                        setResponseMessages((prev) =>
                          prev.map((entry) =>
                            entry.id === message.id ? { ...entry, name: event.target.value } : entry,
                          ),
                        )
                      }
                      className={COMPACT_INPUT_CLASS}
                      placeholder="function-helper"
                    />
                  </label>
                  <label className={COMPACT_LABEL_CLASS}>
                    Message content
                    <textarea
                      value={message.content}
                      onChange={(event) =>
                        setResponseMessages((prev) =>
                          prev.map((entry) =>
                            entry.id === message.id ? { ...entry, content: event.target.value } : entry,
                          ),
                        )
                      }
                      className={SMALL_TEXTAREA_CLASS}
                      placeholder={
                        message.contentType === 'json'
                          ? '[{"type":"text","text":"Hello"}]'
                          : 'Ask the model...'
                      }
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
            Request overrides (JSON, optional)
            <textarea
              value={responseRequestJson}
              onChange={(event) => setResponseRequestJson(event.target.value)}
              className={cn(TEXTAREA_CLASS, 'min-h-[140px] font-mono text-xs')}
              placeholder='{
  "temperature": 0.3,
  "metadata": { "debug": true }
}'
            />
          </label>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Tool outputs</h3>
            <button
              type="button"
              onClick={() =>
                setResponseToolOutputs((prev) => [
                  ...prev,
                  createToolOutputDraft(),
                ])
              }
              className={SECONDARY_BUTTON_CLASS}
            >
              Add tool output
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Provide tool call IDs and outputs to continue a previous response. Leave entries blank to exclude them from the
            request.
          </p>
          <div className="space-y-3">
            {responseToolOutputs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-4 text-xs text-muted-foreground">
                No tool outputs configured.
              </div>
            ) : null}
            {responseToolOutputs.map((entry, index) => (
              <div
                key={entry.id}
                className="space-y-3 rounded-2xl border border-border/60 bg-background/90 p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Tool output {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setResponseToolOutputs((prev) => prev.filter((candidate) => candidate.id !== entry.id))
                    }
                    className={DESTRUCTIVE_BUTTON_CLASS}
                    aria-label={`Remove tool output ${index + 1}`}
                  >
                    Remove
                  </button>
                </div>
                <label className={COMPACT_LABEL_CLASS}>
                  Tool call ID
                  <input
                    value={entry.toolCallId}
                    onChange={(event) =>
                      setResponseToolOutputs((prev) =>
                        prev.map((candidate) =>
                          candidate.id === entry.id ? { ...candidate, toolCallId: event.target.value } : candidate,
                        ),
                      )
                    }
                    className={COMPACT_INPUT_CLASS}
                    placeholder="call_abc123"
                  />
                </label>
                <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-start">
                  <label className={COMPACT_LABEL_CLASS}>
                    Output
                    <textarea
                      value={entry.output}
                      onChange={(event) =>
                        setResponseToolOutputs((prev) =>
                          prev.map((candidate) =>
                            candidate.id === entry.id ? { ...candidate, output: event.target.value } : candidate,
                          ),
                        )
                      }
                      className={SMALL_TEXTAREA_CLASS}
                      placeholder={
                        entry.outputType === 'json'
                          ? '{"result":"ok"}'
                          : 'Tool execution output...'
                      }
                    />
                  </label>
                  <label className={COMPACT_LABEL_CLASS}>
                    Output type
                    <select
                      value={entry.outputType}
                      onChange={(event) =>
                        setResponseToolOutputs((prev) =>
                          prev.map((candidate) =>
                            candidate.id === entry.id
                              ? { ...candidate, outputType: event.target.value as MessageContentType }
                              : candidate,
                          ),
                        )
                      }
                      className={COMPACT_INPUT_CLASS}
                    >
                      <option value="text">Text</option>
                      <option value="json">JSON</option>
                    </select>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={sendModelResponse}
            disabled={responseInFlight}
            className={cn(PRIMARY_BUTTON_CLASS, 'bg-brand-500 hover:bg-brand-600')}
          >
            {responseInFlight ? 'Sending…' : 'Send model request'}
          </button>
          {responseDurationMs !== null ? (
            <span className="text-sm text-muted-foreground">{responseDurationMs} ms</span>
          ) : null}
        </div>

        {responseWarnings.length > 0 ? (
          <div className="space-y-1 rounded-2xl border border-warning-200 bg-warning-50/80 p-4 text-xs text-warning-900">
            <p className="font-semibold">Request warnings</p>
            <ul className="list-disc space-y-1 pl-4">
              {responseWarnings.map((warning, index) => (
                <li key={`${warning}-${index}`}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {responseError ? (
          <p className="text-sm text-destructive" role="alert">
            {responseError}
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Last request payload</h3>
            <pre className="min-h-[120px] whitespace-pre-wrap break-words rounded-2xl border border-border/50 bg-background/90 p-4 text-xs">
              {lastResponsePayload ? JSON.stringify(lastResponsePayload, null, 2) : '—'}
            </pre>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Latest response</h3>
            <pre className="min-h-[120px] whitespace-pre-wrap break-words rounded-2xl border border-border/50 bg-background/90 p-4 text-xs">
              {responseResult ? JSON.stringify(responseResult, null, 2) : responseInFlight ? 'Awaiting response…' : '—'}
            </pre>
          </div>
        </div>
      </section>

      <section aria-label="Stream events" className={cn(SECTION_CARD_CLASS, 'space-y-3')}>
        <h2 className="text-lg font-semibold text-foreground">Stream events</h2>
        <div className="max-h-[240px] overflow-auto rounded-2xl border border-border/50 bg-background/90 p-4 text-xs">
          {events.length === 0 ? <p>No events yet.</p> : null}
          {events.map((evt, index) => (
            <pre key={index} className="mb-2 whitespace-pre-wrap">
              {JSON.stringify(evt, null, 2)}
            </pre>
          ))}
        </div>
      </section>

      <section aria-label="Stored conversations" className={cn(SECTION_CARD_CLASS, 'space-y-4')}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">Stored conversations</h2>
          <button
            type="button"
            onClick={() => void loadConversations()}
            className={cn(SECONDARY_BUTTON_CLASS, 'text-sm')}
          >
            Refresh list
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className={COMPACT_LABEL_CLASS}>
            Mode
            <select
              value={conversationFilters.mode}
              onChange={(event) => updateConversationFilter('mode', event.target.value as ConversationFilters['mode'])}
              className={COMPACT_INPUT_CLASS}
            >
              <option value="all">All</option>
              <option value="plain">Plain</option>
              <option value="tools">Tools</option>
              <option value="manual">Manual</option>
            </select>
          </label>
          <label className={COMPACT_LABEL_CLASS}>
            Agent Persona
            <select
              value={conversationFilters.agentType}
              onChange={(event) => updateConversationFilter('agentType', event.target.value as ConversationFilters['agentType'])}
              className={COMPACT_INPUT_CLASS}
            >
              <option value="all">All personas</option>
              <option value="AUDIT">Audit</option>
              <option value="FINANCE">Finance</option>
              <option value="TAX">Tax</option>
            </select>
          </label>
          <label className={COMPACT_LABEL_CLASS}>
            Context
            <select
              value={conversationFilters.hasContext}
              onChange={(event) => updateConversationFilter('hasContext', event.target.value as ConversationFilters['hasContext'])}
              className={COMPACT_INPUT_CLASS}
            >
              <option value="any">Any</option>
              <option value="true">With context</option>
              <option value="false">No context</option>
            </select>
          </label>
          <label className={COMPACT_LABEL_CLASS}>
            Source
            <select
              value={conversationFilters.source}
              onChange={(event) => updateConversationFilter('source', event.target.value as ConversationFilters['source'])}
              className={COMPACT_INPUT_CLASS}
            >
              <option value="all">All sources</option>
              <option value="agent_chat">Agent chat</option>
              <option value="agent_stream_plain">Plain stream</option>
              <option value="agent_stream_tools">Tool stream</option>
              <option value="agent_manual">Manual</option>
            </select>
          </label>
          <label className={COMPACT_LABEL_CLASS}>
            Time range
            <select
              value={conversationFilters.timeRange}
              onChange={(event) => updateConversationFilter('timeRange', event.target.value as ConversationFilters['timeRange'])}
              className={COMPACT_INPUT_CLASS}
            >
              <option value="all">All time</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:col-span-2 xl:col-span-2">
            Search
            <input
              value={conversationFilters.search}
              onChange={(event) => updateConversationFilter('search', event.target.value)}
              placeholder="Search by id or prompt"
              className={COMPACT_INPUT_CLASS}
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="inline-flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={conversationFilters.mineOnly}
              onChange={(event) => updateConversationFilter('mineOnly', event.target.checked)}
              className="h-4 w-4 rounded border border-border/60 text-brand-600 focus:ring-brand-200"
            />
            <span>Only show my runs</span>
          </label>
          <button
            type="button"
            onClick={resetConversationFilters}
            className="text-sm font-medium text-brand-700 underline-offset-4 hover:underline"
          >
            Reset filters
          </button>
        </div>
        {conversationError ? (
          <p className="text-sm text-destructive" role="alert">
            {conversationError}
          </p>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Conversations</span>
              {conversationsLoading ? <span className="text-xs text-muted-foreground">Loading…</span> : null}
            </div>
            {conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stored conversations yet.</p>
            ) : (
              <ul className="space-y-2">
                {conversations.map((conversation) => (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectConversation(conversation.id)}
                      className={cn(
                        'w-full rounded-2xl border px-3 py-2 text-left text-sm transition',
                        selectedConversationId === conversation.id
                          ? 'border-brand-400 bg-brand-50 text-brand-700 shadow-sm'
                          : 'border-border/60 hover:bg-muted/40',
                      )}
                    >
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{conversation.metadata?.agent_type ?? 'unknown'} agent</span>
                        <span>{formatConversationTimestamp(conversation.created_at)}</span>
                      </div>
                      <div className="truncate text-sm font-medium">{conversation.id}</div>
                      <div className="mt-1 flex flex-wrap gap-2 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                        <span className={PILL_BADGE_CLASS}>{conversation.metadata?.mode ?? 'unknown'}</span>
                        {conversation.metadata?.source ? (
                          <span className={PILL_BADGE_CLASS}>{conversation.metadata.source}</span>
                        ) : null}
                        {conversation.metadata?.has_context === 'true' || conversation.metadata?.context_present === 'true' ? (
                          <span className={EMPHASIS_BADGE_CLASS}>context</span>
                        ) : null}
                      </div>
                      {conversation.metadata?.initial_prompt_preview ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {conversation.metadata.initial_prompt_preview}
                        </p>
                      ) : null}
                      {conversation.metadata?.agent_session_id || conversation.metadata?.supabase_run_id ? (
                        <div className="mt-1 space-y-0.5 text-[0.65rem] text-muted-foreground">
                          {conversation.metadata?.agent_session_id ? (
                            <p>
                              Session: <code className="break-all">{conversation.metadata.agent_session_id}</code>
                            </p>
                          ) : null}
                          {conversation.metadata?.supabase_run_id ? (
                            <p>
                              Run: <code className="break-all">{conversation.metadata.supabase_run_id}</code>
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
        {conversationHasMore ? (
          <div className="pt-2">
            <button
              type="button"
              onClick={loadMoreConversations}
              disabled={conversationLoadingMore || !conversationCursor}
              className={cn(SECONDARY_BUTTON_CLASS, 'w-full text-sm')}
            >
              {conversationLoadingMore ? 'Loading more…' : 'Load more'}
            </button>
          </div>
        ) : null}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Transcript</span>
              {conversationItemsLoading ? <span className="text-xs text-muted-foreground">Loading…</span> : null}
            </div>
            {selectedConversationId ? (
              <p className="text-xs text-muted-foreground">Conversation ID: {selectedConversationId}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Select a conversation to view its transcript.</p>
            )}
            {selectedConversationId && conversationItems.length === 0 && !conversationItemsLoading ? (
              <p className="text-sm text-muted-foreground">No items recorded yet.</p>
            ) : null}
            {conversationItems.length > 0 ? (
              <ul className="max-h-[280px] space-y-2 overflow-auto rounded-2xl border border-border/50 bg-background/90 p-3 text-sm">
                {conversationItems.map((item) => (
                  <li key={item.id} className="rounded-xl border border-border/50 bg-card/90 p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{item.role ?? item.type}</span>
                      <span>{item.metadata?.stage ?? item.status ?? ''}</span>
                    </div>
                    <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-muted/30 p-2 text-sm">
                      {describeConversationItem(item)}
                    </pre>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
