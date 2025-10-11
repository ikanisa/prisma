import { buildOpenAiUrl } from '../../lib/openai/url';

interface CreateRealtimeSessionOptions {
  openAiApiKey?: string;
  model?: string;
  voice?: string;
  logError: (message: string, error: unknown, meta?: Record<string, unknown>) => void;
  logInfo?: (message: string, meta?: Record<string, unknown>) => void;
  turnServers?: Array<{ urls: string; username?: string; credential?: string }>;
  sessionMetadata?: Record<string, unknown>;
}

export type RealtimeTurnServerConfig = {
  urls: string;
  username?: string;
  credential?: string;
};

function normaliseTurnServerEntry(input: unknown): RealtimeTurnServerConfig | null {
  if (!input || typeof input !== 'object') {
    return null;
  }
  const entry = input as Record<string, unknown>;
  const urls = typeof entry.urls === 'string' ? entry.urls.trim() : '';
  if (!urls) return null;
  const username = typeof entry.username === 'string' ? entry.username.trim() : undefined;
  const credential = typeof entry.credential === 'string' ? entry.credential.trim() : undefined;
  return { urls, username, credential };
}

function parseTurnServerString(value: string): RealtimeTurnServerConfig[] {
  return value
    .split(',')
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => {
      const [urls, username, credential] = chunk.split('|').map((part) => part.trim());
      if (!urls) return null;
      return {
        urls,
        username: username || undefined,
        credential: credential || undefined,
      };
    })
    .filter((entry): entry is RealtimeTurnServerConfig => Boolean(entry));
}

export function getRealtimeTurnServers(): RealtimeTurnServerConfig[] {
  const raw = process.env.OPENAI_REALTIME_TURN_SERVERS;
  if (!raw) {
    return [];
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      const result = parsed
        .map((item) => normaliseTurnServerEntry(item))
        .filter((entry): entry is RealtimeTurnServerConfig => entry !== null);
      return result;
    }
    if (parsed && typeof parsed === 'object') {
      const entry = normaliseTurnServerEntry(parsed);
      return entry ? [entry] : [];
    }
  } catch {
    // fall back to delimited parsing
  }

  return parseTurnServerString(trimmed);
}

export async function createRealtimeSession(options: CreateRealtimeSessionOptions) {
  const apiKey = options.openAiApiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY must be configured to create realtime sessions');
  }

  const body: Record<string, unknown> = {
    model: options.model ?? process.env.OPENAI_REALTIME_MODEL ?? 'gpt-4o-realtime-preview',
    voice: options.voice ?? process.env.OPENAI_REALTIME_VOICE ?? 'verse',
  };

  if (options.turnServers?.length) {
    body.turn_servers = options.turnServers;
  }
  if (options.sessionMetadata) {
    body.metadata = options.sessionMetadata;
  }

  try {
    const res = await fetch(buildOpenAiUrl('realtime/sessions'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Realtime session request failed with status ${res.status}: ${text}`);
    }

    const json = (await res.json()) as {
      client_secret?: { value: string };
      id?: string;
      expires_at?: string;
    };

    if (!json.client_secret?.value) {
      throw new Error('Realtime session response missing client secret');
    }

    options.logInfo?.('openai.realtime_session_created', {
      sessionId: json.id ?? null,
      expiry: json.expires_at ?? null,
    });

    return json;
  } catch (error) {
    options.logError('openai.realtime_session_failed', error, {});
    throw error;
  }
}
