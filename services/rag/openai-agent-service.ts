import type { SupabaseClient } from '@supabase/supabase-js';

import { buildOpenAiUrl } from '../../lib/openai/url';

interface ToolRecord {
  key: string;
  label: string | null;
  description: string | null;
  min_role: string;
  sensitive: boolean;
  standards_refs: string[] | null;
  enabled: boolean;
  metadata: Record<string, unknown> | null;
}

interface SyncOptions {
  supabase: Pick<SupabaseClient, 'from'>;
  openAiApiKey?: string;
  logError: (message: string, error: unknown, meta?: Record<string, unknown>) => void;
  logInfo?: (message: string, meta?: Record<string, unknown>) => void;
  retryCount?: number;
}

interface AgentThreadOptions {
  openAiApiKey?: string;
  logError: (message: string, error: unknown, meta?: Record<string, unknown>) => void;
}

interface AgentRunOptions extends AgentThreadOptions {
  agentId: string;
  threadId: string;
  instructions: string;
  metadata?: Record<string, unknown>;
  logInfo?: (message: string, meta?: Record<string, unknown>) => void;
}

export function isAgentPlatformEnabled(): boolean {
  return (process.env.OPENAI_AGENT_PLATFORM_ENABLED ?? 'false').toLowerCase() === 'true';
}

export function getOpenAiAgentId(): string | null {
  const value = process.env.OPENAI_AGENT_ID?.trim();
  return value && value.length > 0 ? value : null;
}

function buildAuthHeaders(apiKey?: string): HeadersInit {
  if (!apiKey) {
    throw new Error('OpenAI API key is required for agent platform operations');
  }
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

export function buildOpenAiToolDefinition(tool: ToolRecord) {
  const description =
    tool.description && tool.description.trim().length > 0
      ? tool.description.trim()
      : tool.label && tool.label.trim().length > 0
      ? tool.label.trim()
      : tool.key;

  const metadata = (tool.metadata ?? {}) as Record<string, unknown>;
  const paramSchema = metadata.parameters as Record<string, unknown> | undefined;

  return {
    type: 'function',
    function: {
      name: tool.key,
      description,
      parameters:
        paramSchema && Object.keys(paramSchema).length > 0
          ? paramSchema
          : {
              type: 'object',
              properties: {},
              additionalProperties: true,
            },
    },
    metadata,
  };
}

async function fetchEnabledGlobalTools(supabase: SyncOptions['supabase'], logError: SyncOptions['logError']) {
  try {
    const { data, error } = await supabase
      .from('tool_registry')
      .select('key, label, description, min_role, sensitive, standards_refs, enabled, metadata')
      .is('org_id', null)
      .eq('enabled', true);

    if (error) {
      throw error;
    }

    return (data ?? []) as ToolRecord[];
  } catch (error) {
    logError('openai.agent_tool_fetch_failed', error, {});
    return [];
  }
}

export async function syncAgentToolsFromRegistry(options: SyncOptions) {
  if (!isAgentPlatformEnabled()) return;

  const agentId = getOpenAiAgentId();
  if (!agentId) {
    options.logError('openai.agent_tool_sync_skipped', new Error('OPENAI_AGENT_ID not configured'));
    return;
  }

  const tools = await fetchEnabledGlobalTools(options.supabase, options.logError);
  if (tools.length === 0) {
    options.logInfo?.('openai.agent_tool_sync_no_tools');
    return;
  }

  const payload = {
    tools: tools.map(buildOpenAiToolDefinition),
  };

  const maxAttempts = Math.max(1, options.retryCount ?? 1);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await fetch(buildOpenAiUrl(`agents/${agentId}`), {
        method: 'PATCH',
        headers: buildAuthHeaders(options.openAiApiKey ?? process.env.OPENAI_API_KEY),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Agent tool sync failed with status ${res.status}: ${body}`);
      }

      options.logInfo?.('openai.agent_tool_sync_completed', { agentId, toolCount: tools.length, attempt });
      return;
    } catch (error) {
      options.logError('openai.agent_tool_sync_failed', error, { agentId, attempt });
      if (attempt === maxAttempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
}

export async function createAgentThread(options: AgentThreadOptions): Promise<string | null> {
  if (!isAgentPlatformEnabled()) return null;

  try {
    const res = await fetch(buildOpenAiUrl('threads'), {
      method: 'POST',
      headers: buildAuthHeaders(options.openAiApiKey ?? process.env.OPENAI_API_KEY),
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Thread creation failed with status ${res.status}: ${body}`);
    }

    const json = (await res.json()) as { id?: string };
    if (!json.id) {
      throw new Error('Thread creation response missing id');
    }
    return json.id;
  } catch (error) {
    options.logError('openai.agent_thread_failed', error, {});
    return null;
  }
}

async function appendMessageToThread(options: AgentRunOptions) {
  try {
    const res = await fetch(buildOpenAiUrl(`threads/${options.threadId}/messages`), {
      method: 'POST',
      headers: buildAuthHeaders(options.openAiApiKey ?? process.env.OPENAI_API_KEY),
      body: JSON.stringify({ role: 'user', content: options.instructions }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to append thread message: ${res.status} ${body}`);
    }
  } catch (error) {
    options.logError('openai.agent_thread_message_failed', error, { threadId: options.threadId });
    throw error;
  }
}

export async function createAgentRun(options: AgentRunOptions): Promise<{ runId: string; responseId?: string } | null> {
  if (!isAgentPlatformEnabled()) return null;

  try {
    await appendMessageToThread(options);

    const res = await fetch(buildOpenAiUrl(`agents/${options.agentId}/runs`), {
      method: 'POST',
      headers: buildAuthHeaders(options.openAiApiKey ?? process.env.OPENAI_API_KEY),
      body: JSON.stringify({
        thread_id: options.threadId,
        metadata: options.metadata ?? {},
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Agent run creation failed with status ${res.status}: ${body}`);
    }

    const json = (await res.json()) as { id?: string; response_id?: string };
    if (!json.id) {
      throw new Error('Agent run response missing id');
    }

    options.logInfo?.('openai.agent_run_created', { runId: json.id, threadId: options.threadId });
    return { runId: json.id, responseId: json.response_id };
  } catch (error) {
    options.logError('openai.agent_run_failed', error, { threadId: options.threadId, agentId: options.agentId });
    return null;
  }
}
