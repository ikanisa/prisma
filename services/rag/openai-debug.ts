import type { SupabaseClient } from '@supabase/supabase-js';
import type OpenAI from 'openai';

import { buildOpenAiUrl } from '../../lib/openai/url';

export interface OpenAiDebugLoggerOptions {
  supabase: Pick<SupabaseClient, 'from'>;
  apiKey?: string;
  enabled: boolean;
  fetchDetails: boolean;
  logError: (message: string, error: unknown, meta?: Record<string, unknown>) => void;
  logInfo?: (message: string, meta?: Record<string, unknown>) => void;
  defaultTags?: string[];
  quotaTag?: string | null;
}

export interface OpenAiDebugEvent {
  endpoint: string;
  response: {
    id?: string;
    model?: string;
    usage?: Record<string, unknown> | null;
    [key: string]: unknown;
  } | null;
  requestPayload?: unknown;
  metadata?: Record<string, unknown>;
  orgId?: string | null;
  tags?: string[];
  quotaTag?: string | null;
}

export function createOpenAiDebugLogger(options: OpenAiDebugLoggerOptions) {
  const { supabase, apiKey, enabled, fetchDetails, logError, logInfo } = options;

  if (!enabled) {
    return async (_event: OpenAiDebugEvent) => {};
  }

  const defaultTags = Array.from(
    new Set((options.defaultTags ?? []).map((tag) => tag.trim()).filter(Boolean)),
  );
  const defaultQuotaTag = options.quotaTag?.trim() ?? null;

  async function fetchDebugDetails(responseId: string, meta?: Record<string, unknown>) {
    if (!fetchDetails || !apiKey) {
      return null;
    }

    try {
      const res = await fetch(buildOpenAiUrl(`requests/${responseId}/debug`), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`Debug endpoint returned ${res.status}`);
      }
      return await res.json();
    } catch (error) {
      logError('openai.debug_fetch_failed', error, { responseId, ...(meta ?? {}) });
      return null;
    }
  }

  return async function logOpenAiDebugEvent(event: OpenAiDebugEvent) {
    const responseId = event.response?.id;
    if (!responseId) {
      return;
    }

    const eventTags = Array.from(
      new Set((event.tags ?? []).map((tag) => tag.trim()).filter(Boolean)),
    );
    const tagSet = new Set<string>([...defaultTags, ...eventTags, `endpoint:${event.endpoint}`]);

    const model = typeof event.response?.model === 'string' ? event.response.model.trim() : '';
    if (model) {
      tagSet.add(`model:${model}`);
    }

    const orgId = typeof event.orgId === 'string' ? event.orgId.trim() : '';
    if (orgId) {
      tagSet.add(`org:${orgId}`);
    }

    const debugDetails = await fetchDebugDetails(responseId, { endpoint: event.endpoint });

    const statusCodeFromDebug =
      typeof debugDetails?.response?.status_code === 'number'
        ? debugDetails.response.status_code
        : null;
    const statusCodeFromResponse =
      typeof event.response?.status_code === 'number' ? (event.response.status_code as number) : null;
    const statusCode = statusCodeFromDebug ?? statusCodeFromResponse ?? null;

    if (statusCode !== null) {
      tagSet.add(`status:${statusCode}`);
    }

    const tags = tagSet.size > 0 ? Array.from(tagSet).sort() : null;
    const quotaTag = event.quotaTag?.trim() ?? defaultQuotaTag ?? null;

    const payload = {
      request_id: responseId,
      model: (event.response?.model as string | undefined) ?? null,
      endpoint: event.endpoint,
      status_code: statusCode,
      org_id: event.orgId ?? null,
      metadata: {
        usage: event.response?.usage ?? null,
        request: event.requestPayload ?? null,
        extras: event.metadata ?? null,
        tags,
        quota_tag: quotaTag,
      },
      debug: debugDetails,
    };

    try {
      await supabase
        .from('openai_debug_events')
        .upsert(payload, { onConflict: 'request_id' });
      logInfo?.('openai.debug_event_recorded', {
        responseId,
        endpoint: event.endpoint,
        tags,
        quotaTag,
      });
    } catch (error) {
      logError('openai.debug_event_persist_failed', error, {
        responseId,
        endpoint: event.endpoint,
        tags,
        quotaTag,
      });
    }
  };
}

export type OpenAiClientWithDebug = OpenAI & { debugLogger?: ReturnType<typeof createOpenAiDebugLogger> };
