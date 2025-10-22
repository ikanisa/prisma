/* eslint-env node */
import { env } from './env.js';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import Tesseract from 'tesseract.js';
import { Client } from 'pg';
import { vector } from 'pgvector';
import NodeCache from 'node-cache';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { randomUUID, createHash } from 'crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import * as Sentry from '@sentry/node';
import { context, trace, SpanStatusCode } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { createClient } from '@supabase/supabase-js';
import type {
  ChatCompletionChunk,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionListParams,
  ChatCompletionUpdateParams,
} from 'openai/resources/chat/completions';
import type { MessageListParams } from 'openai/resources/chat/completions/messages';
import { getSignedUrlTTL } from '../../lib/security/signed-url-policy';
import {
  scheduleLearningRun,
  getDriveConnectorMetadata,
  previewDriveDocuments,
  processDriveChanges,
  getConnectorIdForOrg,
  triggerDriveBackfill,
  downloadDriveFile,
  isSupportedDriveMime,
  isManifestFile,
  parseManifestBuffer,
  type DriveChangeQueueRow,
  type ManifestEntry,
} from './knowledge/ingestion';
import type { DriveSource } from './knowledge/drive';
import { listWebSources, getWebSource, type WebSourceRow } from './knowledge/web';
import { getSupabaseJwtSecret, getSupabaseServiceRoleKey } from '../../lib/secrets';
import { generateAgentPlan } from '../../lib/agents/runtime';
import {
  roleFromString,
  ROLE_PRIORITY,
  type AgentRequestContext,
  type AgentRole,
} from '../../lib/agents/types';
import {
  upsertChatkitSession,
  cancelChatkitSession,
  resumeChatkitSession,
  fetchChatkitSession,
  recordChatkitTranscript,
  listChatkitTranscripts,
} from './chatkit-session-service';
import { buildReadinessSummary } from './readiness';
import { getUrlSourceSettings, type UrlSourceSettings } from './system-config';
import {
  APPROVAL_ACTION_LABELS,
  createAgentActionApproval as supabaseCreateAgentActionApproval,
  insertAgentAction as supabaseInsertAgentAction,
  normalizeApprovalAction as externalNormalizeApprovalAction,
  reshapeApprovalRow as externalReshapeApprovalRow,
  type AgentActionStatus,
  type ApprovalAction,
  type ApprovalDecision,
  type ApprovalEvidence,
} from './approval-service';
import { createOpenAiDebugLogger } from './openai-debug';
import { getOpenAIClient } from '../../lib/openai/client';
import { runOpenAiFileSearch } from '../../lib/openai/file-search';
import { readOpenAiWorkloadEnv } from '../../lib/openai/workloads';
import {
  syncAgentToolsFromRegistry,
  isAgentPlatformEnabled,
  getOpenAiAgentId,
  createAgentThread,
  createAgentRun,
} from './openai-agent-service';
import { streamOpenAiResponse } from './openai-stream';
import {
  createConversationItems,
  deleteConversation,
  getConversation,
  listConversationItems,
  listConversations,
  type ConversationItemInput,
} from './openai-conversations';
import { AgentConversationRecorder } from './agent-conversation-recorder';
import { createRealtimeSession, getRealtimeTurnServers } from './openai-realtime';
import { generateSoraVideo } from './openai-media';
import { transcribeAudioBuffer, synthesizeSpeech } from './openai-audio';
import {
  createChatCompletion,
  deleteChatCompletion,
  listChatCompletionMessages,
  listChatCompletions,
  retrieveChatCompletion,
  streamChatCompletion,
  updateChatCompletion,
} from './openai-chat-completions';
import { directorAgent as legacyDirectorAgent } from '../agents/director';
import { DOMAIN_AGENT_LIST } from '../agents/domain-agents';
import type { OrchestratorContext } from '../agents/types';
import { AuditExecutionAgent } from '../agents/audit-execution';
import type { Database } from '../../supabase/src/integrations/supabase/types';
import type { OrchestrationTaskInput } from './mcp/types';
import { initialiseMcpInfrastructure } from './mcp/bootstrap';
import { createDirectorAgent as createMcpDirectorAgent } from './mcp/director';
import { createSafetyAgent as createMcpSafetyAgent } from './mcp/safety';
import { executeTaskWithExecutor } from './mcp/executors';
import {
  scheduleUrgentNotificationFanout,
  startNotificationFanoutWorker,
} from './notifications/fanout';

type AgentPersona = 'AUDIT' | 'FINANCE' | 'TAX';
type LearningMode = 'INITIAL' | 'CONTINUOUS';

type OrchestrationStatus = Database['public']['Enums']['agent_orchestration_status'];
type OrchestrationTaskStatus = Database['public']['Enums']['agent_task_status'];

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME ?? 'rag-service';
const OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
let telemetryInitialised = false;
const RUNTIME_ENVIRONMENT = process.env.ENVIRONMENT ?? process.env.NODE_ENV ?? 'development';
const SERVICE_VERSION = process.env.SERVICE_VERSION ?? process.env.SENTRY_RELEASE ?? 'dev';

function configureTelemetry(): void {
  if (telemetryInitialised) {
    return;
  }

  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
    'service.namespace': 'prisma-glow',
    'deployment.environment': RUNTIME_ENVIRONMENT,
    'service.version': SERVICE_VERSION,
  });

  const provider = new NodeTracerProvider({ resource });
  if (OTLP_ENDPOINT) {
    provider.addSpanProcessor(
      new BatchSpanProcessor(
        new OTLPTraceExporter({ url: OTLP_ENDPOINT }),
      ),
    );
  }
  provider.register();

  registerInstrumentations({
    instrumentations: [new HttpInstrumentation(), new ExpressInstrumentation()],
  });

  telemetryInitialised = true;
}

configureTelemetry();
const tracer = trace.getTracer(SERVICE_NAME);

const SENTRY_RELEASE = process.env.SENTRY_RELEASE;
const SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT ?? RUNTIME_ENVIRONMENT;
const SENTRY_DSN = process.env.SENTRY_DSN;
const SENTRY_ENABLED = Boolean(SENTRY_DSN);

if (SENTRY_ENABLED) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    release: SENTRY_RELEASE,
    tracesSampleRate: 1.0,
  });
}

type Primitive = string | number | boolean | null;

const WEB_DOMAIN_MAP: Record<string, { corpusDomain: string; agentKind: AgentPersona }> = {
  IFRS: { corpusDomain: 'IFRS', agentKind: 'FINANCE' },
  IAS: { corpusDomain: 'IAS', agentKind: 'FINANCE' },
  ISA: { corpusDomain: 'ISA', agentKind: 'AUDIT' },
  AUDIT: { corpusDomain: 'ISA', agentKind: 'AUDIT' },
  FINANCIAL_REPORTING: { corpusDomain: 'IFRS', agentKind: 'FINANCE' },
  COMPLIANCE: { corpusDomain: 'ISA', agentKind: 'AUDIT' },
  GOVERNANCE: { corpusDomain: 'ISA', agentKind: 'AUDIT' },
  LEGAL: { corpusDomain: 'ISA', agentKind: 'AUDIT' },
  TAX: { corpusDomain: 'TAX', agentKind: 'TAX' },
  ORG: { corpusDomain: 'ORG', agentKind: 'FINANCE' },
};

const WEB_HARVEST_INTERVAL_MS = Number(process.env.WEB_HARVEST_INTERVAL_MS ?? 60 * 60 * 1000);

function resolveHeartbeatInterval(defaultValue: number): number {
  const raw = process.env.CHAT_COMPLETIONS_STREAM_HEARTBEAT_INTERVAL_MS;
  if (raw === undefined || raw === null || raw === '') {
    return defaultValue;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return defaultValue;
  }
  return parsed;
}

const CHAT_COMPLETIONS_STREAM_HEARTBEAT_INTERVAL_MS = resolveHeartbeatInterval(15_000);
let webBootstrapRunning = false;

type RobotsRules = { allow: string[]; disallow: string[] };
const robotsCache = new Map<string, { rules: RobotsRules; fetchedAt: number }>();

const AUDIO_EXTENSION_MAP: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/flac': 'flac',
  'audio/mp4': 'mp4',
  'audio/m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/opus': 'opus',
};

function inferAudioFileName(mimeType?: string): string {
  const extension = mimeType ? AUDIO_EXTENSION_MAP[mimeType.toLowerCase()] : undefined;
  const suffix = extension ?? 'wav';
  return `audio-${Date.now()}.${suffix}`;
}

function decodeBase64Audio(value: string): Buffer {
  if (!value || typeof value !== 'string') {
    throw new Error('Audio payload is required.');
  }
  try {
    const buffer = Buffer.from(value, 'base64');
    if (buffer.length === 0) {
      throw new Error('Decoded audio buffer is empty.');
    }
    return buffer;
  } catch (error) {
    throw new Error('Invalid base64 audio payload.');
  }
}

type WebCacheRow = {
  id: string;
  url: string;
  content: string | null;
  fetched_at: string | null;
  last_used_at: string | null;
  status: string | null;
  metadata: Record<string, any> | null;
};

function normaliseDomain(value: string): string {
  return value.trim().toLowerCase();
}

function isDomainAllowed(hostname: string, allowedDomains: string[]): boolean {
  const host = normaliseDomain(hostname);
  for (const entry of allowedDomains) {
    const pattern = normaliseDomain(entry);
    if (!pattern) continue;
    if (pattern === '*') return true;
    if (pattern === host) return true;
    if (pattern.startsWith('*.') && host.endsWith(pattern.slice(1))) return true;
  }
  return false;
}

function pathMatchesRule(pathname: string, rule: string): boolean {
  const trimmed = rule.trim();
  if (!trimmed) return false;
  if (trimmed === '/') return true;
  if (trimmed.endsWith('$')) {
    const exact = trimmed.slice(0, -1);
    return pathname === exact;
  }
  if (trimmed.includes('*')) {
    const [prefix] = trimmed.split('*');
    return pathname.startsWith(prefix);
  }
  return pathname.startsWith(trimmed);
}

function isPathAllowedByRobots(pathname: string, rules: RobotsRules): boolean {
  let longestAllow = '';
  for (const allow of rules.allow) {
    if (pathMatchesRule(pathname, allow) && allow.length > longestAllow.length) {
      longestAllow = allow;
    }
  }
  let longestDisallow = '';
  for (const disallow of rules.disallow) {
    if (pathMatchesRule(pathname, disallow) && disallow.length > longestDisallow.length) {
      longestDisallow = disallow;
    }
  }
  if (!longestDisallow) return true;
  if (!longestAllow) return false;
  return longestAllow.length >= longestDisallow.length;
}

function parseRobots(content: string): RobotsRules {
  const lines = content.split(/\r?\n/);
  const allow: string[] = [];
  const disallow: string[] = [];
  let applies = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [directive, value = ''] = line.split(/:/, 2).map((part) => part.trim());
    if (!directive) continue;
    const lower = directive.toLowerCase();
    if (lower === 'user-agent') {
      applies = value === '*' || value.toLowerCase() === 'prismaglow-ai-agent';
    } else if (applies && lower === 'allow') {
      allow.push(value);
    } else if (applies && lower === 'disallow') {
      disallow.push(value);
    }
  }
  return { allow, disallow };
}

async function fetchRobotsForOrigin(origin: string, cacheTtlMs: number): Promise<RobotsRules | null> {
  const cached = robotsCache.get(origin);
  if (cached && Date.now() - cached.fetchedAt <= cacheTtlMs) {
    return cached.rules;
  }
  try {
    const response = await fetch(`${origin}/robots.txt`, {
      headers: { 'User-Agent': 'PrismaGlow-AI-Agent/1.0 (+https://example.com)' },
    });
    if (!response.ok) {
      robotsCache.set(origin, { rules: { allow: [], disallow: [] }, fetchedAt: Date.now() });
      return null;
    }
    const body = await response.text();
    const rules = parseRobots(body);
    robotsCache.set(origin, { rules, fetchedAt: Date.now() });
    return rules;
  } catch (error) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        msg: 'web.robots_fetch_failed',
        origin,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    robotsCache.set(origin, { rules: { allow: [], disallow: [] }, fetchedAt: Date.now() });
    return null;
  }
}

async function ensureUrlAllowed(rawUrl: string, settings: UrlSourceSettings): Promise<void> {
  const parsed = new URL(rawUrl);
  if (!isDomainAllowed(parsed.hostname, settings.allowedDomains)) {
    throw new Error('domain_not_allowlisted');
  }
  if (settings.fetchPolicy.obeyRobots) {
    const ttlMs = Math.max(0, settings.fetchPolicy.cacheTtlMinutes) * 60_000;
    const rules = await fetchRobotsForOrigin(parsed.origin, ttlMs);
    if (rules && rules.disallow.length && !isPathAllowedByRobots(parsed.pathname, rules)) {
      throw new Error('robots_disallow');
    }
  }
}

async function getCachedWebContent(url: string): Promise<WebCacheRow | null> {
  const { data, error, status } = await supabaseService
    .from('web_fetch_cache')
    .select('id, url, content, fetched_at, last_used_at, status, metadata')
    .eq('url', url)
    .maybeSingle();
  if (error && status !== 406) {
    throw error;
  }
  return (data as WebCacheRow | null) ?? null;
}

async function upsertWebCache(url: string, content: string, metadata: Record<string, any>, status = 'fetched') {
  const nowIso = new Date().toISOString();
  const payload = {
    url,
    content,
    content_hash: createHash('sha256').update(content).digest('hex'),
    status,
    fetched_at: nowIso,
    last_used_at: nowIso,
    metadata,
  };
  const { error } = await supabaseService.from('web_fetch_cache').upsert(payload, { onConflict: 'url' });
  if (error) {
    throw error;
  }
}

async function touchWebCache(cache: WebCacheRow, metadataUpdates: Record<string, any> = {}) {
  const updates: Record<string, any> = {
    last_used_at: new Date().toISOString(),
  };
  if (metadataUpdates && Object.keys(metadataUpdates).length > 0) {
    updates.metadata = { ...(cache.metadata ?? {}), ...metadataUpdates };
  }
  const { error } = await supabaseService
    .from('web_fetch_cache')
    .update(updates)
    .eq('id', cache.id);
  if (error) {
    console.warn(JSON.stringify({ level: 'warn', msg: 'web.cache_touch_failed', url: cache.url, error: error.message }));
  }
}

async function pruneStaleWebCache(): Promise<void> {
  if (WEB_FETCH_CACHE_RETENTION_MS <= 0) {
    return;
  }
  const now = Date.now();
  if (now - lastWebCachePruneAt < WEB_FETCH_CACHE_PRUNE_INTERVAL_MS) {
    return;
  }
  lastWebCachePruneAt = now;
  const cutoff = new Date(now - WEB_FETCH_CACHE_RETENTION_MS).toISOString();
  const { error, count } = await supabaseService
    .from('web_fetch_cache')
    .delete({ count: 'exact' })
    .lt('fetched_at', cutoff);
  if (error) {
    logError('web.cache_prune_failed', error, { cutoff });
    return;
  }
  if (typeof count === 'number' && count > 0) {
    logInfo('web.cache_pruned', { cutoff, deleted: count });
  }
}

async function fetchWebDocument(url: string, settings: UrlSourceSettings): Promise<string> {
  await ensureUrlAllowed(url, settings);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'PrismaGlow-AI-Agent/1.0 (+https://example.com)',
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch URL (status ${response.status})`);
  }
  return response.text();
}

function resolveWebDomainMetadata(domain: string | null | undefined) {
  const key = domain ? domain.toUpperCase() : 'ORG';
  return WEB_DOMAIN_MAP[key] ?? { corpusDomain: 'ORG', agentKind: 'FINANCE' as AgentPersona };
}

async function ensureCorpusForDomain(orgId: string, domain: string) {
  const upcasedDomain = domain.toUpperCase();

  const { data: existing, error: existingError } = await supabaseService
    .from('knowledge_corpora')
    .select('id, org_id, domain')
    .eq('org_id', orgId)
    .eq('domain', upcasedDomain)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }
  if (existing) {
    return existing;
  }

  const name = `${upcasedDomain} Global`;
  const defaultJurisdiction = ['MT'];

  const { data: inserted, error: insertError } = await supabaseService
    .from('knowledge_corpora')
    .insert({
      org_id: orgId,
      name,
      domain: upcasedDomain,
      jurisdiction: defaultJurisdiction,
      retention: 'Auto-generated corpus for web knowledge ingestion',
      is_default: true,
    })
    .select('id, org_id, domain')
    .single();

  if (insertError) {
    throw insertError;
  }

  return inserted;
}

async function ensureKnowledgeSourceLink(corpusId: string, webSourceId: string) {
  const { data: existing, error: existingError } = await supabaseService
    .from('knowledge_sources')
    .select('id, corpus_id, provider, source_uri, last_sync_at, state')
    .eq('corpus_id', corpusId)
    .eq('provider', 'web_catalog')
    .eq('source_uri', webSourceId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }
  if (existing) {
    return existing;
  }

  const { data: inserted, error: insertError } = await supabaseService
    .from('knowledge_sources')
    .insert({
      corpus_id: corpusId,
      provider: 'web_catalog',
      source_uri: webSourceId,
      state: { autoLinked: true },
    })
    .select('id, corpus_id, provider, source_uri, last_sync_at, state')
    .single();

  if (insertError) {
    throw insertError;
  }

  return inserted;
}

type CorpusRow = {
  id: string;
  org_id: string;
  domain: string;
};

type KnowledgeSourceRow = {
  id: string;
  corpus_id: string;
  provider: string;
  source_uri: string | null;
  last_sync_at: string | null;
  state: Record<string, any> | null;
};

async function ensureWebSourceSyncForOrg(options: {
  orgId: string;
  webSource: WebSourceRow;
  corpusCache?: Map<string, CorpusRow>;
  initiatedBy?: string;
  force?: boolean;
}) {
  const { orgId, webSource, corpusCache, initiatedBy, force } = options;

  const { corpusDomain, agentKind } = resolveWebDomainMetadata(webSource.domain);

  let corpus: CorpusRow;
  if (corpusCache?.has(corpusDomain)) {
    corpus = corpusCache.get(corpusDomain)!;
  } else {
    corpus = (await ensureCorpusForDomain(orgId, corpusDomain)) as CorpusRow;
    if (corpusCache) {
      corpusCache.set(corpusDomain, corpus);
    }
  }

  const knowledgeSource = (await ensureKnowledgeSourceLink(
    corpus.id,
    webSource.id,
  )) as KnowledgeSourceRow;

  const state = (knowledgeSource.state ?? {}) as Record<string, any>;

  if (state?.lastRunStatus === 'pending') {
    return null;
  }

  if (!force) {
    const lastSyncTime = knowledgeSource.last_sync_at
      ? new Date(knowledgeSource.last_sync_at).getTime()
      : undefined;
    const now = Date.now();

    const due =
      !lastSyncTime ||
      now - lastSyncTime >= WEB_HARVEST_INTERVAL_MS ||
      state?.lastRunStatus === 'failed';

    if (!due) {
      return null;
    }
  }

  return queueWebHarvestJob({
    knowledgeSourceId: knowledgeSource.id,
    webSourceId: webSource.id,
    orgId,
    agentKind,
    initiatedBy: initiatedBy ?? 'system',
    mode: knowledgeSource.last_sync_at ? 'CONTINUOUS' : 'INITIAL',
  });
}

// Basic RAG service implementing ingest, search and reembed endpoints.
// Documents are stored in PostgreSQL with pgvector embeddings.

const app = express();

if (SENTRY_ENABLED) {
  app.use(Sentry.Handlers.requestHandler());
}

app.use((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const span = tracer.startSpan(`${req.method} ${req.path}`, {
    attributes: {
      'http.method': req.method,
      'http.target': req.originalUrl ?? req.url ?? req.path,
      'http.scheme': req.protocol,
    },
  });

  const spanContext = trace.setSpan(context.active(), span);
  context.with(spanContext, () => {
    let spanEnded = false;
    const endSpan = () => {
      if (spanEnded) {
        return;
      }
      spanEnded = true;

      if (span.isRecording()) {
        span.setAttribute('http.status_code', res.statusCode);
        const routePath = req.route?.path ?? req.path;
        if (routePath) {
          span.setAttribute('http.route', routePath);
        }
        if (req.requestId) {
          span.setAttribute('prismaglow.request_id', req.requestId);
        }
        if (res.statusCode >= 500) {
          span.setStatus({ code: SpanStatusCode.ERROR });
        }
      }

      span.end();
    };

    res.on('finish', endSpan);
    res.on('close', endSpan);
    res.on('error', (err) => {
      if (span.isRecording()) {
        span.recordException(err);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: err instanceof Error ? err.message : String(err),
        });
      }
      endSpan();
    });

    next();
  });
});

app.use(express.json({ limit: '10mb' }));

const HEADER_REQUEST_ID = 'x-request-id';
const requestContext = new AsyncLocalStorage<{ requestId: string }>();

app.use((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const existing = req.header(HEADER_REQUEST_ID);
  const requestId = existing && existing.trim().length > 0 ? existing : randomUUID();
  req.requestId = requestId;
  res.set(HEADER_REQUEST_ID, requestId);
  if (SENTRY_ENABLED) {
    Sentry.configureScope((scope) => {
      scope.setTag('request_id', requestId);
    });
  }
  requestContext.run({ requestId }, () => next());
});

const JWT_SECRET = await getSupabaseJwtSecret();
const JWT_AUDIENCE = process.env.SUPABASE_JWT_AUDIENCE ?? 'authenticated';
const RATE_LIMIT_ALERT_WEBHOOK = process.env.RATE_LIMIT_ALERT_WEBHOOK ?? process.env.ERROR_NOTIFY_WEBHOOK ?? '';
const TELEMETRY_ALERT_WEBHOOK =
  env.TELEMETRY_ALERT_WEBHOOK ?? process.env.TELEMETRY_ALERT_WEBHOOK ?? process.env.ERROR_NOTIFY_WEBHOOK ?? '';
const EMBEDDING_ALERT_WEBHOOK =
  env.EMBEDDING_ALERT_WEBHOOK ?? process.env.EMBEDDING_ALERT_WEBHOOK ?? TELEMETRY_ALERT_WEBHOOK;

if (!JWT_SECRET) {
  throw new Error('SUPABASE_JWT_SECRET must be set to secure the RAG service.');
}

const upload = multer();
const cache = new NodeCache({ stdTTL: 60 });
const idempotencyCache = new NodeCache();

type IdempotencyCacheEntry = {
  status: number;
  body: unknown;
};

function applyExpressIdempotency(options: {
  keyBuilder: (req: AuthenticatedRequest) => string | null | undefined;
  ttlSeconds?: number;
}) {
  const ttl = options.ttlSeconds ?? 300;

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    let key: string | null | undefined;
    try {
      key = options.keyBuilder(req);
    } catch (error) {
      logError('idempotency.key_builder_failed', error, { path: req.path });
      return next();
    }

    if (!key || key.length === 0) {
      return next();
    }

    const cached = idempotencyCache.get<IdempotencyCacheEntry>(key);
    if (cached) {
      res.setHeader('X-Idempotency-Key', key);
      res.setHeader('X-Idempotency-Cache', 'HIT');
      return res.status(cached.status).json(cached.body);
    }

    res.setHeader('X-Idempotency-Key', key);
    res.setHeader('X-Idempotency-Cache', 'MISS');

    let responseBody: unknown | undefined;
    const originalJson = res.json.bind(res);

    res.json = (body: unknown) => {
      responseBody = body;
      return originalJson(body);
    };

    res.on('finish', () => {
      if (!responseBody) return;
      if (res.statusCode >= 200 && res.statusCode < 300) {
        idempotencyCache.set(key as string, { status: res.statusCode, body: responseBody }, ttl);
      }
    });

    return next();
  };
}

const RATE_LIMIT = Number(process.env.API_RATE_LIMIT ?? '60');
const RATE_WINDOW_MS = Number(process.env.API_RATE_WINDOW_SECONDS ?? '60') * 1000;
const requestBuckets = new Map<string, number[]>();

const GDRIVE_QUEUE_PROCESS_LIMIT = Number(process.env.GDRIVE_PROCESS_BATCH_LIMIT ?? '10');
const driveUploaderCache = new Map<string, string>();
type DriveFileMetadata = { metadata: Record<string, unknown>; allowlisted_domain: boolean };

type AgentTypeKey = 'CLOSE' | 'TAX' | 'AUDIT' | 'ADVISORY' | 'CLIENT';

const ENFORCE_CITATIONS = getFeatureFlag('FEATURE_ENFORCE_CITATIONS', true);
const SUPPORTED_AGENT_TYPES = new Set<AgentTypeKey>(['CLOSE', 'TAX', 'AUDIT', 'ADVISORY', 'CLIENT']);
const DAY_MS = 24 * 60 * 60 * 1000;

const EMBEDDING_CRON_SECRET = env.EMBEDDING_CRON_SECRET ?? '';
const EMBEDDING_DELTA_LOOKBACK_HOURS = env.EMBEDDING_DELTA_LOOKBACK_HOURS;
const EMBEDDING_DELTA_DOCUMENT_LIMIT = env.EMBEDDING_DELTA_DOCUMENT_LIMIT;
const EMBEDDING_DELTA_POLICY_LIMIT = env.EMBEDDING_DELTA_POLICY_LIMIT;

function formatDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildLastNDaysKeys(days: number, end: Date): string[] {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const bucket = new Date(end.getTime() - i * DAY_MS);
    keys.push(formatDateKey(bucket));
  }
  return keys;
}

type LearningJob = {
  id: string;
  org_id: string;
  kind: string;
  status: string;
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  policy_version_id: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
};

type ToolExecutionContext = {
  orgId: string;
  engagementId?: string | null;
  userId: string;
  sessionId: string;
  runId: string;
};

type ToolHandler = (input: unknown, context: ToolExecutionContext) => Promise<unknown>;

type ToolDefinition = {
  label?: string;
  minRole: AgentRole;
  sensitive?: boolean;
  standards_refs?: string[];
  enabled?: boolean;
};

type AgentToolExecutionResult = {
  toolKey: string;
  status: 'SUCCESS' | 'ERROR' | 'BLOCKED' | 'PENDING';
  output?: unknown;
  error?: string;
  approvalId?: string;
};

const REQUIRE_MANAGER_APPROVAL = getFeatureFlag('FEATURE_REQUIRE_MANAGER_APPROVAL', true);
const BLOCK_EXTERNAL_FILING = getFeatureFlag('FEATURE_BLOCK_EXTERNAL_FILING', true);
const QMS_MONITORING_ENABLED = getFeatureFlag('FEATURE_QMS_MONITORING_ENABLED', true);


const ROLE_HIERARCHY: Record<AgentRole, number> = {
  EMPLOYEE: ROLE_PRIORITY.EMPLOYEE,
  MANAGER: ROLE_PRIORITY.MANAGER,
  SYSTEM_ADMIN: ROLE_PRIORITY.SYSTEM_ADMIN,
};

const LOCAL_TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  'rag.search': {
    label: 'Knowledge base search',
    minRole: 'EMPLOYEE',
  },
  'trial_balance.get': {
    label: 'Trial balance snapshot',
    minRole: 'EMPLOYEE',
  },
  'docs.sign_url': {
    label: 'Generate document signing URL',
    minRole: 'MANAGER',
    sensitive: true,
  },
  'notify.user': {
    label: 'Notify user',
    minRole: 'EMPLOYEE',
  },
};

const toolHandlers: Record<string, ToolHandler> = {
  'rag.search': async (input, context) => {
    const payload = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const query = typeof payload.query === 'string' && payload.query.trim().length > 0
      ? payload.query.trim()
      : typeof payload.prompt === 'string' && payload.prompt.trim().length > 0
      ? payload.prompt.trim()
      : null;
    const rawTopK = payload.topK ?? payload.top_k ?? payload.limit;
    const topK = Number.isFinite(rawTopK as number) ? Number(rawTopK) : 6;

    if (!query) {
      return { output: 'rag.search requires a query input.' };
    }

    const result = await performRagSearch(context.orgId, query, Math.max(1, Math.min(12, topK)));
    try {
      return {
        output: result.output,
        citations: result.citations,
      };
    } catch {
      return { output: result.output };
    }
  },
  'trial_balance.get': async () => {
    return {
      balances: [],
      generatedAt: new Date().toISOString(),
    };
  },
  'docs.sign_url': async (input) => {
    const payload = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const documentId = typeof payload.documentId === 'string' ? payload.documentId : null;
    return {
      documentId,
      signedUrl: 'https://example.com/sign-url-placeholder',
      expiresInSeconds: Number(process.env.DOCUMENT_SIGN_TTL ?? '120'),
    };
  },
  'notify.user': async (input, context) => {
    const payload = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const rawMessage = typeof payload.message === 'string' ? payload.message.trim() : '';
    if (!rawMessage) {
      throw new Error('notify.user requires a non-empty message.');
    }

    const addRecipient = (value: unknown, recipients: Set<string>) => {
      if (typeof value === 'string' && value.trim().length > 0) {
        recipients.add(value.trim());
        return;
      }
      if (value && typeof value === 'object' && 'id' in value) {
        const candidate = (value as { id?: unknown }).id;
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
          recipients.add(candidate.trim());
        }
      }
    };

    const recipientSet = new Set<string>();
    addRecipient(payload.userId, recipientSet);
    if (Array.isArray(payload.recipients)) {
      for (const entry of payload.recipients) {
        addRecipient(entry, recipientSet);
      }
    } else if (typeof payload.recipient === 'string') {
      addRecipient(payload.recipient, recipientSet);
    }

    if (recipientSet.size === 0) {
      throw new Error('notify.user requires at least one recipient userId.');
    }

    const MAX_RECIPIENTS = 20;
    const recipients = Array.from(recipientSet).slice(0, MAX_RECIPIENTS);
    const title =
      typeof payload.title === 'string' && payload.title.trim().length > 0
        ? payload.title.trim()
        : 'Agent notification';
    const link = typeof payload.link === 'string' && payload.link.trim().length > 0 ? payload.link.trim() : null;
    const rawKind = typeof payload.kind === 'string' ? payload.kind.toUpperCase() : 'SYSTEM';
    const allowedKinds = new Set(['TASK', 'DOC', 'APPROVAL', 'SYSTEM']);
    const kind = allowedKinds.has(rawKind) ? rawKind : 'SYSTEM';
    const urgency = typeof payload.urgency === 'string' ? payload.urgency.toLowerCase() : 'info';
    const urgent = urgency === 'critical' || urgency === 'high';

    const insertRows = recipients.map((userId) => ({
      org_id: context.orgId,
      user_id: userId,
      title,
      body: rawMessage,
      link,
      urgent,
      kind,
    }));

    const { data, error } = await supabaseService
      .from('notifications')
      .insert(insertRows)
      .select('id, org_id, user_id, created_at, urgent');

    if (error) {
      throw error;
    }

    const inserted = (data ?? []).map((row) => ({
      ...row,
      org_id: row.org_id ?? context.orgId,
    }));
    logInfo('agent.notify_user_enqueued', {
      sessionId: context.sessionId,
      runId: context.runId,
      orgId: context.orgId,
      recipientCount: recipients.length,
      urgent,
    });

    if (urgent && inserted.length > 0) {
      await scheduleUrgentNotificationFanout({
        supabase: supabaseService,
        orgId: context.orgId,
        notifications: inserted.map((row) => ({
          id: row.id,
          user_id: row.user_id,
          org_id: row.org_id,
        })),
        title,
        message: rawMessage,
        link,
        kind,
        urgent,
        logInfo,
        logError,
      });
    }

    return {
      notified: true,
      message: rawMessage,
      title,
      kind,
      urgent,
      recipients: inserted.length ? inserted.map((row) => row.user_id) : recipients,
      notificationIds: inserted.map((row) => row.id),
      createdAt: inserted.length ? inserted[0].created_at : new Date().toISOString(),
      link,
    };
  },
};

let toolRegistryAvailabilityChecked = false;
let toolRegistryAvailable = true;

async function resolveToolDefinition(toolKey: string): Promise<ToolDefinition | null> {
  if (!toolRegistryAvailable && toolRegistryAvailabilityChecked) {
    return LOCAL_TOOL_DEFINITIONS[toolKey] ?? null;
  }

  try {
    const { data, error } = await supabaseService
      .from('tool_registry')
      .select('key, label, min_role, sensitive, standards_refs, enabled')
      .eq('key', toolKey)
      .maybeSingle();

    toolRegistryAvailabilityChecked = true;

    if (error) {
      if (error.code === '42P01') {
        toolRegistryAvailable = false;
        logInfo('tool_registry.unavailable', { toolKey });
      } else {
        logError('tool_registry.fetch_failed', error, { toolKey });
      }
      return LOCAL_TOOL_DEFINITIONS[toolKey] ?? null;
    }

    if (!data) {
      return LOCAL_TOOL_DEFINITIONS[toolKey] ?? null;
    }

    return {
      label: typeof data.label === 'string' ? data.label : undefined,
      minRole: roleFromString(data.min_role) ?? 'EMPLOYEE',
      sensitive: Boolean(data.sensitive),
      standards_refs: Array.isArray(data.standards_refs) ? data.standards_refs : undefined,
      enabled: data.enabled ?? true,
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    toolRegistryAvailabilityChecked = true;
    toolRegistryAvailable = false;
    logError('tool_registry.unexpected_error', error, { toolKey });
    return LOCAL_TOOL_DEFINITIONS[toolKey] ?? null;
  }
}

const hashPayload = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value ?? null)).digest('hex');

function parsePlanSummary(summary: unknown): any {
  if (!summary) return { steps: [] };
  if (typeof summary === 'string') {
    try {
      return JSON.parse(summary);
    } catch {
      return { steps: [] };
    }
  }
  if (typeof summary === 'object') {
    return summary;
  }
  return { steps: [] };
}

function ensurePlanSteps(planDocument: any): any[] {
  if (!Array.isArray(planDocument.steps)) {
    planDocument.steps = [];
  }
  return planDocument.steps;
}

function updatePlanStepResults(planDocument: any, stepIndex: number, results: AgentToolExecutionResult[]) {
  const steps = ensurePlanSteps(planDocument);
  const existingIndex = steps.findIndex((step: any) => step?.stepIndex === stepIndex);
  if (existingIndex >= 0) {
    const current = steps[existingIndex] ?? {};
    steps[existingIndex] = { ...current, stepIndex, results };
  } else {
    steps.push({ stepIndex, results });
  }
}

function deriveRunState(results: AgentToolExecutionResult[]): 'DONE' | 'EXECUTING' | 'ERROR' {
  if (results.some((result) => result.status === 'ERROR')) {
    return 'ERROR';
  }
  if (results.some((result) => result.status === 'BLOCKED' || result.status === 'PENDING')) {
    return 'EXECUTING';
  }
  return 'DONE';
}

function normaliseOrchestrationTaskInput(raw: unknown): OrchestrationTaskInput | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const title = (raw as Record<string, unknown>).title;
  if (typeof title !== 'string' || title.trim().length === 0) {
    return null;
  }

  const task: OrchestrationTaskInput = {
    title: title.trim(),
  };

  const agentKey = (raw as Record<string, unknown>).agentKey;
  if (typeof agentKey === 'string' && agentKey.trim().length > 0) {
    task.agentKey = agentKey.trim();
  }

  const input = (raw as Record<string, unknown>).input;
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    task.input = input as Record<string, unknown>;
  }

  const dependsOn = (raw as Record<string, unknown>).dependsOn;
  if (Array.isArray(dependsOn)) {
    const deps = dependsOn
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((value) => value.trim());
    if (deps.length) {
      task.dependsOn = deps;
    }
  }

  const metadata = (raw as Record<string, unknown>).metadata;
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    task.metadata = metadata as Record<string, unknown>;
  }

  const executor = (raw as Record<string, unknown>).executor;
  if (typeof executor === 'string' && executor.trim().length > 0) {
    task.metadata = {
      ...(task.metadata ?? {}),
      executor: executor.trim(),
    };
  }

  if (!task.metadata?.executor && task.agentKey === 'audit.execution') {
    task.metadata = {
      ...(task.metadata ?? {}),
      executor: 'audit-risk-summary',
    };
  }

  return task;
}

function buildDefaultTasksForObjective(params: {
  orgId: string;
  objective?: string;
  engagementId: string | null;
}): OrchestrationTaskInput[] {
  const lowerObjective = (params.objective ?? '').toLowerCase();
  const tasks: OrchestrationTaskInput[] = [];

  if (params.engagementId && lowerObjective.includes('audit')) {
    const baseInput = { orgId: params.orgId, engagementId: params.engagementId };
    tasks.push({
      agentKey: 'audit.execution',
      title: 'Summarise audit risk register',
      input: baseInput,
      metadata: { executor: 'audit-risk-summary' },
    });
    tasks.push({
      agentKey: 'audit.execution',
      title: 'Summarise audit evidence status',
      input: baseInput,
      metadata: { executor: 'audit-evidence-summary' },
    });
  }

  if (params.engagementId && (lowerObjective.includes('close') || lowerObjective.includes('finance'))) {
    const baseInput = { orgId: params.orgId, engagementId: params.engagementId };
    tasks.push({
      agentKey: 'accounting.close',
      title: 'Summarise accounting reconciliations',
      input: baseInput,
      metadata: { executor: 'accounting-reconciliation-summary' },
    });
    tasks.push({
      agentKey: 'accounting.close',
      title: 'Summarise journal entries queue',
      input: baseInput,
      metadata: { executor: 'accounting-journal-summary' },
    });
    tasks.push({
      agentKey: 'accounting.close',
      title: 'Report period close status',
      input: baseInput,
      metadata: { executor: 'accounting-close-summary' },
    });
  }

  return tasks;
}

async function recomputeOrchestrationSessionStatus(sessionId: string): Promise<OrchestrationStatus | null> {
  try {
    const [{ data: sessionRow, error: sessionError }, { data: tasks, error: tasksError }] = await Promise.all([
      supabaseService
        .from('agent_orchestration_sessions')
        .select('id, status')
        .eq('id', sessionId)
        .maybeSingle(),
      supabaseService
        .from('agent_orchestration_tasks')
        .select('status')
        .eq('session_id', sessionId),
    ]);

    if (sessionError) throw sessionError;
    if (!sessionRow) return null;
    if (tasksError) throw tasksError;

    const statuses = (tasks ?? []).map((row) => row.status as OrchestrationTaskStatus);

    let nextStatus: OrchestrationStatus = sessionRow.status;

    if (statuses.some((status) => status === 'FAILED')) {
      nextStatus = 'FAILED';
    } else if (statuses.some((status) => status === 'AWAITING_APPROVAL')) {
      nextStatus = 'WAITING_APPROVAL';
    } else if (statuses.length > 0 && statuses.every((status) => status === 'COMPLETED')) {
      nextStatus = 'COMPLETED';
    } else if (statuses.some((status) => status === 'ASSIGNED' || status === 'IN_PROGRESS')) {
      nextStatus = 'RUNNING';
    } else if (statuses.length === 0) {
      nextStatus = 'PENDING';
    } else {
      nextStatus = 'PENDING';
    }

    if (nextStatus !== sessionRow.status) {
      await supabaseService
        .from('agent_orchestration_sessions')
        .update({ status: nextStatus })
        .eq('id', sessionId);
    }

    return nextStatus;
  } catch (error) {
    logError('mcp.session_status_update_failed', error, { sessionId });
    return null;
  }
}

async function evaluateTaskSafety(params: {
  task: { id: string; session_id: string; metadata: Record<string, unknown> | undefined };
  result: TaskExecutorResult;
}): Promise<{
  status: OrchestrationTaskStatus;
  metadata: Record<string, unknown>;
  safetyEvent?: {
    severity: 'INFO' | 'WARN' | 'BLOCKED';
    ruleCode: string;
    details?: Record<string, unknown>;
  };
}> {
  const executor = params.result.metadata?.executor;
  const baseMetadata: Record<string, unknown> = {
    ...(params.task.metadata ?? {}),
    ...(params.result.metadata ?? {}),
  };

  if (!executor) {
    return { status: 'COMPLETED', metadata: baseMetadata };
  }

  const safetyEvent = (severity: 'INFO' | 'WARN' | 'BLOCKED', ruleCode: string, details?: Record<string, unknown>) => ({
    severity,
    ruleCode,
    details,
  });

  switch (executor) {
    case 'audit-risk-summary': {
      const highResidual = Number(params.result.metadata?.highResidualCount ?? 0);
      const unresolved = Number(params.result.metadata?.unresolvedResponseCount ?? 0);
      if (highResidual > 0 || unresolved > 0) {
        return {
          status: 'AWAITING_APPROVAL',
          metadata: { ...baseMetadata, autonomyFlag: 'audit-risk' },
          safetyEvent: safetyEvent('WARN', 'AUDIT:RISK_OPEN', {
            highResidual,
            unresolved,
          }),
        };
      }
      break;
    }
    case 'audit-evidence-summary': {
      const missing = Number(params.result.metadata?.evidenceMissingDocuments ?? 0);
      if (missing > 0) {
        return {
          status: 'AWAITING_APPROVAL',
          metadata: { ...baseMetadata, autonomyFlag: 'audit-evidence' },
          safetyEvent: safetyEvent('WARN', 'AUDIT:EVIDENCE_MISSING', {
            missingDocuments: missing,
          }),
        };
      }
      break;
    }
    case 'accounting-reconciliation-summary': {
      const open = Number(params.result.metadata?.openReconciliations ?? 0);
      const totalDifference = Number(params.result.metadata?.totalDifference ?? 0);
      if (open > 0 || Math.abs(totalDifference) > 0.01) {
        return {
          status: 'AWAITING_APPROVAL',
          metadata: { ...baseMetadata, autonomyFlag: 'accounting-reconciliation' },
          safetyEvent: safetyEvent('WARN', 'ACCOUNTING:RECONCILIATION_OPEN', {
            open,
            totalDifference,
          }),
        };
      }
      break;
    }
    case 'accounting-journal-summary': {
      const pending = Number(params.result.metadata?.pendingJournals ?? 0);
      if (pending > 0) {
        return {
          status: 'AWAITING_APPROVAL',
          metadata: { ...baseMetadata, autonomyFlag: 'accounting-journal' },
          safetyEvent: safetyEvent('WARN', 'ACCOUNTING:JOURNAL_PENDING', {
            pending,
          }),
        };
      }
      break;
    }
    case 'accounting-close-summary': {
      const currentStatus = String(params.result.metadata?.currentStatus ?? 'OPEN');
      if (currentStatus !== 'LOCKED') {
        return {
          status: 'AWAITING_APPROVAL',
          metadata: { ...baseMetadata, autonomyFlag: 'accounting-close' },
          safetyEvent: safetyEvent('INFO', 'ACCOUNTING:CLOSE_STATUS', {
            currentStatus,
          }),
        };
      }
      break;
    }
    default:
      break;
  }

  if (params.result.status === 'error') {
    return {
      status: 'FAILED',
      metadata: { ...baseMetadata, autonomyFlag: 'executor-error' },
      safetyEvent: safetyEvent('WARN', 'TASK:EXECUTOR_ERROR', {
        executor,
      }),
    };
  }

  return { status: 'COMPLETED', metadata: baseMetadata };
}

async function areDependenciesCompleted(dependencyIds: string[]): Promise<boolean> {
  if (!dependencyIds || dependencyIds.length === 0) return true;

  const { data, error } = await supabaseService
    .from('agent_orchestration_tasks')
    .select('id, status')
    .in('id', dependencyIds)
    .eq('status', 'COMPLETED');

  if (error) {
    logError('mcp.dependencies_lookup_failed', error, { dependencyIds });
    return false;
  }

  return (data ?? []).length === dependencyIds.length;
}

async function processPendingOrchestrationTasks() {
  if (!OPENAI_ORCHESTRATOR_ENABLED) return;
  try {
    const { data: pendingTasks, error } = await supabaseService
      .from('agent_orchestration_tasks')
      .select('id, session_id, depends_on')
      .eq('status', 'PENDING')
      .limit(10);

    if (error) throw error;
    if (!pendingTasks || pendingTasks.length === 0) return;

    const assignable: string[] = [];
    for (const task of pendingTasks) {
      const dependencies = Array.isArray(task.depends_on) ? task.depends_on : [];
      const ready = await areDependenciesCompleted(dependencies);
      if (ready) {
        assignable.push(task.id);
      }
    }

    if (assignable.length === 0) return;

    const { data: updatedTasks, error: updateError } = await supabaseService
      .from('agent_orchestration_tasks')
      .update({ status: 'ASSIGNED' })
      .in('id', assignable)
      .eq('status', 'PENDING')
      .select('id, session_id');

    if (updateError) throw updateError;

    for (const task of updatedTasks ?? []) {
      logInfo('mcp.scheduler_assigned', { taskId: task.id, sessionId: task.session_id });
      await recomputeOrchestrationSessionStatus(task.session_id);
    }
  } catch (error) {
    logError('mcp.scheduler_failed', error, {});
  }
}

async function executeAssignedOrchestrationTasks() {
  if (!OPENAI_ORCHESTRATOR_ENABLED) return;
  try {
    const { data: assignedTasks, error } = await supabaseService
      .from('agent_orchestration_tasks')
      .select('id, session_id, metadata, input')
      .eq('status', 'ASSIGNED')
      .limit(5);

    if (error) throw error;
    if (!assignedTasks || assignedTasks.length === 0) return;

    for (const task of assignedTasks) {
      try {
        const existingMetadata =
          (task.metadata && typeof task.metadata === 'object' && !Array.isArray(task.metadata)
            ? (task.metadata as Record<string, unknown>)
            : {}) ?? {};
        const executorKey =
          typeof existingMetadata.executor === 'string' && existingMetadata.executor.trim().length > 0
            ? existingMetadata.executor
            : undefined;
        const taskInput =
          task.input && typeof task.input === 'object' && !Array.isArray(task.input)
            ? (task.input as Record<string, unknown>)
            : undefined;

        const progressMetadata: Record<string, unknown> = {
          ...existingMetadata,
          startedAt: new Date().toISOString(),
          lastExecutor: executorKey ?? existingMetadata.lastExecutor,
        };

        await mcpDirector.updateTaskStatus({
          taskId: task.id,
          status: 'IN_PROGRESS',
          metadata: progressMetadata,
        });

        const result = await executeTaskWithExecutor({
          executorKey,
          input: taskInput,
          sessionId: task.session_id,
          taskId: task.id,
          context: {
            supabase: supabaseService,
            logInfo,
            logError,
          },
        });

        const safetyDecision = await evaluateTaskSafety({
          task: {
            id: task.id,
            session_id: task.session_id,
            metadata: progressMetadata,
          },
          result,
        });

        if (safetyDecision.safetyEvent) {
          await mcpSafety.recordEvent({
            sessionId: task.session_id,
            taskId: task.id,
            severity: safetyDecision.safetyEvent.severity,
            ruleCode: safetyDecision.safetyEvent.ruleCode,
            details: safetyDecision.safetyEvent.details,
          });
        }

        await mcpDirector.updateTaskStatus({
          taskId: task.id,
          status: safetyDecision.status,
          output: result.output ?? {
            note: 'Executor completed without output payload.',
          },
          metadata: {
            ...safetyDecision.metadata,
            completedAt: new Date().toISOString(),
            executorStatus: result.status,
          },
        });

        await recomputeOrchestrationSessionStatus(task.session_id);
        logInfo('mcp.task_executor_completed', {
          taskId: task.id,
          sessionId: task.session_id,
          executorKey: executorKey ?? 'none',
          status: safetyDecision.status,
        });
      } catch (taskError) {
        logError('mcp.task_executor_failed', taskError, { taskId: task.id, sessionId: task.session_id });
        const failureMetadata = {
          ...existingMetadata,
          error: taskError instanceof Error ? taskError.message : String(taskError),
          lastExecutor: executorKey ?? existingMetadata.lastExecutor,
        };

        await mcpDirector.updateTaskStatus({
          taskId: task.id,
          status: 'FAILED',
          metadata: failureMetadata,
        });

        await mcpSafety.recordEvent({
          sessionId: task.session_id,
          taskId: task.id,
          severity: 'WARN',
          ruleCode: 'TASK:EXECUTOR_EXCEPTION',
          details: {
            executor: executorKey ?? 'unknown',
          },
        });

        await recomputeOrchestrationSessionStatus(task.session_id);
      }
    }
  } catch (error) {
    logError('mcp.task_execution_failed', error, {});
  }
}

function buildAgentPlanInstructions(params: {
  sessionId: string;
  orgSlug: string;
  requestContext?: AgentRequestContext;
  plan: any;
}) {
  const lines: string[] = [];
  lines.push(`Session ID: ${params.sessionId}`);
  lines.push(`Organisation: ${params.orgSlug}`);
  if (params.requestContext?.description) {
    lines.push(`Request: ${params.requestContext.description}`);
  }
  const flags = params.requestContext?.flags ?? {};
  if (Object.keys(flags).length > 0) {
    lines.push(`Flags: ${JSON.stringify(flags)}`);
  }
  lines.push('Plan JSON:');
  lines.push(JSON.stringify(params.plan));
  return lines.join('\n');
}

async function insertAgentAction(
  params: Omit<Parameters<typeof supabaseInsertAgentAction>[0], 'supabase'>,
): Promise<string> {
  return supabaseInsertAgentAction({ supabase: supabaseService, ...params });
}

async function createAgentActionApproval(
  params: Omit<Parameters<typeof supabaseCreateAgentActionApproval>[0], 'supabase'>,
): Promise<string> {
  return supabaseCreateAgentActionApproval({ supabase: supabaseService, ...params });
}

function normalizeApprovalAction(kind: string): ApprovalAction {
  return externalNormalizeApprovalAction(kind);
}

function reshapeApprovalRow(row: Record<string, any>, orgSlug: string) {
  return externalReshapeApprovalRow(row, orgSlug);
}

async function enforceApprovalGate(
  req: AuthenticatedRequest,
  res: Response,
  action: ApprovalAction,
): Promise<Response | void> {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: 'invalid session' });
  }

  const orgSlug =
    typeof req.body?.orgSlug === 'string'
      ? (req.body.orgSlug as string)
      : typeof req.query?.orgSlug === 'string'
      ? (req.query.orgSlug as string)
      : undefined;

  if (!orgSlug) {
    return res.status(400).json({ error: 'orgSlug is required' });
  }

  let orgContext;
  try {
    orgContext = await resolveOrgForUser(userId, orgSlug);
  } catch (err) {
    if ((err as Error).message === 'organization_not_found') {
      return res.status(404).json({ error: 'organization not found' });
    }
    if ((err as Error).message === 'not_a_member') {
      return res.status(403).json({ error: 'forbidden' });
    }
    throw err;
  }

  if (!REQUIRE_MANAGER_APPROVAL) {
    return res.json({ status: 'allowed', action });
  }

  if (!hasManagerPrivileges(orgContext.role)) {
    return res.status(403).json({ error: 'manager_approval_required', action });
  }

  if (action === 'CLIENT_SEND' && BLOCK_EXTERNAL_FILING) {
    return res.status(409).json({ error: 'external_filing_blocked', action });
  }

  const context = {
    orgSlug,
    path: req.path,
    method: req.method,
    body: req.body ?? null,
    query: req.query ?? null,
    requestedBy: userId,
    action,
  };

  const { data, error } = await supabaseService
    .from('approval_queue')
    .insert({
      org_id: orgContext.orgId,
      kind: action,
      status: 'PENDING',
      requested_by_user_id: userId,
      context_json: context,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw error ?? new Error('approval_queue_insert_failed');
  }

  const approvalId = data.id as string;

  logInfo('approval.queued', {
    userId,
    action,
    orgSlug,
    approvalId,
  });

  return res.status(202).json({
    status: 'approval_required',
    action,
    approvalId,
    message: 'Awaiting manager review.',
    citationsRequired: ENFORCE_CITATIONS,
    monitoringEnabled: QMS_MONITORING_ENABLED,
  });
}

async function updateRunSummaryWithResult({
  run,
  toolKey,
  result,
}: {
  run: { id: string; step_index: number; summary: unknown };
  toolKey: string;
  result: { status: AgentToolExecutionResult['status']; output?: unknown; error?: string };
}): Promise<{ state: 'DONE' | 'EXECUTING' | 'ERROR'; planDocument: any }> {
  const planDocument = parsePlanSummary(run.summary);
  const steps = ensurePlanSteps(planDocument);
  let targetStep = steps.find((step: any) => step?.stepIndex === run.step_index);

  if (!targetStep) {
    targetStep = { stepIndex: run.step_index, results: [] };
    steps.push(targetStep);
  }

  if (!Array.isArray(targetStep.results)) {
    targetStep.results = [];
  }

  const payload: AgentToolExecutionResult = {
    toolKey,
    status: result.status,
  };

  if (result.output !== undefined) {
    payload.output = result.output;
  }
  if (typeof result.error === 'string') {
    payload.error = result.error;
  }

  const existingIndex = targetStep.results.findIndex((entry: any) => entry?.toolKey === toolKey);
  if (existingIndex >= 0) {
    targetStep.results[existingIndex] = payload;
  } else {
    targetStep.results.push(payload);
  }

  const allResults: AgentToolExecutionResult[] = steps.flatMap((step: any) =>
    Array.isArray(step.results) ? (step.results as AgentToolExecutionResult[]) : []
  );

  const state = deriveRunState(allResults);

  await supabaseService
    .from('agent_runs')
    .update({
      summary: JSON.stringify(planDocument),
      state,
    })
    .eq('id', run.id);

  return { state, planDocument };
}

async function resumeApprovedAction({
  approvalId,
  context,
  orgContext,
  approverId,
}: {
  approvalId: string;
  context: Record<string, unknown>;
  orgContext: { orgId: string; orgSlug: string; role: AgentRole };
  approverId: string;
}): Promise<{ output: unknown; runState: 'DONE' | 'EXECUTING' | 'ERROR' }> {
  const sessionId = typeof context.sessionId === 'string' ? context.sessionId : undefined;
  const actionId = typeof context.actionId === 'string' ? context.actionId : undefined;
  const runId = typeof context.runId === 'string' ? context.runId : undefined;
  const toolKey = typeof context.toolKey === 'string' ? context.toolKey : undefined;

  if (!sessionId || !actionId || !runId || !toolKey) {
    throw new Error('approval_context_incomplete');
  }

  const [{ data: action, error: actionError }, { data: session, error: sessionError }, { data: run, error: runError }] =
    await Promise.all([
      supabaseService
        .from('agent_actions')
        .select('id, session_id, run_id, status, tool_key, input_json')
        .eq('id', actionId)
        .maybeSingle(),
      supabaseService
        .from('agent_sessions')
        .select('id, org_id, engagement_id, status')
        .eq('id', sessionId)
        .maybeSingle(),
      supabaseService
        .from('agent_runs')
        .select('id, step_index, summary')
        .eq('id', runId)
        .maybeSingle(),
    ]);

  if (actionError || !action) {
    throw actionError ?? new Error('action_not_found');
  }
  if (sessionError || !session) {
    throw sessionError ?? new Error('session_not_found');
  }
  if (runError || !run) {
    throw runError ?? new Error('run_not_found');
  }

  const handler = toolHandlers[toolKey];
  if (!handler) {
    throw new Error('handler_not_implemented');
  }

  await supabaseService
    .from('agent_sessions')
    .update({ status: 'RUNNING' })
    .eq('id', sessionId);

  await supabaseService
    .from('agent_actions')
    .update({ status: 'PENDING' })
    .eq('id', actionId);

  const executionInput =
    context.input && typeof context.input === 'object'
      ? (context.input as Record<string, unknown>)
      : (action.input_json as Record<string, unknown> | null) ?? {};

  try {
    const output = await handler(executionInput, {
      orgId: orgContext.orgId,
      engagementId: session.engagement_id ?? null,
      userId: approverId,
      sessionId,
      runId,
    });

    await supabaseService
      .from('agent_actions')
      .update({ status: 'SUCCESS', output_json: output ?? {} })
      .eq('id', actionId);

    const { state: runState } = await updateRunSummaryWithResult({
      run,
      toolKey,
      result: { status: 'SUCCESS', output },
    });

    await supabaseService.from('agent_traces').insert({
      org_id: orgContext.orgId,
      session_id: sessionId,
      run_id: runId,
      trace_type: 'TOOL',
      payload: {
        toolKey,
        input: executionInput,
        output,
        status: 'SUCCESS',
        resumedFromApproval: true,
        approvalId,
        runState,
      },
    });

    await supabaseService.from('activity_log').insert({
      org_id: orgContext.orgId,
      user_id: approverId,
      action: 'AGENT_TOOL_CALL',
      entity_type: 'agent_session',
      entity_id: sessionId,
      metadata: {
        toolKey,
        status: 'SUCCESS',
        resumedFromApproval: true,
        approvalId,
        inputHash: hashPayload(executionInput),
        outputHash: hashPayload(output),
        runState,
      },
    });

    return { output, runState };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? 'execution_failed_after_approval');

    await supabaseService
      .from('agent_actions')
      .update({ status: 'ERROR', output_json: { error: message } })
      .eq('id', actionId);

    const { state: runState } = await updateRunSummaryWithResult({
      run,
      toolKey,
      result: { status: 'ERROR', error: message },
    });

    await supabaseService.from('agent_traces').insert({
      org_id: orgContext.orgId,
      session_id: sessionId,
      run_id: runId,
      trace_type: 'ERROR',
      payload: {
        toolKey,
        input: executionInput,
        error: message,
        resumedFromApproval: true,
        approvalId,
        runState,
      },
    });

    await supabaseService.from('activity_log').insert({
      org_id: orgContext.orgId,
      user_id: approverId,
      action: 'AGENT_TOOL_CALL',
      entity_type: 'agent_session',
      entity_id: sessionId,
      metadata: {
        toolKey,
        status: 'ERROR',
        resumedFromApproval: true,
        approvalId,
        error: message,
        inputHash: hashPayload(executionInput),
        runState,
      },
    });

    if (runState === 'ERROR') {
      await supabaseService
        .from('agent_sessions')
        .update({ status: 'FAILED' })
        .eq('id', sessionId);
    }

    throw error;
  }
}

async function rejectBlockedAction({
  approvalId,
  context,
  orgContext,
  approverId,
  comment,
}: {
  approvalId: string;
  context: Record<string, unknown>;
  orgContext: { orgId: string; orgSlug: string; role: AgentRole };
  approverId: string;
  comment?: string;
}): Promise<void> {
  const sessionId = typeof context.sessionId === 'string' ? context.sessionId : undefined;
  const actionId = typeof context.actionId === 'string' ? context.actionId : undefined;
  const runId = typeof context.runId === 'string' ? context.runId : undefined;
  const toolKey = typeof context.toolKey === 'string' ? context.toolKey : undefined;

  if (!sessionId || !actionId || !runId || !toolKey) {
    throw new Error('approval_context_incomplete');
  }

  const [{ data: action, error: actionError }, { data: run, error: runError }] = await Promise.all([
    supabaseService
      .from('agent_actions')
      .select('id, input_json')
      .eq('id', actionId)
      .maybeSingle(),
    supabaseService
      .from('agent_runs')
      .select('id, step_index, summary')
      .eq('id', runId)
      .maybeSingle(),
  ]);

  if (actionError || !action) {
    throw actionError ?? new Error('action_not_found');
  }
  if (runError || !run) {
    throw runError ?? new Error('run_not_found');
  }

  await supabaseService
    .from('agent_actions')
    .update({ status: 'ERROR', output_json: { error: 'approval_rejected', comment: comment ?? null } })
    .eq('id', actionId);

  const { state: runState } = await updateRunSummaryWithResult({
    run,
    toolKey,
    result: { status: 'ERROR', error: comment ?? 'approval_rejected' },
  });

  await supabaseService
    .from('agent_sessions')
    .update({ status: 'FAILED' })
    .eq('id', sessionId);

  await supabaseService.from('agent_traces').insert({
    org_id: orgContext.orgId,
    session_id: sessionId,
    run_id: runId,
    trace_type: 'ERROR',
    payload: {
      toolKey,
      status: 'ERROR',
      approvalRejected: true,
      approvalId,
      comment: comment ?? null,
      runState,
    },
  });

  await supabaseService.from('activity_log').insert({
    org_id: orgContext.orgId,
    user_id: approverId,
    action: 'AGENT_TOOL_CALL',
    entity_type: 'agent_session',
    entity_id: sessionId,
    metadata: {
      toolKey,
      status: 'ERROR',
      approvalRejected: true,
      approvalId,
      comment: comment ?? null,
      runState,
    },
  });
}

interface AuthenticatedRequest extends Request {
  user?: JwtPayload & { sub?: string };
  requestId?: string;
}

function enrichMeta(meta: Record<string, unknown> = {}): Record<string, unknown> {
  const ctx = requestContext.getStore();
  if (ctx?.requestId && !('requestId' in meta)) {
    return { requestId: ctx.requestId, ...meta };
  }
  return meta;
}

function logInfo(message: string, meta: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ level: 'info', msg: message, ...enrichMeta(meta) }));
}

function logError(message: string, error: unknown, meta: Record<string, unknown> = {}) {
  console.error(
    JSON.stringify({
      level: 'error',
      msg: message,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...enrichMeta(meta),
    })
  );
  if (SENTRY_ENABLED) {
    Sentry.captureException(error);
  }
}

function getFeatureFlag(name: string, fallback = true) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return value !== 'false' && value !== '0';
}

function parseBooleanFlag(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  }
  return undefined;
}

function asArray<T = unknown>(value: unknown): T[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value as T[];
}

function parseAgentRequestContext(raw: unknown): AgentRequestContext | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }

  const source = raw as Record<string, unknown>;
  const context: AgentRequestContext = {};

  if (typeof source.description === 'string' && source.description.trim().length > 0) {
    context.description = source.description.trim();
  }

  const flagsPayload =
    typeof source.flags === 'object' && source.flags !== null && !Array.isArray(source.flags)
      ? (source.flags as Record<string, unknown>)
      : undefined;

  const flags: AgentRequestContext['flags'] = {};
  const externalFiling = parseBooleanFlag(source.externalFiling ?? flagsPayload?.externalFiling);
  if (externalFiling !== undefined) {
    flags.externalFiling = externalFiling;
  }
  const calculatorOverride = parseBooleanFlag(source.calculatorOverride ?? flagsPayload?.calculatorOverride);
  if (calculatorOverride !== undefined) {
    flags.calculatorOverride = calculatorOverride;
  }
  if (Object.keys(flags).length > 0) {
    context.flags = flags;
  }

  const minRoleRaw = source.minRoleRequired ?? source.minRole ?? flagsPayload?.minRoleRequired;
  const minRole = roleFromString(minRoleRaw);
  if (minRole) {
    context.minRoleRequired = minRole;
  }

  const requestedToolsSource = asArray(source.requestedTools) ?? asArray(source.tools);
  if (requestedToolsSource) {
    const requestedTools = requestedToolsSource
      .map((tool) => {
        if (!tool || typeof tool !== 'object') return null;
        const record = tool as Record<string, unknown>;
        const toolKey =
          typeof record.toolKey === 'string'
            ? record.toolKey
            : typeof record.key === 'string'
            ? record.key
            : undefined;
        if (!toolKey) return null;
        const minRoleForTool = roleFromString(record.minRole ?? record.min_role);
        return {
          toolKey,
          minRole: minRoleForTool ?? undefined,
        };
      })
      .filter(
        (entry): entry is { toolKey: string; minRole?: AgentRole } => Boolean(entry)
      );

    if (requestedTools.length > 0) {
      context.requestedTools = requestedTools;
    }
  }

  return Object.keys(context).length > 0 ? context : undefined;
}

type NormalizedResponseMessage = { role: string; content: unknown } & Record<string, unknown>;

const RESPONSES_ALLOWED_KEYS = new Set([
  'temperature',
  'top_p',
  'max_output_tokens',
  'response_format',
  'tools',
  'tool_choice',
  'tool_outputs',
  'metadata',
  'modalities',
  'reasoning',
  'user',
  'seed',
  'logit_bias',
  'parallel_tool_calls',
  'max_tool_calls',
  'conversation',
  'safety_identifier',
  'store',
  'audio',
  'text',
  'service_tier',
  'background',
  'instructions',
  'include',
  'response_id',
  'previous_response_id',
]);

const RESPONSE_KEY_ALIASES: Record<string, string> = {
  responseId: 'response_id',
  previousResponseId: 'previous_response_id',
  toolOutputs: 'tool_outputs',
  toolChoice: 'tool_choice',
  responseFormat: 'response_format',
  maxOutputTokens: 'max_output_tokens',
  maxToolCalls: 'max_tool_calls',
  topP: 'top_p',
  serviceTier: 'service_tier',
  safetyIdentifier: 'safety_identifier',
  parallelToolCalls: 'parallel_tool_calls',
};

function normaliseResponsesInput(raw: unknown): NormalizedResponseMessage[] | null {
  if (raw === null || raw === undefined) {
    return null;
  }

  if (typeof raw === 'string') {
    return [{ role: 'user', content: raw }];
  }

  if (Array.isArray(raw)) {
    if (raw.length === 0) {
      throw new Error('Responses input must include at least one message');
    }

    const normalised = raw.map((entry) => {
      if (typeof entry === 'string') {
        return { role: 'user', content: entry };
      }
      if (entry && typeof entry === 'object' && 'role' in entry) {
        const record = entry as Record<string, unknown>;
        const roleCandidate = typeof record.role === 'string' ? (record.role as string) : 'user';
        if (!('content' in record)) {
          throw new Error('Responses input items must include content');
        }
        return { ...record, role: roleCandidate } as NormalizedResponseMessage;
      }
      throw new Error('Unsupported responses input entry');
    });

    return normalised as NormalizedResponseMessage[];
  }

  if (raw && typeof raw === 'object' && 'role' in raw) {
    const record = raw as Record<string, unknown>;
    const roleValue = typeof record.role === 'string' ? (record.role as string) : 'user';
    if (!('content' in record)) {
      throw new Error('Responses input items must include content');
    }
    return [{ ...record, role: roleValue } as NormalizedResponseMessage];
  }

  throw new Error('Unsupported responses input payload');
}

function normaliseAgentType(value: unknown): AgentTypeKey {
  if (typeof value === 'string') {
    const upper = value.trim().toUpperCase();
    if (SUPPORTED_AGENT_TYPES.has(upper as AgentTypeKey)) {
      return upper as AgentTypeKey;
    }
  }
  return 'CLOSE';
}

function allowRequest(userId: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_WINDOW_MS;
  const timestamps = (requestBuckets.get(userId) ?? []).filter((ts) => ts > windowStart);

  if (timestamps.length >= RATE_LIMIT) {
    requestBuckets.set(userId, timestamps);
    return false;
  }

  timestamps.push(now);
  requestBuckets.set(userId, timestamps);
  return true;
}

function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.method === 'OPTIONS') {
    return next();
  }

  const header = req.header('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing or invalid authorization header' });
  }

  const token = header.split(' ', 2)[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      audience: JWT_AUDIENCE,
      algorithms: ['HS256'],
    }) as JwtPayload;

    const userId = payload.sub ?? 'anonymous';
    if (!allowRequest(userId)) {
      const orgSlug = typeof req.query?.orgSlug === 'string'
        ? (req.query.orgSlug as string)
        : (req.body && typeof req.body === 'object' && 'orgSlug' in req.body
            ? (req.body as Record<string, unknown>).orgSlug
            : null);
      logInfo('rate.limit_exceeded', { userId, path: req.path });
      notifyRateLimitBreach({
        userId,
        path: req.path,
        orgSlug: typeof orgSlug === 'string' ? orgSlug : null,
        requestId: req.requestId,
      }).catch((error) => logError('alerts.rate_limit_notify_failed', error, { userId, path: req.path }));
      return res.status(429).json({ error: 'rate limit exceeded' });
    }

    req.user = payload;
    logInfo('auth.accepted', { userId, path: req.path, method: req.method });
    return next();
  } catch (err) {
    logError('auth.invalid_token', err, { path: req.path });
    return res.status(401).json({ error: 'invalid access token' });
  }
}

// Database and OpenAI clients
const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

function resolveOpenAiClient(): OpenAI {
  return getOpenAIClient();
}

type OpenAiProxyTarget = OpenAI & Record<PropertyKey, unknown>;

function getOpenAiProxyTarget(): OpenAiProxyTarget {
  return resolveOpenAiClient() as OpenAiProxyTarget;
}

const openai: OpenAI = new Proxy(
  {},
  {
    get(_target, property, receiver) {
      const client = getOpenAiProxyTarget();
      const value = Reflect.get(client, property, receiver);
      if (typeof value === 'function') {
        return value.bind(client);
      }
      return value;
    },
    has(_target, property) {
      const client = getOpenAiProxyTarget();
      return Reflect.has(client, property);
    },
    ownKeys() {
      const client = getOpenAiProxyTarget();
      return Reflect.ownKeys(client);
    },
    getOwnPropertyDescriptor(_target, property) {
      const client = getOpenAiProxyTarget();
      const descriptor = Object.getOwnPropertyDescriptor(client, property);
      if (!descriptor) {
        return undefined;
      }
      return { ...descriptor, configurable: true };
    },
    set(_target, property, value, receiver) {
      const client = getOpenAiProxyTarget();
      return Reflect.set(client, property, value, receiver);
    },
  },
) as OpenAI;

const OPENAI_WEB_SEARCH_ENABLED =
  (process.env.OPENAI_WEB_SEARCH_ENABLED ?? 'false').toLowerCase() === 'true';
const OPENAI_WEB_SEARCH_MODEL = process.env.OPENAI_WEB_SEARCH_MODEL ?? 'gpt-4.1-mini';
const OPENAI_SUMMARY_MODEL = process.env.OPENAI_SUMMARY_MODEL ?? OPENAI_WEB_SEARCH_MODEL;
const OPENAI_FILE_SEARCH_VECTOR_STORE_ID = process.env.OPENAI_FILE_SEARCH_VECTOR_STORE_ID?.trim() ?? null;
const OPENAI_FILE_SEARCH_MODEL =
  process.env.OPENAI_FILE_SEARCH_MODEL?.trim() ?? process.env.AGENT_MODEL?.trim() ?? 'gpt-4.1-mini';
const rawFileSearchMaxResults = Number(process.env.OPENAI_FILE_SEARCH_MAX_RESULTS);
const OPENAI_FILE_SEARCH_MAX_RESULTS =
  Number.isFinite(rawFileSearchMaxResults) && rawFileSearchMaxResults > 0
    ? Math.floor(rawFileSearchMaxResults)
    : null;
const OPENAI_FILE_SEARCH_INCLUDE_RESULTS =
  parseBooleanFlag(process.env.OPENAI_FILE_SEARCH_INCLUDE_RESULTS) ?? true;

let OPENAI_FILE_SEARCH_FILTERS: Record<string, unknown> | undefined;
const rawFileSearchFilters = process.env.OPENAI_FILE_SEARCH_FILTERS?.trim();
if (rawFileSearchFilters) {
  try {
    const parsedFilters = JSON.parse(rawFileSearchFilters);
    if (parsedFilters && typeof parsedFilters === 'object') {
      OPENAI_FILE_SEARCH_FILTERS = parsedFilters as Record<string, unknown>;
    } else {
      throw new Error('OPENAI_FILE_SEARCH_FILTERS must be a JSON object');
    }
  } catch (error) {
    logError('openai.file_search_filter_parse_failed', error, {});
  }
}

const WEB_FETCH_CACHE_RETENTION_DAYS = (() => {
  const raw = Number(process.env.WEB_FETCH_CACHE_RETENTION_DAYS ?? '14');
  if (!Number.isFinite(raw) || raw <= 0) {
    return 14;
  }
  return Math.floor(raw);
})();
const WEB_FETCH_CACHE_RETENTION_MS = WEB_FETCH_CACHE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
const WEB_FETCH_CACHE_PRUNE_INTERVAL_MS = Math.min(
  Math.max(WEB_FETCH_CACHE_RETENTION_MS / 4, 60 * 60 * 1000),
  12 * 60 * 60 * 1000,
);
let lastWebCachePruneAt = 0;

const SUPABASE_URL = process.env.SUPABASE_URL;
if (!SUPABASE_URL) {
  throw new Error('SUPABASE_URL must be configured.');
}

const SUPABASE_SERVICE_ROLE_KEY = await getSupabaseServiceRoleKey();

const supabaseService = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

startNotificationFanoutWorker({ supabase: supabaseService, logInfo, logError });

const OPENAI_DEBUG_LOGGING = (process.env.OPENAI_DEBUG_LOGGING ?? 'false').toLowerCase() === 'true';
const OPENAI_DEBUG_FETCH_DETAILS =
  (process.env.OPENAI_DEBUG_FETCH_DETAILS ?? 'false').toLowerCase() === 'true';
const defaultOpenAiWorkload = readOpenAiWorkloadEnv('default');
const OPENAI_REQUEST_TAGS = defaultOpenAiWorkload.requestTags;
const OPENAI_DEBUG_DEFAULT_TAGS = Array.from(
  new Set([
    `service:${SERVICE_NAME}`,
    `env:${RUNTIME_ENVIRONMENT}`,
    ...OPENAI_REQUEST_TAGS,
  ]),
);
const OPENAI_REQUEST_QUOTA_TAG = defaultOpenAiWorkload.quotaTag ?? null;
const OPENAI_STREAMING_ENABLED = (process.env.OPENAI_STREAMING_ENABLED ?? 'false').toLowerCase() === 'true';
const OPENAI_REALTIME_ENABLED = (process.env.OPENAI_REALTIME_ENABLED ?? 'false').toLowerCase() === 'true';
const OPENAI_STREAMING_TOOL_ENABLED = (process.env.OPENAI_STREAMING_TOOL_ENABLED ?? 'false').toLowerCase() === 'true';
const OPENAI_SORA_ENABLED = (process.env.OPENAI_SORA_ENABLED ?? 'false').toLowerCase() === 'true';
const OPENAI_ORCHESTRATOR_ENABLED = (process.env.OPENAI_ORCHESTRATOR_ENABLED ?? 'false').toLowerCase() === 'true';
const ORCHESTRATION_POLL_INTERVAL_MS = Number(process.env.ORCHESTRATION_POLL_INTERVAL_MS ?? '15000');

const auditExecutionAgent = new AuditExecutionAgent({
  supabase: supabaseService,
  openai,
  logInfo,
  logError,
});

const logOpenAIDebugEvent = createOpenAiDebugLogger({
  supabase: supabaseService,
  apiKey: process.env.OPENAI_API_KEY,
  enabled: OPENAI_DEBUG_LOGGING,
  fetchDetails: OPENAI_DEBUG_FETCH_DETAILS,
  logError,
  logInfo,
  defaultTags: OPENAI_DEBUG_DEFAULT_TAGS,
  quotaTag: OPENAI_REQUEST_QUOTA_TAG,
});

async function notifyRateLimitBreach(meta: { userId: string; path: string; orgSlug?: string | null; requestId?: string }) {
  const context = {
    userId: meta.userId,
    path: meta.path,
    orgSlug: meta.orgSlug ?? null,
    requestId: meta.requestId ?? null,
  };

  await supabaseService
    .from('telemetry_alerts')
    .insert({
      alert_type: 'RATE_LIMIT_BREACH',
      severity: 'WARNING',
      message: `Rate limit exceeded on ${meta.path}`,
      context,
    })
    .catch((error) => logError('alerts.rate_limit_insert_failed', error, context));

  if (!RATE_LIMIT_ALERT_WEBHOOK) return;

  await fetch(RATE_LIMIT_ALERT_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `⚠️ Rate limit exceeded for ${meta.path} (user=${meta.userId})`,
    }),
  }).catch((error) => logError('alerts.rate_limit_webhook_failed', error, context));
}

async function notifyEmbeddingDeltaResult(payload: {
  summary?: DeltaEmbeddingSummary;
  error?: unknown;
  initiatedBy: string;
  targetOrgIds?: string[];
}): Promise<void> {
  const { summary, error, initiatedBy } = payload;
  const actor = initiatedBy || 'embedding-cron';
  const targetOrgIds = payload.targetOrgIds ?? summary?.targetOrgIds ?? [];

  const severity = error
    ? 'CRITICAL'
    : summary && (summary.refusals > 0 || summary.reviews > 0)
    ? 'WARNING'
    : 'INFO';
  const alertType = error ? 'EMBEDDING_DELTA_FAILED' : 'EMBEDDING_DELTA_COMPLETE';

  const failureCount = summary?.failures.length ?? 0;
  const baseMessage = error
    ? `Delta embeddings job failed (${actor})`
    : `Delta embeddings job completed (${summary?.lookbackWindowHours ?? 0}h window by ${actor})`;
  const message = error
    ? `${baseMessage}: ${error instanceof Error ? error.message : String(error)}`
    : `${baseMessage}: ${summary?.documentsEmbedded ?? 0} documents, ${summary?.policiesEmbedded ?? 0} policies, ${failureCount} failures.`;

  const context: Record<string, unknown> = {
    actor,
    targetOrgIds,
  };

  if (summary) {
    context.summary = {
      lookbackWindowHours: summary.lookbackWindowHours,
      organizationsScanned: summary.organizationsScanned,
      organizationsUpdated: summary.organizationsUpdated,
      documentsEmbedded: summary.documentsEmbedded,
      policiesEmbedded: summary.policiesEmbedded,
      chunksEmbedded: summary.chunksEmbedded,
      skippedDocuments: summary.skippedDocuments,
      skippedPolicies: summary.skippedPolicies,
      approvals: summary.approvals,
      reviews: summary.reviews,
      refusals: summary.refusals,
      tokensConsumed: summary.tokensConsumed,
      organizationBreakdown: summary.organizationBreakdown.map((org) => ({
        orgId: org.orgId,
        orgSlug: org.orgSlug,
        documentsEmbedded: org.documentsEmbedded,
        policiesEmbedded: org.policiesEmbedded,
        approvals: org.approvals,
        reviews: org.reviews,
        refusals: org.refusals,
        skippedDocuments: org.skippedDocuments,
        skippedPolicies: org.skippedPolicies,
      })),
      failures: summary.failures.slice(0, 10),
    };
  }

  if (error) {
    context.error = error instanceof Error ? error.message : String(error);
  }

  await supabaseService
    .from('telemetry_alerts')
    .insert({
      alert_type: alertType,
      severity,
      message,
      context,
    })
    .catch((err) => logError('alerts.embedding_delta_insert_failed', err, { severity, actor }));

  if (!EMBEDDING_ALERT_WEBHOOK) {
    return;
  }

  const emoji = error ? '❌' : severity === 'WARNING' ? '⚠️' : '✅';
  const headline = summary
    ? `${emoji} Delta embeddings (${summary.lookbackWindowHours}h) by ${actor}`
    : `${emoji} Delta embeddings job update for ${actor}`;
  const totalsLine = summary
    ? `${summary.documentsEmbedded} docs · ${summary.policiesEmbedded} policies · ${failureCount} failures`
    : null;
  const breakdownLine = summary
    ? summary.organizationBreakdown
        .slice(0, 3)
        .map((org) =>
          `${org.orgSlug ?? org.orgId}: ${org.documentsEmbedded + org.policiesEmbedded} updates / ${org.refusals} refusals`,
        )
        .join(' • ')
    : null;
  const errorLine = error ? (error instanceof Error ? error.message : String(error)) : null;

  const text = [headline, totalsLine, breakdownLine, errorLine].filter(Boolean).join('\n');

  await fetch(EMBEDDING_ALERT_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  }).catch((err) => logError('alerts.embedding_delta_webhook_failed', err, { severity, actor }));
}

async function ensureDocumentsBucket() {
  const { data: bucket } = await supabaseService.storage.getBucket('documents');
  if (!bucket) {
    await supabaseService.storage.createBucket('documents', { public: false });
  }
}

await ensureDocumentsBucket();

await initialiseMcpInfrastructure({
  supabase: supabaseService,
  logInfo,
  logError,
});

async function resolveOpenAiAgentIdForType(agentType: AgentTypeKey): Promise<string | null> {
  const envOverride = process.env[`OPENAI_AGENT_ID_${agentType}`]?.trim();
  if (envOverride) {
    return envOverride;
  }

  try {
    const { data, error } = await supabaseService
      .from('agent_manifests')
      .select('metadata')
      .eq('metadata->>legacyAgentType', agentType)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      throw error;
    }

    const metadata = (data?.[0]?.metadata ?? null) as Record<string, unknown> | null;
    const idCandidate =
      typeof metadata?.openaiAgentId === 'string'
        ? metadata.openaiAgentId
        : typeof metadata?.openai_agent_id === 'string'
        ? (metadata.openai_agent_id as string)
        : null;

    return idCandidate?.trim() ?? null;
  } catch (error) {
    logError('openai.agent_id_lookup_failed', error, { agentType });
    return null;
  }
}

const mcpDirector = createMcpDirectorAgent({
  supabase: supabaseService,
  logInfo,
  logError,
});
const mcpSafety = createMcpSafetyAgent({
  supabase: supabaseService,
  logInfo,
  logError,
});

app.locals.mcp = {
  director: mcpDirector,
  safety: mcpSafety,
};

await mcpDirector.initialiseManifests();

if (ORCHESTRATION_POLL_INTERVAL_MS > 0) {
  const scheduler = setInterval(() => {
    void processPendingOrchestrationTasks();
    void executeAssignedOrchestrationTasks();
  }, ORCHESTRATION_POLL_INTERVAL_MS);
  scheduler.unref?.();
  void processPendingOrchestrationTasks();
  void executeAssignedOrchestrationTasks();
}

async function syncAgentToolsWithLogging(source: string) {
  try {
    await syncAgentToolsFromRegistry({
      supabase: supabaseService,
      openAiApiKey: process.env.OPENAI_API_KEY,
      logError,
      logInfo,
      retryCount: 3,
    });
  } catch (error) {
    logError('openai.agent_tool_sync_unhandled', error, { source });
  }
}

if (isAgentPlatformEnabled()) {
  void syncAgentToolsWithLogging('startup');
}

app.get(['/health', '/healthz'], (_req, res) => {
  res.json({ status: 'ok' });
});

app.get(['/ready', '/readiness'], async (_req, res) => {
  const summary = await buildReadinessSummary({
    db,
    supabaseUrl: SUPABASE_URL,
    supabaseServiceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  res.status(summary.status === 'ok' ? 200 : 503).json(summary);
});

// Observability dry run to exercise Sentry/alerting
app.post(['/v1/observability/dry-run'], (req, res) => {
  const allow = String(process.env.ALLOW_SENTRY_DRY_RUN || 'false').toLowerCase() === 'true';
  if (!allow) return res.status(404).json({ error: 'not_found' });
  const rid = req.headers['x-request-id'] || null;
  throw new Error(`sentry_dry_run_triggered request_id=${rid}`);
});

app.post('/internal/knowledge/embeddings/reembed-delta', async (req, res) => {
  let actor = 'embedding-cron';
  let targetOrgIds: string[] = [];
  try {
    if (!EMBEDDING_CRON_SECRET) {
      return res.status(503).json({ error: 'delta_embedding_job_disabled' });
    }

    const headerSecret = req.header('x-embedding-cron-secret');
    const body = (req.body ?? {}) as Record<string, unknown>;
    const bodySecret = typeof body.secret === 'string' ? body.secret : null;
    const providedSecret = headerSecret ?? bodySecret;

    if (providedSecret !== EMBEDDING_CRON_SECRET) {
      logError('embeddings.delta_auth_failed', new Error('invalid cron secret'), { provided: Boolean(providedSecret) });
      return res.status(401).json({ error: 'unauthorised' });
    }

    const lookbackHours = typeof body.lookbackHours === 'number' && Number.isFinite(body.lookbackHours)
      ? Math.max(1, Math.floor(body.lookbackHours))
      : EMBEDDING_DELTA_LOOKBACK_HOURS;
    const documentLimit = typeof body.documentLimit === 'number' && Number.isFinite(body.documentLimit)
      ? Math.max(1, Math.floor(body.documentLimit))
      : EMBEDDING_DELTA_DOCUMENT_LIMIT;
    const policyLimit = typeof body.policyLimit === 'number' && Number.isFinite(body.policyLimit)
      ? Math.max(1, Math.floor(body.policyLimit))
      : EMBEDDING_DELTA_POLICY_LIMIT;
    actor = typeof body.actor === 'string' && body.actor.trim().length > 0 ? body.actor.trim() : 'embedding-cron';

    const orgIdCandidates: string[] = [];
    if (typeof body.orgId === 'string' && body.orgId.trim().length > 0) {
      orgIdCandidates.push(body.orgId.trim());
    }
    if (Array.isArray(body.orgIds)) {
      for (const value of body.orgIds) {
        if (typeof value === 'string' && value.trim().length > 0) {
          orgIdCandidates.push(value.trim());
        }
      }
    }
    targetOrgIds = Array.from(new Set(orgIdCandidates));

    logInfo('embeddings.delta_job_start', {
      lookbackHours,
      documentLimit,
      policyLimit,
      actor,
      targetOrgIds,
    });

    const summary = await reembedDeltaEmbeddings({
      lookbackHours,
      documentLimit,
      policyLimit,
      initiatedBy: actor,
      orgIds: targetOrgIds.length > 0 ? targetOrgIds : undefined,
    });

    logInfo('embeddings.delta_job_complete', summary);
    await notifyEmbeddingDeltaResult({ summary, initiatedBy: actor, targetOrgIds }).catch((error) =>
      logError('alerts.embedding_delta_notify_failed', error, { actor }),
    );
    res.json(summary);
  } catch (error) {
    logError('embeddings.delta_job_failed', error, { actor, targetOrgIds });
    await notifyEmbeddingDeltaResult({ error, initiatedBy: actor, targetOrgIds }).catch((notifyError) =>
      logError('alerts.embedding_delta_notify_failed', notifyError, { actor }),
    );
    res.status(500).json({ error: 'delta_job_failed' });
  }
});

app.use(authenticate);

async function resolveOrgForUser(userId: string, orgSlug: string) {
  const { data: org, error: orgError } = await supabaseService
    .from('organizations')
    .select('id, slug')
    .eq('slug', orgSlug)
    .maybeSingle();

  if (orgError || !org) {
    throw new Error('organization_not_found');
  }

  const { data: membership, error: membershipError } = await supabaseService
    .from('memberships')
    .select('role')
    .eq('org_id', org.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (membershipError || !membership) {
    throw new Error('not_a_member');
  }

  return {
    orgId: org.id,
    orgSlug: org.slug,
    role: membership.role as AgentRole,
  };
}

async function loadAgentSessionForUser(userId: string, sessionId: string) {
  const { data, error } = await supabaseService
    .from('agent_sessions')
    .select('id, org_id, user_id, started_by_user_id')
    .eq('id', sessionId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    const notFound = new Error('agent_session_not_found');
    (notFound as any).status = 404;
    throw notFound;
  }

  await resolveOrgByIdForUser(userId, data.org_id);
  return data as { id: string; org_id: string; user_id?: string | null; started_by_user_id?: string | null };
}

async function resolveOrgByIdForUser(userId: string, orgId: string) {
  const { data: org, error: orgError } = await supabaseService
    .from('organizations')
    .select('id, slug')
    .eq('id', orgId)
    .maybeSingle();

  if (orgError || !org) {
    throw orgError ?? new Error('organization_not_found');
  }

  const { data: membership, error: membershipError } = await supabaseService
    .from('memberships')
    .select('role')
    .eq('org_id', org.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (membershipError || !membership) {
    throw membershipError ?? new Error('not_a_member');
  }

  return {
    orgId: org.id,
    orgSlug: org.slug,
    role: membership.role as AgentRole,
  };
}

function hasManagerPrivileges(role: AgentRole) {
  return role === 'MANAGER' || role === 'SYSTEM_ADMIN';
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

type NonAuditService = {
  service: string;
  prohibited: boolean;
  description?: string | null;
};

type IndependenceAssessmentResult =
  | {
      ok: true;
      conclusion: 'OK' | 'OVERRIDE';
      checked: boolean;
      note: string | null;
      services: NonAuditService[];
      prohibitedCount: number;
      needsApproval: boolean;
    }
  | {
      ok: false;
      error: 'independence_check_required' | 'prohibited_nas';
      prohibitedCount?: number;
    };

function sanitizeNonAuditServices(raw: unknown): NonAuditService[] {
  if (!raw) return [];

  const entries = Array.isArray(raw) ? raw : [raw];
  const collected: NonAuditService[] = [];

  for (const entry of entries) {
    if (!entry) continue;

    if (typeof entry === 'string') {
      const name = entry.trim();
      if (name.length === 0) continue;
      collected.push({ service: name, prohibited: false });
      continue;
    }

    if (typeof entry === 'object') {
      const record = entry as Record<string, unknown>;
      const rawName =
        typeof record.service === 'string'
          ? record.service
          : typeof record.name === 'string'
          ? record.name
          : typeof record.title === 'string'
          ? record.title
          : null;

      const name = rawName?.trim();
      if (!name) continue;

      const description = toNullableString(record.description);
      const status = typeof record.status === 'string' ? record.status.toUpperCase() : null;
      const prohibited =
        typeof record.prohibited === 'boolean'
          ? record.prohibited
          : typeof record.isProhibited === 'boolean'
          ? record.isProhibited
          : status === 'PROHIBITED' || status === 'NOT_ALLOWED';

      collected.push({
        service: name,
        prohibited,
        ...(description ? { description } : {}),
      });
      continue;
    }
  }

  if (collected.length <= 1) {
    return collected;
  }

  const deduped = new Map<string, NonAuditService>();
  for (const item of collected) {
    const existing = deduped.get(item.service);
    if (!existing) {
      deduped.set(item.service, item);
      continue;
    }

    deduped.set(item.service, {
      service: item.service,
      prohibited: existing.prohibited || item.prohibited,
      ...(existing.description
        ? { description: existing.description }
        : item.description
        ? { description: item.description }
        : {}),
    });
  }

  return Array.from(deduped.values()).slice(0, 100);
}

function assessIndependence({
  isAuditClient,
  independenceChecked,
  services,
  overrideNote,
}: {
  isAuditClient: boolean;
  independenceChecked: boolean;
  services: NonAuditService[];
  overrideNote?: string | null;
}): IndependenceAssessmentResult {
  const checked = isAuditClient ? independenceChecked : false;
  const note = toNullableString(overrideNote);
  const prohibitedCount = services.filter((svc) => svc.prohibited).length;

  if (!isAuditClient) {
    return {
      ok: true,
      conclusion: 'OK',
      checked,
      note,
      services,
      prohibitedCount,
      needsApproval: false,
    };
  }

  if (!independenceChecked) {
    return { ok: false, error: 'independence_check_required' };
  }

  if (prohibitedCount === 0) {
    return {
      ok: true,
      conclusion: 'OK',
      checked: true,
      note,
      services,
      prohibitedCount,
      needsApproval: false,
    };
  }

  if (!note) {
    return { ok: false, error: 'prohibited_nas', prohibitedCount };
  }

  return {
    ok: true,
    conclusion: 'OVERRIDE',
    checked: true,
    note,
    services,
    prohibitedCount,
    needsApproval: true,
  };
}

async function ensureIndependenceOverrideApproval({
  orgId,
  engagementId,
  userId,
  note,
  services,
  isAuditClient,
}: {
  orgId: string;
  engagementId: string;
  userId: string;
  note: string;
  services: NonAuditService[];
  isAuditClient: boolean;
}): Promise<string> {
  const sanitizedNote = toNullableString(note) ?? '';
  const context = {
    engagementId,
    isAuditClient,
    nonAuditServices: services,
    note: sanitizedNote,
  };

  const { data: existing, error: existingError } = await supabaseService
    .from('approval_queue')
    .select('id, status')
    .eq('org_id', orgId)
    .eq('kind', 'INDEPENDENCE_OVERRIDE')
    .eq('context_json->>engagementId', engagementId)
    .order('requested_at', { ascending: false })
    .limit(1);

  if (existingError) throw existingError;
  const pending = existing?.[0];
  if (pending && pending.status === 'PENDING') {
    await supabaseService
      .from('approval_queue')
      .update({ context_json: context, requested_by_user_id: userId })
      .eq('id', pending.id);
    return pending.id as string;
  }

  const { data, error } = await supabaseService
    .from('approval_queue')
    .insert({
      org_id: orgId,
      kind: 'INDEPENDENCE_OVERRIDE',
      status: 'PENDING',
      requested_by_user_id: userId,
      context_json: context,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw error ?? new Error('independence_override_approval_failed');
  }

  return data.id as string;
}

async function hasApprovedIndependenceOverride(orgId: string, engagementId: string): Promise<boolean> {
  const { data, error } = await supabaseService
    .from('approval_queue')
    .select('id')
    .eq('org_id', orgId)
    .eq('kind', 'INDEPENDENCE_OVERRIDE')
    .eq('context_json->>engagementId', engagementId)
    .eq('status', 'APPROVED')
    .order('decision_at', { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  return Array.isArray(data) && data.length > 0;
}

function mapEngagementRow(row: any) {
  return {
    id: row.id,
    org_id: row.org_id,
    client_id: row.client_id,
    title: row.title,
    description: row.description ?? null,
    status: typeof row.status === 'string' ? row.status : 'PLANNING',
    start_date: row.start_date ?? null,
    end_date: row.end_date ?? null,
    budget: typeof row.budget === 'number' ? row.budget : row.budget !== null ? Number(row.budget) : null,
    is_audit_client: Boolean(row.is_audit_client),
    requires_eqr: Boolean(row.requires_eqr),
    non_audit_services: sanitizeNonAuditServices(row.non_audit_services),
    independence_checked: Boolean(row.independence_checked),
    independence_conclusion:
      typeof row.independence_conclusion === 'string' ? row.independence_conclusion : 'OK',
    independence_conclusion_note: toNullableString(row.independence_conclusion_note),
    created_at: row.created_at,
    updated_at: row.updated_at ?? null,
  };
}

async function extractText(buffer: Buffer, mimetype: string): Promise<string> {
  if (mimetype === 'application/pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  }
  if (mimetype === 'text/html') {
    const html = buffer.toString('utf-8');
    return stripHtml(html);
  }
  if (mimetype.startsWith('text/')) {
    return buffer.toString('utf-8');
  }
  if (mimetype === 'application/json' || mimetype === 'application/xml') {
    return buffer.toString('utf-8');
  }
  const result = await Tesseract.recognize(buffer, 'eng');
  return result.data.text;
}

function chunkText(text: string, size = 500): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let chunk: string[] = [];
  for (const word of words) {
    if (chunk.join(' ').length + word.length + 1 > size) {
      chunks.push(chunk.join(' '));
      chunk = [];
    }
    chunk.push(word);
  }
  if (chunk.length) chunks.push(chunk.join(' '));
  return chunks;
}

type EmbeddingTelemetryDecision = 'APPROVED' | 'REVIEW' | 'REFUSED';

interface EmbeddingTelemetryEvent {
  orgId: string;
  scenario: string;
  decision: EmbeddingTelemetryDecision;
  metrics: Record<string, unknown>;
  actor?: string | null;
}

async function recordEmbeddingTelemetry(event: EmbeddingTelemetryEvent): Promise<void> {
  try {
    await supabaseService.from('autonomy_telemetry_events').insert({
      org_id: event.orgId,
      module: 'knowledge_embeddings',
      scenario: event.scenario,
      decision: event.decision,
      metrics: {
        ...event.metrics,
        recorded_at: new Date().toISOString(),
      },
      actor: event.actor ?? null,
    });
  } catch (error) {
    logError('telemetry.embedding_log_failed', error, {
      orgId: event.orgId,
      scenario: event.scenario,
      decision: event.decision,
    });
  }
}

type EmbedUsage = {
  prompt_tokens?: number;
  total_tokens?: number;
};

type EmbedResult = {
  vectors: number[][];
  usage: EmbedUsage;
  model: string;
};

async function embed(texts: string[]): Promise<EmbedResult> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });
  await logOpenAIDebugEvent({
    endpoint: 'embeddings.create',
    response: res as any,
    requestPayload: { size: texts.length, model: 'text-embedding-3-small' },
  });
  return {
    vectors: res.data.map((d) => d.embedding),
    usage: res.usage ?? {},
    model: res.model,
  };
}

interface BackfillSummary {
  documentsProcessed: number;
  policyVersionsProcessed: number;
  chunksEmbedded: number;
  tokensConsumed: number;
  skippedDocuments: number;
  skippedPolicies: number;
  failures: { target: string; reason: string }[];
}

async function fetchDocumentsMissingEmbeddings(orgId: string, limit: number) {
  const { rows } = await db.query(
    `SELECT id, name, file_path, file_type, file_size, created_at
       FROM documents
      WHERE org_id = $1
        AND file_path IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM document_chunks WHERE document_chunks.doc_id = documents.id
        )
      ORDER BY created_at ASC
      LIMIT $2`,
    [orgId, limit],
  );
  return rows as Array<{
    id: string;
    name: string;
    file_path: string;
    file_type: string | null;
    file_size: number | null;
  }>;
}

async function fetchDocumentsNeedingDelta(orgId: string, windowStart: Date, limit: number) {
  const { rows } = await db.query(
    `SELECT d.id,
            d.name,
            d.file_path,
            d.file_type,
            d.file_size,
            COALESCE(d.created_at, now()) AS created_at,
            MAX(c.last_embedded_at) AS last_embedded_at
       FROM documents d
  LEFT JOIN document_chunks c ON c.doc_id = d.id
      WHERE d.org_id = $1
        AND d.file_path IS NOT NULL
        AND COALESCE(d.created_at, now()) >= $2
   GROUP BY d.id
     HAVING MAX(c.last_embedded_at) IS NULL OR MAX(c.last_embedded_at) < COALESCE(d.created_at, now())
   ORDER BY COALESCE(d.created_at, now()) ASC
      LIMIT $3`,
    [orgId, windowStart.toISOString(), limit],
  );

  return rows as Array<{
    id: string;
    name: string;
    file_path: string;
    file_type: string | null;
    file_size: number | null;
  }>;
}

async function fetchPolicyVersionsNeedingDelta(orgId: string, windowStart: Date, limit: number) {
  const { rows } = await db.query(
    `SELECT pv.id,
            pv.version,
            pv.status,
            pv.summary,
            pv.diff,
            COALESCE(pv.updated_at, pv.created_at, now()) AS modified_at,
            MAX(dc.last_embedded_at) AS last_embedded_at
       FROM agent_policy_versions pv
  LEFT JOIN document_chunks dc
         ON dc.org_id = pv.org_id AND dc.source = 'policy:' || pv.id::text
      WHERE pv.org_id = $1
        AND COALESCE(pv.updated_at, pv.created_at, now()) >= $2
   GROUP BY pv.id
     HAVING MAX(dc.last_embedded_at) IS NULL OR MAX(dc.last_embedded_at) < COALESCE(pv.updated_at, pv.created_at, now())
   ORDER BY COALESCE(pv.updated_at, pv.created_at, now()) ASC
      LIMIT $3`,
    [orgId, windowStart.toISOString(), limit],
  );

  return rows as Array<{
    id: string;
    version: number;
    status: string;
    summary: string | null;
    diff: unknown;
  }>;
}

async function hasExistingPolicyEmbeddings(orgId: string, policyId: string) {
  const sourceKey = `policy:${policyId}`;
  const { rows } = await db.query(
    'SELECT 1 FROM document_chunks WHERE org_id = $1 AND source = $2 LIMIT 1',
    [orgId, sourceKey],
  );
  return rows.length > 0;
}

type DeltaOrgResult = {
  documentsEmbedded: number;
  policiesEmbedded: number;
  chunksEmbedded: number;
  tokensConsumed: number;
  skippedDocuments: number;
  skippedPolicies: number;
  approvals: number;
  reviews: number;
  refusals: number;
  failures: { target: string; reason: string; orgId?: string }[];
};

type DeltaOrgBreakdown = Omit<DeltaOrgResult, 'failures'> & {
  orgId: string;
  orgSlug: string;
};

type DeltaEmbeddingSummary = DeltaOrgResult & {
  lookbackWindowHours: number;
  organizationsScanned: number;
  organizationsUpdated: number;
  targetOrgIds: string[];
  organizationBreakdown: DeltaOrgBreakdown[];
};

async function reembedDeltaForOrg(options: {
  orgId: string;
  orgSlug: string;
  windowStart: Date;
  documentLimit: number;
  policyLimit: number;
  initiatedBy: string;
}): Promise<DeltaOrgResult> {
  const orgSummary: DeltaOrgResult = {
    documentsEmbedded: 0,
    policiesEmbedded: 0,
    chunksEmbedded: 0,
    tokensConsumed: 0,
    skippedDocuments: 0,
    skippedPolicies: 0,
    approvals: 0,
    reviews: 0,
    refusals: 0,
    failures: [],
  };

  const documents = await fetchDocumentsNeedingDelta(options.orgId, options.windowStart, options.documentLimit);

  for (const document of documents) {
    try {
      const download = await supabaseService.storage.from('documents').download(document.file_path);
      if (download.error || !download.data) {
        orgSummary.skippedDocuments += 1;
        orgSummary.reviews += 1;
        const reason = download.error?.message ?? 'document_download_failed';
        orgSummary.failures.push({ target: `document:${document.id}`, reason, orgId: options.orgId });
        await recordEmbeddingTelemetry({
          orgId: options.orgId,
          scenario: 'document_delta',
          decision: 'REVIEW',
          metrics: {
            documentId: document.id,
            reason,
            lookbackHours: options.lookbackHours,
            delta: true,
          },
          actor: options.initiatedBy,
        });
        continue;
      }

      const arrayBuffer = await download.data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const text = await extractText(buffer, document.file_type ?? 'application/octet-stream');
      const trimmed = text.trim();
      if (!trimmed) {
        orgSummary.skippedDocuments += 1;
        orgSummary.reviews += 1;
        orgSummary.failures.push({ target: `document:${document.id}`, reason: 'no_text_content', orgId: options.orgId });
        await recordEmbeddingTelemetry({
          orgId: options.orgId,
          scenario: 'document_delta',
          decision: 'REVIEW',
          metrics: {
            documentId: document.id,
            reason: 'no_text_content',
            lookbackHours: options.lookbackHours,
            delta: true,
          },
          actor: options.initiatedBy,
        });
        continue;
      }

      const chunks = chunkText(trimmed);
      if (!chunks.length) {
        orgSummary.skippedDocuments += 1;
        orgSummary.reviews += 1;
        orgSummary.failures.push({ target: `document:${document.id}`, reason: 'no_chunks_generated', orgId: options.orgId });
        await recordEmbeddingTelemetry({
          orgId: options.orgId,
          scenario: 'document_delta',
          decision: 'REVIEW',
          metrics: {
            documentId: document.id,
            reason: 'no_chunks_generated',
            lookbackHours: options.lookbackHours,
            delta: true,
          },
          actor: options.initiatedBy,
        });
        continue;
      }

      const { vectors, usage, model } = await embed(chunks);

      await db.query('BEGIN');
      await db.query('DELETE FROM document_chunks WHERE org_id = $1 AND doc_id = $2', [options.orgId, document.id]);
      const insertSql =
        'INSERT INTO document_chunks(org_id, doc_id, chunk_index, content, embedding, source, last_embedded_at) VALUES ($1,$2,$3,$4,$5,$6,now())';
      for (let i = 0; i < chunks.length; i += 1) {
        await db.query(insertSql, [
          options.orgId,
          document.id,
          i,
          chunks[i],
          vector(vectors[i]),
          `document:${document.id}`,
        ]);
      }
      await db.query('COMMIT');

      orgSummary.documentsEmbedded += 1;
      orgSummary.chunksEmbedded += chunks.length;
      orgSummary.tokensConsumed += usage.total_tokens ?? 0;
      orgSummary.approvals += 1;

      await recordEmbeddingTelemetry({
        orgId: options.orgId,
        scenario: 'document_delta',
        decision: 'APPROVED',
        metrics: {
          documentId: document.id,
          chunkCount: chunks.length,
          tokens: usage.total_tokens ?? 0,
          promptTokens: usage.prompt_tokens ?? 0,
          model,
          lookbackHours: options.lookbackHours,
          delta: true,
        },
        actor: options.initiatedBy,
      });
    } catch (error) {
      await db.query('ROLLBACK').catch(() => undefined);
      const message = error instanceof Error ? error.message : String(error);
      orgSummary.failures.push({ target: `document:${document.id}`, reason: message, orgId: options.orgId });
      orgSummary.refusals += 1;
      await recordEmbeddingTelemetry({
        orgId: options.orgId,
        scenario: 'document_delta',
        decision: 'REFUSED',
        metrics: {
          documentId: document.id,
          error: message,
          lookbackHours: options.lookbackHours,
          delta: true,
        },
        actor: options.initiatedBy,
      }).catch(() => undefined);
    }
  }

  const policies = await fetchPolicyVersionsNeedingDelta(options.orgId, options.windowStart, options.policyLimit);

  for (const policy of policies) {
    try {
      const policyText = buildPolicyText({
        version: policy.version ?? 0,
        status: policy.status ?? 'unknown',
        summary: policy.summary ?? null,
        diff: policy.diff ?? null,
      });

      if (!policyText) {
        orgSummary.skippedPolicies += 1;
        orgSummary.reviews += 1;
        await recordEmbeddingTelemetry({
          orgId: options.orgId,
          scenario: 'policy_delta',
          decision: 'REVIEW',
          metrics: {
            policyVersionId: policy.id,
            reason: 'no_content',
            lookbackHours: options.lookbackHours,
            delta: true,
          },
          actor: options.initiatedBy,
        });
        continue;
      }

      const chunks = chunkText(policyText, 700);
      if (!chunks.length) {
        orgSummary.skippedPolicies += 1;
        orgSummary.reviews += 1;
        await recordEmbeddingTelemetry({
          orgId: options.orgId,
          scenario: 'policy_delta',
          decision: 'REVIEW',
          metrics: {
            policyVersionId: policy.id,
            reason: 'no_chunks_generated',
            lookbackHours: options.lookbackHours,
            delta: true,
          },
          actor: options.initiatedBy,
        });
        continue;
      }

      const { vectors, usage, model } = await embed(chunks);
      const sourceKey = `policy:${policy.id}`;

      await db.query('BEGIN');
      await db.query('DELETE FROM document_chunks WHERE org_id = $1 AND source = $2', [options.orgId, sourceKey]);
      const insertSql =
        'INSERT INTO document_chunks(org_id, doc_id, chunk_index, content, embedding, source, last_embedded_at) VALUES ($1,$2,$3,$4,$5,$6,now())';
      for (let i = 0; i < chunks.length; i += 1) {
        await db.query(insertSql, [
          options.orgId,
          policy.id,
          i,
          chunks[i],
          vector(vectors[i]),
          sourceKey,
        ]);
      }
      await db.query('COMMIT');

      orgSummary.policiesEmbedded += 1;
      orgSummary.chunksEmbedded += chunks.length;
      orgSummary.tokensConsumed += usage.total_tokens ?? 0;
      orgSummary.approvals += 1;

      await recordEmbeddingTelemetry({
        orgId: options.orgId,
        scenario: 'policy_delta',
        decision: 'APPROVED',
        metrics: {
          policyVersionId: policy.id,
          chunkCount: chunks.length,
          tokens: usage.total_tokens ?? 0,
          promptTokens: usage.prompt_tokens ?? 0,
          model,
          lookbackHours: options.lookbackHours,
          delta: true,
        },
        actor: options.initiatedBy,
      });
    } catch (error) {
      await db.query('ROLLBACK').catch(() => undefined);
      const message = error instanceof Error ? error.message : String(error);
      orgSummary.failures.push({ target: `policy:${policy.id}`, reason: message, orgId: options.orgId });
      orgSummary.refusals += 1;
      await recordEmbeddingTelemetry({
        orgId: options.orgId,
        scenario: 'policy_delta',
        decision: 'REFUSED',
        metrics: {
          policyVersionId: policy.id,
          error: message,
          lookbackHours: options.lookbackHours,
          delta: true,
        },
        actor: options.initiatedBy,
      }).catch(() => undefined);
    }
  }

  return orgSummary;
}

async function reembedDeltaEmbeddings(options: {
  lookbackHours: number;
  documentLimit: number;
  policyLimit: number;
  initiatedBy: string;
  orgIds?: string[];
}): Promise<DeltaEmbeddingSummary> {
  const windowStart = new Date(Date.now() - options.lookbackHours * 60 * 60 * 1000);
  const requestedOrgIds = options.orgIds && options.orgIds.length > 0 ? Array.from(new Set(options.orgIds)) : undefined;

  let orgQuery = supabaseService
    .from('organizations')
    .select('id, slug')
    .order('created_at', { ascending: true });

  if (requestedOrgIds && requestedOrgIds.length > 0) {
    orgQuery = orgQuery.in('id', requestedOrgIds);
  }

  const { data: organizations, error: orgError } = await orgQuery;

  if (orgError) {
    throw orgError;
  }

  const summary: DeltaEmbeddingSummary = {
    lookbackWindowHours: options.lookbackHours,
    organizationsScanned: organizations?.length ?? 0,
    organizationsUpdated: 0,
    documentsEmbedded: 0,
    policiesEmbedded: 0,
    chunksEmbedded: 0,
    tokensConsumed: 0,
    skippedDocuments: 0,
    skippedPolicies: 0,
    approvals: 0,
    reviews: 0,
    refusals: 0,
    failures: [],
    targetOrgIds: requestedOrgIds ?? [],
    organizationBreakdown: [],
  };

  if (requestedOrgIds && requestedOrgIds.length > 0) {
    const discovered = new Set((organizations ?? []).map((org) => org.id));
    for (const requestedOrgId of requestedOrgIds) {
      if (!discovered.has(requestedOrgId)) {
        summary.failures.push({ target: `org:${requestedOrgId}`, reason: 'org_not_found' });
        summary.refusals += 1;
      }
    }
  }

  for (const org of organizations ?? []) {
    try {
      const orgResult = await reembedDeltaForOrg({
        orgId: org.id,
        orgSlug: org.slug,
        windowStart,
        documentLimit: options.documentLimit,
        policyLimit: options.policyLimit,
        initiatedBy: options.initiatedBy,
        lookbackHours: options.lookbackHours,
      });

      const totalUpdates = orgResult.documentsEmbedded + orgResult.policiesEmbedded;
      if (totalUpdates > 0) {
        summary.organizationsUpdated += 1;
      }

      summary.documentsEmbedded += orgResult.documentsEmbedded;
      summary.policiesEmbedded += orgResult.policiesEmbedded;
      summary.chunksEmbedded += orgResult.chunksEmbedded;
      summary.tokensConsumed += orgResult.tokensConsumed;
      summary.skippedDocuments += orgResult.skippedDocuments;
      summary.skippedPolicies += orgResult.skippedPolicies;
      summary.approvals += orgResult.approvals;
      summary.reviews += orgResult.reviews;
      summary.refusals += orgResult.refusals;
      summary.failures.push(
        ...orgResult.failures.map((failure) => (failure.orgId ? failure : { ...failure, orgId: org.id })),
      );

      const { failures: _orgFailures, ...orgSnapshot } = orgResult;
      summary.organizationBreakdown.push({
        orgId: org.id,
        orgSlug: org.slug,
        ...orgSnapshot,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      summary.failures.push({ target: `org:${org.id}`, reason });
      summary.refusals += 1;
      logError('embeddings.delta_org_failed', error, { orgId: org.id, orgSlug: org.slug });
      summary.organizationBreakdown.push({
        orgId: org.id,
        orgSlug: org.slug,
        documentsEmbedded: 0,
        policiesEmbedded: 0,
        chunksEmbedded: 0,
        tokensConsumed: 0,
        skippedDocuments: 0,
        skippedPolicies: 0,
        approvals: 0,
        reviews: 0,
        refusals: 1,
      });
    }
  }

  return summary;
}

function buildPolicyText(policy: { version: number; status: string; summary: string | null; diff: any }): string {
  const parts: string[] = [];
  parts.push(`Policy version ${policy.version} (${policy.status})`);
  if (typeof policy.summary === 'string' && policy.summary.trim()) {
    parts.push(policy.summary.trim());
  }
  if (policy.diff != null) {
    const diffText =
      typeof policy.diff === 'string'
        ? policy.diff
        : (() => {
            try {
              return JSON.stringify(policy.diff, null, 2);
            } catch (err) {
              return String(policy.diff);
            }
          })();
    if (diffText && diffText.trim().length > 0) {
      parts.push(diffText.trim());
    }
  }
  return parts.join('\n\n').trim();
}

async function backfillOrgEmbeddings(options: {
  orgId: string;
  limit: number;
  includePolicies: boolean;
  initiatedBy: string;
}): Promise<BackfillSummary> {
  const summary: BackfillSummary = {
    documentsProcessed: 0,
    policyVersionsProcessed: 0,
    chunksEmbedded: 0,
    tokensConsumed: 0,
    skippedDocuments: 0,
    skippedPolicies: 0,
    failures: [],
  };

  const documents = await fetchDocumentsMissingEmbeddings(options.orgId, options.limit);
  for (const document of documents) {
    try {
      const download = await supabaseService.storage.from('documents').download(document.file_path);
      if (download.error || !download.data) {
        summary.skippedDocuments += 1;
        summary.failures.push({
          target: `document:${document.id}`,
          reason: download.error?.message ?? 'document_download_failed',
        });
        await recordEmbeddingTelemetry({
          orgId: options.orgId,
          scenario: 'document_backfill',
          decision: 'REVIEW',
          metrics: {
            documentId: document.id,
            reason: download.error?.message ?? 'document_download_failed',
          },
          actor: options.initiatedBy,
        });
        continue;
      }

      const arrayBuffer = await download.data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const text = await extractText(buffer, document.file_type ?? 'application/octet-stream');
      const trimmed = text.trim();
      if (!trimmed) {
        summary.skippedDocuments += 1;
        await recordEmbeddingTelemetry({
          orgId: options.orgId,
          scenario: 'document_backfill',
          decision: 'REVIEW',
          metrics: {
            documentId: document.id,
            reason: 'empty_content',
          },
          actor: options.initiatedBy,
        });
        continue;
      }

      const chunks = chunkText(trimmed);
      if (!chunks.length) {
        summary.skippedDocuments += 1;
        await recordEmbeddingTelemetry({
          orgId: options.orgId,
          scenario: 'document_backfill',
          decision: 'REVIEW',
          metrics: {
            documentId: document.id,
            reason: 'no_chunks_generated',
          },
          actor: options.initiatedBy,
        });
        continue;
      }

      const { vectors, usage, model } = await embed(chunks);

      await db.query('BEGIN');
      await db.query('DELETE FROM document_chunks WHERE org_id = $1 AND doc_id = $2', [
        options.orgId,
        document.id,
      ]);
      const insertSql =
        'INSERT INTO document_chunks(org_id, doc_id, chunk_index, content, embedding, source, last_embedded_at) VALUES ($1,$2,$3,$4,$5,$6,now())';
      for (let i = 0; i < chunks.length; i += 1) {
        await db.query(insertSql, [
          options.orgId,
          document.id,
          i,
          chunks[i],
          vector(vectors[i]),
          `document:${document.id}`,
        ]);
      }
      await db.query('COMMIT');

      summary.documentsProcessed += 1;
      summary.chunksEmbedded += chunks.length;
      summary.tokensConsumed += usage.total_tokens ?? 0;

      await recordEmbeddingTelemetry({
        orgId: options.orgId,
        scenario: 'document_backfill',
        decision: 'APPROVED',
        metrics: {
          documentId: document.id,
          chunkCount: chunks.length,
          tokens: usage.total_tokens ?? 0,
          promptTokens: usage.prompt_tokens ?? 0,
          model,
          fileType: document.file_type ?? null,
          backfill: true,
        },
        actor: options.initiatedBy,
      });
    } catch (error) {
      await db.query('ROLLBACK').catch(() => undefined);
      const message = error instanceof Error ? error.message : String(error);
      summary.failures.push({ target: `document:${document.id}`, reason: message });
      await recordEmbeddingTelemetry({
        orgId: options.orgId,
        scenario: 'document_backfill',
        decision: 'REFUSED',
        metrics: {
          documentId: document.id,
          error: message,
        },
        actor: options.initiatedBy,
      }).catch(() => undefined);
    }
  }

  if (options.includePolicies) {
    const { data: policies, error } = await supabaseService
      .from('agent_policy_versions')
      .select('id, version, status, summary, diff')
      .eq('org_id', options.orgId)
      .order('version', { ascending: true })
      .limit(options.limit);

    if (error) {
      throw error;
    }

    for (const policy of policies ?? []) {
      try {
        if (await hasExistingPolicyEmbeddings(options.orgId, policy.id)) {
          summary.skippedPolicies += 1;
          continue;
        }

        const policyText = buildPolicyText({
          version: policy.version ?? 0,
          status: policy.status ?? 'unknown',
          summary: policy.summary ?? null,
          diff: policy.diff ?? null,
        });

        if (!policyText) {
          summary.skippedPolicies += 1;
          continue;
        }

        const chunks = chunkText(policyText, 700);
        if (!chunks.length) {
          summary.skippedPolicies += 1;
          continue;
        }

        const { vectors, usage, model } = await embed(chunks);
        const sourceKey = `policy:${policy.id}`;

        await db.query('BEGIN');
        await db.query('DELETE FROM document_chunks WHERE org_id = $1 AND source = $2', [
          options.orgId,
          sourceKey,
        ]);
        const insertSql =
          'INSERT INTO document_chunks(org_id, doc_id, chunk_index, content, embedding, source, last_embedded_at) VALUES ($1,$2,$3,$4,$5,$6,now())';
        for (let i = 0; i < chunks.length; i += 1) {
          await db.query(insertSql, [
            options.orgId,
            policy.id,
            i,
            chunks[i],
            vector(vectors[i]),
            sourceKey,
          ]);
        }
        await db.query('COMMIT');

        summary.policyVersionsProcessed += 1;
        summary.chunksEmbedded += chunks.length;
        summary.tokensConsumed += usage.total_tokens ?? 0;

        await recordEmbeddingTelemetry({
          orgId: options.orgId,
          scenario: 'policy_backfill',
          decision: 'APPROVED',
          metrics: {
            policyVersionId: policy.id,
            chunkCount: chunks.length,
            tokens: usage.total_tokens ?? 0,
            promptTokens: usage.prompt_tokens ?? 0,
            model,
            backfill: true,
          },
          actor: options.initiatedBy,
        });
      } catch (error) {
        await db.query('ROLLBACK').catch(() => undefined);
        const message = error instanceof Error ? error.message : String(error);
        summary.failures.push({ target: `policy:${policy.id}`, reason: message });
        await recordEmbeddingTelemetry({
          orgId: options.orgId,
          scenario: 'policy_backfill',
          decision: 'REFUSED',
          metrics: {
            policyVersionId: policy.id,
            error: message,
          },
          actor: options.initiatedBy,
        }).catch(() => undefined);
      }
    }
  }

  return summary;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[^]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function normalizeDrivePayload(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch (error) {
      console.warn(
        JSON.stringify({
          level: 'warn',
          msg: 'gdrive.raw_payload_parse_failed',
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      return null;
    }
  }
  if (typeof raw === 'object') {
    return raw as Record<string, unknown>;
  }
  return null;
}

async function fetchDriveMetadataMap(orgId: string, fileIds: string[]): Promise<Map<string, DriveFileMetadata>> {
  const map = new Map<string, DriveFileMetadata>();
  if (!fileIds.length) {
    return map;
  }

  const uniqueIds = Array.from(new Set(fileIds));
  const { data, error } = await supabaseService
    .from('gdrive_file_metadata')
    .select('file_id, metadata, allowlisted_domain')
    .eq('org_id', orgId)
    .in('file_id', uniqueIds);

  if (error) {
    throw error;
  }

  for (const row of data ?? []) {
    map.set(row.file_id, {
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
      allowlisted_domain: row.allowlisted_domain ?? true,
    });
  }

  return map;
}

async function upsertManifestEntries(orgId: string, entries: ManifestEntry[]) {
  if (!entries.length) {
    return;
  }

  const now = new Date().toISOString();
  const payload = entries.map((entry) => ({
    org_id: orgId,
    file_id: entry.fileId,
    metadata: entry.metadata,
    allowlisted_domain: entry.allowlistedDomain,
    updated_at: now,
  }));

  const { error } = await supabaseService
    .from('gdrive_file_metadata')
    .upsert(payload, { onConflict: 'org_id,file_id' });

  if (error) {
    throw error;
  }
}

async function deleteMetadataForFile(orgId: string, fileId: string) {
  const { error } = await supabaseService
    .from('gdrive_file_metadata')
    .delete()
    .eq('org_id', orgId)
    .eq('file_id', fileId);

  if (error) {
    throw error;
  }
}

async function deletePolicyArtifacts(orgId: string, policyVersionId: string) {
  const tables: Array<{ table: string; filterOrg: boolean }> = [
    { table: 'query_hints', filterOrg: true },
    { table: 'citation_canonicalizer', filterOrg: true },
    { table: 'denylist_deboost', filterOrg: true },
  ];

  for (const entry of tables) {
    const base = supabaseService.from(entry.table).delete().eq('policy_version_id', policyVersionId);
    const { error } = entry.filterOrg ? await base.eq('org_id', orgId) : await base;
    if (error) {
      throw error;
    }
  }
}

async function rollbackPolicyVersion(orgId: string, policyVersionId: string, note?: string) {
  const now = new Date().toISOString();
  await deletePolicyArtifacts(orgId, policyVersionId);

  const { error: updateError } = await supabaseService
    .from('agent_policy_versions')
    .update({
      status: 'rolled_back',
      rolled_back_at: now,
      updated_at: now,
      summary: note ?? undefined,
    })
    .eq('id', policyVersionId)
    .eq('org_id', orgId);

  if (updateError) {
    throw updateError;
  }

  await supabaseService.from('learning_signals').insert({
    org_id: orgId,
    run_id: null,
    source: 'api.rollback',
    kind: 'policy_rolled_back',
    payload: { policy_version_id: policyVersionId, note: note ?? null },
  });
}

async function fetchLearningJob(jobId: string): Promise<LearningJob | null> {
  const { data, error } = await supabaseService
    .from('agent_learning_jobs')
    .select('id, org_id, kind, status, payload, result, policy_version_id, created_at, updated_at, processed_at')
    .eq('id', jobId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as LearningJob) ?? null;
}

async function resolveDriveUploaderId(orgId: string): Promise<string> {
  if (driveUploaderCache.has(orgId)) {
    return driveUploaderCache.get(orgId)!;
  }

  const { data, error } = await supabaseService
    .from('memberships')
    .select('user_id, role')
    .eq('org_id', orgId);

  if (error) {
    throw error;
  }

  const members = data ?? [];
  if (members.length === 0) {
    throw new Error('no_memberships_for_org');
  }

  const rolePriority: Record<string, number> = {
    SYSTEM_ADMIN: 3,
    MANAGER: 2,
    EMPLOYEE: 1,
  };

  members.sort((a, b) => (rolePriority[b.role ?? ''] ?? 0) - (rolePriority[a.role ?? ''] ?? 0));
  const uploader = members[0]?.user_id;
  if (!uploader) {
    throw new Error('no_uploader_for_org');
  }

  driveUploaderCache.set(orgId, uploader);
  return uploader;
}

async function markDriveChangeProcessed(changeId: string, errorMessage: string | null) {
  const truncated = errorMessage ? errorMessage.slice(0, 512) : null;
  await supabaseService
    .from('gdrive_change_queue')
    .update({ processed_at: new Date().toISOString(), error: truncated })
    .eq('id', changeId);
}

async function deleteDriveDocument(change: DriveChangeQueueRow): Promise<'deleted' | 'skipped'> {
  const { data: mapping, error } = await supabaseService
    .from('gdrive_documents')
    .select('document_id')
    .eq('org_id', change.org_id)
    .eq('file_id', change.file_id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const documentId = mapping?.document_id;
  if (!documentId) {
    return 'skipped';
  }

  await db.query('BEGIN');
  try {
    await db.query('DELETE FROM document_chunks WHERE doc_id = $1', [documentId]);
    await db.query('DELETE FROM documents WHERE id = $1', [documentId]);
    await db.query('COMMIT');
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }

  const { error: deleteMappingError } = await supabaseService
    .from('gdrive_documents')
    .delete()
    .eq('org_id', change.org_id)
    .eq('file_id', change.file_id);

  if (deleteMappingError) {
    throw deleteMappingError;
  }

  await deleteMetadataForFile(change.org_id, change.file_id);

  return 'deleted';
}

async function upsertDriveDocument(
  change: DriveChangeQueueRow,
  metadataInfo: DriveFileMetadata | null,
): Promise<{ status: 'processed' | 'skipped'; reason?: string }> {
  const enrichedChange: DriveChangeQueueRow = {
    ...change,
    raw_payload: normalizeDrivePayload(change.raw_payload),
  } as DriveChangeQueueRow;

  const download = await downloadDriveFile(enrichedChange);
  const checksum = createHash('sha256').update(download.buffer).digest('hex');
  const fileSize = download.buffer.length;

  const { data: mapping, error: mappingError } = await supabaseService
    .from('gdrive_documents')
    .select('document_id, checksum, metadata')
    .eq('org_id', change.org_id)
    .eq('file_id', change.file_id)
    .maybeSingle();

  if (mappingError) {
    throw mappingError;
  }

  if (mapping?.checksum && mapping.checksum === checksum) {
    const now = new Date().toISOString();
    await supabaseService
      .from('gdrive_documents')
      .update({
        size_bytes: fileSize,
        mime_type: download.mimeType,
        metadata: metadataInfo?.metadata ?? mapping.metadata ?? {},
        last_synced_at: now,
        updated_at: now,
      })
      .eq('org_id', change.org_id)
      .eq('file_id', change.file_id);
    return { status: 'skipped', reason: 'checksum_unchanged' };
  }

  const text = await extractText(download.buffer, download.mimeType);
  const trimmed = text.trim();
  if (!trimmed) {
    return { status: 'skipped', reason: 'empty_text_content' };
  }

  const chunks = chunkText(trimmed);
  if (!chunks.length) {
    return { status: 'skipped', reason: 'no_chunks_generated' };
  }

  const { vectors: embeddings, usage: embeddingUsage, model: embeddingModel } = await embed(chunks);
  const uploaderId = await resolveDriveUploaderId(change.org_id);
  const filePath = `gdrive:${change.file_id}`;
  const fileName = download.fileName;

  let documentId = mapping?.document_id ?? null;

  await db.query('BEGIN');
  try {
    if (!documentId) {
      const inserted = await db.query(
        'INSERT INTO documents(org_id, engagement_id, task_id, name, file_path, file_size, file_type, uploaded_by, created_at) VALUES ($1, NULL, NULL, $2, $3, $4, $5, $6, now()) RETURNING id',
        [change.org_id, fileName, filePath, fileSize, download.mimeType, uploaderId],
      );
      documentId = inserted.rows[0].id as string;
    } else {
      await db.query(
        'UPDATE documents SET name = $1, file_path = $2, file_size = $3, file_type = $4, uploaded_by = $5 WHERE id = $6',
        [fileName, filePath, fileSize, download.mimeType, uploaderId, documentId],
      );
      await db.query('DELETE FROM document_chunks WHERE doc_id = $1', [documentId]);
    }

    const insertChunkSql =
      'INSERT INTO document_chunks(org_id, doc_id, chunk_index, content, embedding, last_embedded_at) VALUES ($1, $2, $3, $4, $5, now())';
    for (let i = 0; i < chunks.length; i += 1) {
      await db.query(insertChunkSql, [change.org_id, documentId, i, chunks[i], vector(embeddings[i])]);
    }

    await db.query('COMMIT');
  } catch (err) {
    await db.query('ROLLBACK');
    await recordEmbeddingTelemetry({
      orgId: change.org_id,
      scenario: 'drive_ingest',
      decision: 'REFUSED',
      metrics: {
        documentId: documentId ?? mapping?.document_id ?? null,
        chunkCount: chunks.length,
        mode: 'changefeed',
        error: err instanceof Error ? err.message : String(err),
      },
      actor: uploaderId,
    });
    throw err;
  }

  await recordEmbeddingTelemetry({
    orgId: change.org_id,
    scenario: 'drive_ingest',
    decision: 'APPROVED',
    metrics: {
      documentId,
      chunkCount: chunks.length,
      tokens: embeddingUsage.total_tokens ?? 0,
      promptTokens: embeddingUsage.prompt_tokens ?? 0,
      model: embeddingModel,
      fileSize,
      mimeType: download.mimeType,
      checksum,
      mode: 'changefeed',
    },
    actor: uploaderId,
  });

  const now = new Date().toISOString();
  if (mapping?.document_id) {
    await supabaseService
      .from('gdrive_documents')
      .update({
        document_id: documentId,
        checksum,
        size_bytes: fileSize,
        mime_type: download.mimeType,
        metadata: metadataInfo?.metadata ?? {},
        last_synced_at: now,
        updated_at: now,
      })
      .eq('org_id', change.org_id)
      .eq('file_id', change.file_id);
  } else {
    await supabaseService.from('gdrive_documents').insert({
      file_id: change.file_id,
      org_id: change.org_id,
      connector_id: change.connector_id,
      document_id,
      checksum,
      size_bytes: fileSize,
      mime_type: download.mimeType,
      metadata: metadataInfo?.metadata ?? {},
      last_synced_at: now,
      updated_at: now,
    });
  }

  return { status: 'processed' };
}

async function handleDriveQueueChange(
  change: DriveChangeQueueRow,
  metadataCache: Map<string, DriveFileMetadata>,
): Promise<{ status: 'processed' | 'skipped' | 'deleted'; reason?: string }> {
  if (isManifestFile(change)) {
    if (change.change_type === 'DELETE') {
      await deleteMetadataForFile(change.org_id, change.file_id);
      return { status: 'skipped', reason: 'manifest_deleted' };
    }

    const download = await downloadDriveFile(change);
    const entries = parseManifestBuffer(download.buffer, download.mimeType);
    if (!entries.length) {
      return { status: 'skipped', reason: 'manifest_empty' };
    }

    await upsertManifestEntries(change.org_id, entries);
    for (const entry of entries) {
      metadataCache.set(entry.fileId, {
        metadata: entry.metadata,
        allowlisted_domain: entry.allowlistedDomain,
      });
    }

    return { status: 'processed', reason: `manifest_entries:${entries.length}` };
  }

  if (change.change_type === 'DELETE') {
    const outcome = await deleteDriveDocument(change);
    return { status: outcome };
  }

  if (!isSupportedDriveMime(change)) {
    return { status: 'skipped', reason: 'unsupported_mime_type' };
  }

  const metadataInfo = metadataCache.get(change.file_id) ?? null;
  if (metadataInfo && metadataInfo.allowlisted_domain === false) {
    return { status: 'skipped', reason: 'allowlisted_domain_false' };
  }

  const result = await upsertDriveDocument(change, metadataInfo ?? null);
  return { status: result.status === 'processed' ? 'processed' : 'skipped', reason: result.reason };
}

async function processDriveQueueEntries(orgId: string, connectorId: string, limit: number) {
  const { data: queue, error } = await supabaseService
    .from('gdrive_change_queue')
    .select('id, org_id, connector_id, file_id, file_name, mime_type, change_type, raw_payload')
    .eq('org_id', orgId)
    .eq('connector_id', connectorId)
    .is('processed_at', null)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  const items = queue ?? [];
  const nonManifestIds = items
    .filter((item) => !isManifestFile(item as DriveChangeQueueRow) && item.change_type !== 'DELETE')
    .map((item) => item.file_id);

  const metadataCache = await fetchDriveMetadataMap(orgId, nonManifestIds);
  let processedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const item of items) {
    const change: DriveChangeQueueRow = {
      ...item,
      raw_payload: normalizeDrivePayload(item.raw_payload),
    } as DriveChangeQueueRow;

    try {
      const result = await handleDriveQueueChange(change, metadataCache);
      const reason = result.reason ?? null;
      await markDriveChangeProcessed(change.id, result.status === 'processed' || result.status === 'deleted' ? null : reason);

      if (result.status === 'processed' || result.status === 'deleted') {
        processedCount += 1;
        logInfo('gdrive.queue_processed', {
          orgId,
          connectorId,
          fileId: change.file_id,
          status: result.status,
          reason,
        });
      } else {
        skippedCount += 1;
        logInfo('gdrive.queue_skipped', {
          orgId,
          connectorId,
          fileId: change.file_id,
          reason,
          metadataPresent: metadataCache.has(change.file_id),
        });
      }
    } catch (err) {
      failedCount += 1;
      const message = err instanceof Error ? err.message : String(err);
      await markDriveChangeProcessed(change.id, message);
      logError('gdrive.queue_failed', err, {
        orgId,
        connectorId,
        fileId: change.file_id,
      });
    }
  }

  return {
    total: items.length,
    processed: processedCount,
    skipped: skippedCount,
    failed: failedCount,
  };
}

function normalizeText(text: string, maxChars = 20000): string {
  const collapsed = text.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= maxChars) {
    return collapsed;
  }
  return collapsed.slice(0, maxChars);
}

function extractResponseText(response: any): string {
  if (!response) return '';
  if (Array.isArray(response.output)) {
    return response.output
      .flatMap((item: any) => item?.content ?? [])
      .map((part: any) => part?.text ?? part?.output_text ?? '')
      .join('\n');
  }
  const output = (response as any)?.output_text;
  if (output) return output;
  const choices = (response as any)?.choices;
  if (Array.isArray(choices) && choices[0]?.message?.content) {
    return choices[0].message.content as string;
  }
  return '';
}

type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high';
type ResponseVerbosity = 'low' | 'medium' | 'high';

function normalizeReasoningEffort(value: unknown): ReasoningEffort | undefined {
  if (typeof value !== 'string') return undefined;
  const candidate = value.toLowerCase();
  return candidate === 'minimal' || candidate === 'low' || candidate === 'medium' || candidate === 'high'
    ? (candidate as ReasoningEffort)
    : undefined;
}

function normalizeVerbosity(value: unknown): ResponseVerbosity | undefined {
  if (typeof value !== 'string') return undefined;
  const candidate = value.toLowerCase();
  return candidate === 'low' || candidate === 'medium' || candidate === 'high'
    ? (candidate as ResponseVerbosity)
    : undefined;
}

type ResponseCitation =
  | { type: 'url'; url: string; title?: string | null; location?: string | null }
  | { type: 'file'; fileId: string; filename?: string | null; location?: string | null };

function extractCitationsFromResponse(response: any): ResponseCitation[] {
  const citations: ResponseCitation[] = [];
  const items = Array.isArray(response?.output) ? response.output : [];
  for (const item of items) {
    if (item?.type !== 'message' || !Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (!Array.isArray(part?.annotations)) continue;
      for (const annotation of part.annotations) {
        if (annotation?.type === 'url_citation' && typeof annotation.url === 'string') {
          citations.push({
            type: 'url',
            url: annotation.url,
            title: annotation.title ?? null,
            location: annotation.location ?? null,
          });
        } else if (annotation?.type === 'file_citation') {
          const fileId = annotation.file_id ?? annotation.fileId;
          if (typeof fileId === 'string' && fileId.length > 0) {
            citations.push({
              type: 'file',
              fileId,
              filename: annotation.filename ?? null,
              location: annotation.location ?? null,
            });
          }
        }
      }
    }
  }
  return citations;
}

type WebSourceSummary = {
  url?: string;
  title?: string;
  snippet?: string;
  domain?: string;
};

function extractWebSearchSources(response: any): WebSourceSummary[] {
  const sources: WebSourceSummary[] = [];
  const items = Array.isArray(response?.output) ? response.output : [];
  for (const item of items) {
    if (item?.type !== 'web_search_call') continue;
    const action = item.action ?? {};
    const callSources = Array.isArray(action?.sources) ? action.sources : Array.isArray(item.sources) ? item.sources : [];
    for (const source of callSources) {
      if (!source) continue;
      sources.push({
        url: typeof source.url === 'string' ? source.url : typeof source.href === 'string' ? source.href : undefined,
        title: typeof source.title === 'string' ? source.title : typeof source.name === 'string' ? source.name : undefined,
        snippet: typeof source.snippet === 'string' ? source.snippet : typeof source.summary === 'string' ? source.summary : undefined,
        domain: typeof source.domain === 'string' ? source.domain : undefined,
      });
    }
  }
  return sources;
}

type FileSearchChunk = {
  fileId: string;
  filename: string;
  score?: number;
  content?: string[];
};

function extractFileSearchResults(response: any): FileSearchChunk[] {
  const results: FileSearchChunk[] = [];
  const items = Array.isArray(response?.output) ? response.output : [];
  for (const item of items) {
    if (item?.type !== 'file_search_call') continue;
    const callResults = Array.isArray(item.results)
      ? item.results
      : Array.isArray(item.search_results)
        ? item.search_results
        : [];
    for (const result of callResults) {
      if (!result) continue;
      const fileId = result.file_id ?? result.fileId;
      if (typeof fileId !== 'string' || fileId.length === 0) continue;
      const content = Array.isArray(result.content)
        ? result.content
            .map((entry: any) => (typeof entry?.text === 'string' ? entry.text : undefined))
            .filter((value: string | undefined): value is string => Boolean(value))
        : [];
      results.push({
        fileId,
        filename: typeof result.filename === 'string' ? result.filename : fileId,
        score: typeof result.score === 'number' ? result.score : undefined,
        content,
      });
    }
  }
  return results;
}

function ensureDomainToolAgent(agentKey: unknown): string | null {
  if (typeof agentKey !== 'string') return null;
  return DOMAIN_TOOL_AGENT_KEYS.has(agentKey) ? agentKey : null;
}

type AttributeAccumulator = {
  types: Set<string>;
  examples: Array<{ value: Primitive; label: string; type: string }>;
  seen: Set<string>;
};

type AttributeSummary = {
  attributes: Array<{ key: string; types: string[]; examples: Array<{ value: Primitive; label: string; type: string }> }>;
  sampledCount: number;
  hasMore: boolean;
  nextCursor: string | null;
};

const MAX_ATTRIBUTE_SAMPLE_SIZE = 200;
const DEFAULT_ATTRIBUTE_SAMPLE_SIZE = 40;
const ATTRIBUTE_PAGE_SIZE = 10;
const MAX_ATTRIBUTE_PAGE_LIMIT = 50;
const DEFAULT_ATTRIBUTE_PAGE_LIMIT = 20;

function clampInteger(value: number, { min, max }: { min: number; max: number }): number {
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function extractQueryValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
    return value[0] as string;
  }
  return undefined;
}

function parseAttributeSampleSizeParam(value: unknown): number | undefined {
  const candidate = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  if (!Number.isFinite(candidate) || candidate <= 0) {
    return undefined;
  }
  return clampInteger(candidate, { min: 1, max: MAX_ATTRIBUTE_SAMPLE_SIZE });
}

function parseAttributePageLimitParam(value: unknown): number | undefined {
  const candidate = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  if (!Number.isFinite(candidate) || candidate <= 0) {
    return undefined;
  }
  return clampInteger(candidate, { min: 1, max: MAX_ATTRIBUTE_PAGE_LIMIT });
}

function describePrimitive(value: Primitive): { label: string; type: string } {
  if (value === null) {
    return { label: 'null', type: 'null' };
  }
  const type = typeof value;
  if (type === 'boolean') {
    return { label: value ? 'true' : 'false', type };
  }
  if (type === 'number') {
    return { label: Number.isFinite(value) ? String(value) : 'NaN', type };
  }
  return { label: value, type };
}

function recordAttributeValue(
  map: Map<string, AttributeAccumulator>,
  key: string,
  value: unknown,
): void {
  const accumulator = map.get(key) ?? {
    types: new Set<string>(),
    examples: [],
    seen: new Set<string>(),
  };

  const valueType = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  accumulator.types.add(valueType);

  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean' || valueType === 'null') {
    const primitiveValue = (value as Primitive) ?? null;
    const serialised = JSON.stringify(primitiveValue);
    if (!accumulator.seen.has(serialised) && accumulator.examples.length < 5) {
      accumulator.seen.add(serialised);
      const { label, type } = describePrimitive(primitiveValue);
      accumulator.examples.push({ value: primitiveValue, label, type });
    }
  }

  map.set(key, accumulator);
}

function normaliseAttributes(attributes: unknown): Record<string, unknown> | null {
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) {
    return null;
  }
  return attributes as Record<string, unknown>;
}

async function summariseVectorStoreAttributes(
  vectorStoreId: string,
  options?: { maxFiles?: number; pageSize?: number; after?: string | null },
): Promise<AttributeSummary> {
  const attributeMap = new Map<string, AttributeAccumulator>();
  const maxFilesToInspect = Math.max(
    1,
    Math.min(options?.maxFiles ?? DEFAULT_ATTRIBUTE_SAMPLE_SIZE, MAX_ATTRIBUTE_SAMPLE_SIZE),
  );
  const pageSize = Math.max(1, Math.min(options?.pageSize ?? ATTRIBUTE_PAGE_SIZE, 50));
  let fetched = 0;
  let cursor = options?.after ?? undefined;
  let nextCursor: string | null = null;
  let hasMore = false;

  try {
    while (fetched < maxFilesToInspect) {
      const limit = Math.min(pageSize, maxFilesToInspect - fetched);
      if (limit <= 0) {
        break;
      }

      const response = await openai.vectorStores.files.list(vectorStoreId, { limit, after: cursor });
      const files = Array.isArray(response?.data) ? response.data : [];
      if (!files.length) {
        cursor = undefined;
        hasMore = false;
        nextCursor = null;
        break;
      }

      for (const file of files) {
        fetched += 1;
        const attributes = normaliseAttributes((file as any)?.attributes ?? (file as any)?.metadata);
        if (!attributes) continue;
        for (const [key, value] of Object.entries(attributes)) {
          recordAttributeValue(attributeMap, key, value);
        }
      }

      const pageHasMore = Boolean(response?.has_more);
      const last = files[files.length - 1];
      const lastId = typeof (last as any)?.id === 'string' ? (last as any).id : undefined;
      const candidateCursor =
        typeof response?.last_id === 'string' ? response.last_id : lastId ?? undefined;

      if (fetched >= maxFilesToInspect) {
        if (pageHasMore && candidateCursor) {
          hasMore = true;
          nextCursor = candidateCursor;
        } else if (pageHasMore) {
          hasMore = true;
          nextCursor = candidateCursor ?? null;
        } else {
          hasMore = false;
          nextCursor = null;
        }
        break;
      }

      if (!pageHasMore || !candidateCursor) {
        hasMore = false;
        nextCursor = null;
        break;
      }

      cursor = candidateCursor;
      hasMore = true;
      nextCursor = candidateCursor;
    }
  } catch (error) {
    logError('domain_tools.vector_store_attribute_discovery_failed', error, { vectorStoreId });
  }

  return {
    attributes: Array.from(attributeMap.entries()).map(([key, accumulator]) => ({
      key,
      types: Array.from(accumulator.types),
      examples: accumulator.examples,
    })),
    sampledCount: fetched,
    hasMore,
    nextCursor,
  };
}

async function listAccessibleVectorStores(options?: { attributeSampleSize?: number }) {
  const attributeSampleSize = Math.max(
    1,
    Math.min(options?.attributeSampleSize ?? DEFAULT_ATTRIBUTE_SAMPLE_SIZE, MAX_ATTRIBUTE_SAMPLE_SIZE),
  );
  const results: Array<{
    id: string;
    name: string | null;
    description: string | null;
    status: string | null;
    fileCount: number | null;
    createdAt: string | null;
    attributeSummary: AttributeSummary;
    metadata: Record<string, unknown> | null;
  }> = [];

  let after: string | undefined;
  const maxPages = 5;

  for (let page = 0; page < maxPages; page += 1) {
    const response = await openai.vectorStores.list({ limit: 20, after });
    const vectorStores = Array.isArray(response?.data) ? response.data : [];
    if (!vectorStores.length) {
      break;
    }

    for (const store of vectorStores) {
      const id = typeof (store as any)?.id === 'string' ? (store as any).id : null;
      if (!id) continue;
      const name = typeof (store as any)?.name === 'string' ? (store as any).name : null;
      const description = typeof (store as any)?.description === 'string' ? (store as any).description : null;
      const status = typeof (store as any)?.status === 'string' ? (store as any).status : null;
      const fileCount = typeof (store as any)?.file_count === 'number'
        ? (store as any).file_count
        : typeof (store as any)?.fileCount === 'number'
          ? (store as any).fileCount
          : null;
      const createdAt = typeof (store as any)?.created_at === 'string'
        ? (store as any).created_at
        : typeof (store as any)?.createdAt === 'string'
          ? (store as any).createdAt
          : null;
      const metadata = normaliseAttributes((store as any)?.metadata);

      const attributeSummary = await summariseVectorStoreAttributes(id, {
        maxFiles: attributeSampleSize,
      });

      results.push({
        id,
        name,
        description,
        status,
        fileCount,
        createdAt,
        attributeSummary,
        metadata,
      });
    }

    if (!response?.has_more) {
      break;
    }

    const last = vectorStores[vectorStores.length - 1];
    const lastId = typeof (last as any)?.id === 'string' ? (last as any).id : undefined;
    after = typeof response?.last_id === 'string' ? response.last_id : lastId;
    if (!after) {
      break;
    }
  }

  return results;
}

async function summariseWebDocument(url: string, text: string): Promise<string> {
  if (!text) return '';

  if (OPENAI_WEB_SEARCH_ENABLED) {
    try {
      const response = await openai.responses.create({
        model: OPENAI_WEB_SEARCH_MODEL,
        input: [
          {
            role: 'system',
            content:
              'You are a Big Four audit partner summarising authoritative accounting, audit, and tax technical content. Always highlight IFRS/ISA/Tax impacts and cite sections where possible.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `Use web search to review ${url} and provide a concise summary (<= 8 bullet points) covering accounting, audit, and tax implications relevant to Malta and IFRS/ISA frameworks.`,
              },
            ],
          },
        ],
        tools: [{ type: 'web_search' }],
        temperature: 0.2,
      });
      await logOpenAIDebugEvent({
        endpoint: 'responses.create',
        response: response as any,
        requestPayload: { url, model: OPENAI_WEB_SEARCH_MODEL, mode: 'web_search' },
        metadata: { source: 'web_summary' },
      });
      const summary = extractResponseText(response)?.trim();
      if (summary) {
        return summary;
      }
    } catch (err) {
      logError('web.harvest_summary_web_search_failed', err, { url });
    }
  }

  try {
    const chat = await createChatCompletion({
      client: openai,
      payload: {
        model: OPENAI_SUMMARY_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'You are a Big Four partner producing concise technical notes. Summaries must emphasise IFRS/ISA/TAX relevance, cite clauses when possible, and flag uncertainties.',
          },
          {
            role: 'user',
            content: `Source URL: ${url}\n\nExtracted Content (truncated):\n${text}\n\nProvide a bullet summary (<= 8 items) covering key accounting, auditing, and tax takeaways for Malta.`,
          },
        ],
      },
      debugLogger: logOpenAIDebugEvent,
      logError,
      metadata: { source: 'web_summary' },
      orgId,
      tags: ['web_summary'],
      requestLogPayload: { url, model: OPENAI_SUMMARY_MODEL },
    });
    const summary = extractResponseText(response)?.trim();
    if (summary) {
      return summary;
    }
  } catch (err) {
    logError('web.harvest_summary_fallback_failed', err, { url });
  }

  return ''; // caller will fallback further
}

async function processWebHarvest(options: {
  runId: string;
  orgId: string;
  agentKind: AgentPersona;
  webSourceId: string;
  knowledgeSourceId: string;
  initiatedBy: string;
}) {
  let transactionStarted = false;
  let existingState: Record<string, any> = {};
  let webSource: WebSourceRow | null = null;
  try {
    const { data: linkRow } = await supabaseService
      .from('knowledge_sources')
      .select('state')
      .eq('id', options.knowledgeSourceId)
      .maybeSingle();
    if (linkRow?.state) {
      existingState = linkRow.state as Record<string, any>;
    }

    webSource = await getWebSource(options.webSourceId);

    await supabaseService
      .from('learning_runs')
      .update({ status: 'processing' })
      .eq('id', options.runId);

    const urlSettings = await getUrlSourceSettings();
    const cacheTtlMs = Math.max(0, urlSettings.fetchPolicy.cacheTtlMinutes) * 60_000;
    await pruneStaleWebCache();
    const cached = await getCachedWebContent(webSource.url);

    let cleaned: string | null = null;
    let usedCache = false;
    let fetchedFresh = false;

    if (cached?.content) {
      const fetchedAt = cached.fetched_at ? Date.parse(cached.fetched_at) : Number.NaN;
      if (!Number.isNaN(fetchedAt) && Date.now() - fetchedAt <= cacheTtlMs) {
        cleaned = cached.content;
        usedCache = true;
        await touchWebCache(cached);
      }
    }

    if (!cleaned) {
      const html = await fetchWebDocument(webSource.url, urlSettings);
      cleaned = normalizeText(stripHtml(html));
      if (!cleaned) {
        throw new Error('Fetched page produced no readable content');
      }
      fetchedFresh = true;
    }

    const summary = await summariseWebDocument(options.orgId, webSource.url, cleaned);
    const chunks = chunkText(cleaned, 700);
    if (chunks.length === 0) {
      throw new Error('No chunks generated from web content');
    }

    const { vectors: embeddings, usage: embeddingUsage, model: embeddingModel } = await embed(chunks);

    await db.query('BEGIN');
    transactionStarted = true;
    const docResult = await db.query(
      'INSERT INTO documents(org_id, name) VALUES ($1, $2) RETURNING id',
      [options.orgId, webSource.title]
    );
    const docId = docResult.rows[0].id;

    const insertChunk =
      'INSERT INTO document_chunks(org_id, doc_id, chunk_index, content, embedding) VALUES ($1,$2,$3,$4,$5)';
    for (let i = 0; i < chunks.length; i++) {
      await db.query(insertChunk, [options.orgId, docId, i, chunks[i], vector(embeddings[i])]);
    }
    await db.query('COMMIT');
    transactionStarted = false;

    if (webSource) {
      await recordEmbeddingTelemetry({
        orgId: options.orgId,
        scenario: 'web_harvest',
        decision: 'APPROVED',
        metrics: {
          documentId: docId,
          chunkCount: chunks.length,
          tokens: embeddingUsage.total_tokens ?? 0,
          promptTokens: embeddingUsage.prompt_tokens ?? 0,
          model: embeddingModel,
          url: webSource.url,
          cacheUsed: usedCache,
        },
        actor: options.initiatedBy,
      });
    }

    const completedState = {
      ...existingState,
      lastRunStatus: 'completed',
      lastRunId: options.runId,
      lastRunAt: new Date().toISOString(),
      lastSummaryLength: summary.length,
      lastRunUsedCache: usedCache,
    };

    if (fetchedFresh) {
      await upsertWebCache(webSource.url, cleaned, {
        fetchedAt: new Date().toISOString(),
        fetchedBy: options.initiatedBy,
        contentLength: cleaned.length,
        summaryLength: summary.length,
      });
    } else if (cached) {
      await touchWebCache(cached, { summaryLength: summary.length });
    }

    await supabaseService.from('knowledge_events').insert([
      {
        org_id: options.orgId,
        run_id: options.runId,
        type: 'INGEST',
        payload: {
          url: webSource.url,
          title: webSource.title,
          summary,
          initiatedBy: options.initiatedBy,
          cacheUsed: usedCache,
        },
      },
      {
        org_id: options.orgId,
        run_id: options.runId,
        type: 'EMBED',
        payload: {
          documentId: docId,
          chunkCount: chunks.length,
          agentKind: options.agentKind,
        },
      },
    ]);

    const finishedAt = new Date().toISOString();
    await supabaseService
      .from('learning_runs')
      .update({
        status: 'completed',
        finished_at: finishedAt,
        stats: {
          summary,
          chunkCount: chunks.length,
          documentId: docId,
          url: webSource.url,
          cacheUsed: usedCache,
        },
      })
      .eq('id', options.runId);

    await supabaseService
      .from('knowledge_sources')
      .update({
        last_sync_at: finishedAt,
        state: completedState,
      })
      .eq('id', options.knowledgeSourceId);

    logInfo('web.harvest_completed', {
      runId: options.runId,
      orgId: options.orgId,
      url: webSource.url,
    });
  } catch (err) {
    if (transactionStarted) {
      await db.query('ROLLBACK').catch(() => undefined);
    }
    await recordEmbeddingTelemetry({
      orgId: options.orgId,
      scenario: 'web_harvest',
      decision: 'REFUSED',
      metrics: {
        chunkCount: chunks.length,
        url: webSource?.url ?? null,
        error: err instanceof Error ? err.message : String(err),
      },
      actor: options.initiatedBy,
    });
    const failureMessage = err instanceof Error ? err.message : String(err);
    const finishedAt = new Date().toISOString();

    await supabaseService
      .from('learning_runs')
      .update({
        status: 'failed',
        finished_at: finishedAt,
        stats: {
          error: failureMessage,
        },
      })
      .eq('id', options.runId);

    await supabaseService.from('knowledge_events').insert({
      org_id: options.orgId,
      run_id: options.runId,
      type: 'EVAL',
      payload: {
        message: 'Web harvest failed',
        error: failureMessage,
      },
    });

    await supabaseService
      .from('knowledge_sources')
      .update({
        state: {
          ...existingState,
          lastRunStatus: 'failed',
          lastRunId: options.runId,
          lastRunAt: finishedAt,
          lastRunError: failureMessage,
        },
      })
      .eq('id', options.knowledgeSourceId);

    logError('web.harvest_failed', err, {
      runId: options.runId,
      webSourceId: options.webSourceId,
    });
  }
}

const AGENT_MODEL = process.env.AGENT_MODEL ?? 'gpt-4.1-mini';

const AGENT_SYSTEM_PROMPTS: Record<'AUDIT' | 'FINANCE' | 'TAX', string> = {
  AUDIT:
    'You are a Big Four audit partner with 30 years of experience (ACCA, CPA). Provide cautious, ISA-compliant guidance for Malta engagements. Cite evidence with document id and chunk index.',
  FINANCE:
    'You are a Big Four accounting and finance partner (ACCA, CFA, PhD). Provide IFRS/IAS compliant advice for Malta organisations. Cite evidence with document id and chunk index.',
  TAX:
    'You are a Malta tax partner (ACCA, CPA). Reference Malta legislation, EU VAT, and CFR guidance. Cite evidence with document id and chunk index and warn about jurisdiction limits.',
};

function buildToolDefinitions() {
  return [
    {
      type: 'function',
      function: {
        name: 'rag_search',
        description:
          'Retrieve authoritative evidence chunks from the organisation knowledge base. Returns JSON with results and citations.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            top_k: { type: 'integer', default: 6 },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'policy_check',
        description:
          'Assess whether the proposed treatment complies with IAS/IFRS/ISA or Malta tax rules. Input should include the drafted conclusion.',
        parameters: {
          type: 'object',
          properties: {
            statement: { type: 'string' },
            domain: { type: 'string' },
          },
          required: ['statement'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'db_read',
        description:
          'Read pre-approved reporting datasets (e.g., trial balance summaries). This is a placeholder and will warn if the dataset is unavailable.',
        parameters: {
          type: 'object',
          properties: {
            query_name: { type: 'string' },
            params: { type: 'object' },
          },
          required: ['query_name'],
        },
      },
    },
  ];
}

async function performRagSearch(orgId: string, queryInput: string, topK = 6) {
  if (OPENAI_FILE_SEARCH_VECTOR_STORE_ID) {
    try {
      const requestedTopK = Number.isFinite(topK) && topK > 0 ? Math.floor(topK) : 6;
      const cappedTopK = OPENAI_FILE_SEARCH_MAX_RESULTS
        ? Math.max(1, Math.min(requestedTopK, OPENAI_FILE_SEARCH_MAX_RESULTS))
        : Math.max(1, requestedTopK);

      const fileSearchResult = await runOpenAiFileSearch({
        client: openai,
        query: queryInput,
        vectorStoreId: OPENAI_FILE_SEARCH_VECTOR_STORE_ID,
        model: OPENAI_FILE_SEARCH_MODEL,
        topK: cappedTopK,
        filters: OPENAI_FILE_SEARCH_FILTERS,
        includeResults: OPENAI_FILE_SEARCH_INCLUDE_RESULTS,
      });

      await logOpenAIDebugEvent({
        endpoint: 'responses.create',
        response: fileSearchResult.rawResponse as any,
        requestPayload: {
          query: queryInput,
          vector_store_id: OPENAI_FILE_SEARCH_VECTOR_STORE_ID,
          topK: cappedTopK,
          filters: OPENAI_FILE_SEARCH_FILTERS ?? null,
          include_results: OPENAI_FILE_SEARCH_INCLUDE_RESULTS,
        },
        metadata: { scope: 'rag_file_search' },
        orgId,
      });

      if (fileSearchResult.items.length > 0) {
        const results = fileSearchResult.items.map((item) => ({
          text: item.text,
          score: item.score,
          citation: item.citation,
        }));

        return {
          output: JSON.stringify({ results }),
          citations: results.map((result) => ({
            documentId: result.citation.documentId,
            chunkIndex: result.citation.chunkIndex,
            source: result.citation.source ?? result.citation.filename ?? result.citation.url ?? null,
            fileId: result.citation.fileId ?? null,
            filename: result.citation.filename ?? null,
            url: result.citation.url ?? null,
          })),
        };
      }
    } catch (error) {
      logError('rag.file_search_failed', error, { orgId });
    }
  }

  const [embedding] = await embed([queryInput]);
  const { rows } = await db.query(
    'SELECT doc_id, chunk_index, content, source, embedding <-> $1 AS distance FROM document_chunks WHERE org_id = $2 ORDER BY embedding <-> $1 LIMIT $3',
    [vector(embedding), orgId, topK]
  );

  const results = rows.map((row: any) => ({
    text: row.content,
    score: 1 - Number(row.distance ?? 0),
    citation: {
      documentId: row.doc_id,
      chunkIndex: row.chunk_index,
      source: row.source ?? null,
    },
  }));

  return {
    output: JSON.stringify({ results }),
    citations: results.map((r) => r.citation),
  };
}

async function performPolicyCheck(orgId: string, statement: string, domain?: string) {
  try {
    const completion = await createChatCompletion({
      client: openai,
      payload: {
        model: OPENAI_SUMMARY_MODEL,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              'You are a technical reviewer ensuring compliance with IFRS/IAS/ISA and Malta CFR guidance. Respond with either PASS, WARNING, or FAIL followed by reasoning.',
          },
          {
            role: 'user',
            content: `Domain: ${domain ?? 'general'}\nStatement:\n${statement}\n\nAssess compliance and cite any standards or regulations referenced. Keep it short (<=4 sentences).`,
          },
        ],
      },
      debugLogger: logOpenAIDebugEvent,
      logError,
      metadata: { scope: 'policy_check', domain: domain ?? 'general' },
      orgId,
      tags: ['policy_check'],
      requestLogPayload: { model: OPENAI_SUMMARY_MODEL, domain: domain ?? 'general' },
    });
    const answer = extractResponseText(response) || 'Policy review unavailable.';
    return { output: answer };
  } catch (err) {
    logError('agent.policy_check_failed', err, {});
    return { output: 'Policy check unavailable due to an internal error.' };
  }
}

async function performDbRead(queryName: string) {
  return {
    output: `Dataset ${queryName} is not yet available. Please check back once financial data pipelines are configured.`,
  };
}

interface AgentToolResult {
  tool_call_id: string;
  output: string;
}

interface AgentRunResult {
  answer: string;
  citations: any[];
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  latencyMs: number;
  toolInvocations: Array<{ name: string; args: Record<string, unknown> }>;
}

async function executeToolCall(orgId: string, call: any) {
  const name = call?.function?.name;
  const rawArgs = call?.function?.arguments ?? '{}';
  let args: any = {};
  try {
    args = JSON.parse(rawArgs);
  } catch (err) {
    logError('agent.tool_parse_failed', err, { name, rawArgs });
    return {
      output: `Unable to parse tool arguments for ${name}.`,
    };
  }

  if (name === 'rag_search') {
    const query = String(args.query ?? '').trim();
    const topK = Number(args.top_k ?? 6);
    if (!query) {
      return { output: 'rag_search requires a query parameter.' };
    }
    const result = await performRagSearch(orgId, query, Number.isFinite(topK) ? topK : 6);
    return { output: result.output, citations: result.citations };
  }

  if (name === 'policy_check') {
    const statement = String(args.statement ?? '').trim();
    if (!statement) {
      return { output: 'policy_check requires a statement.' };
    }
    return await performPolicyCheck(orgId, statement, args.domain ? String(args.domain) : undefined);
  }

  if (name === 'db_read') {
    const queryName = String(args.query_name ?? '').trim();
    if (!queryName) {
      return { output: 'db_read requires a query_name parameter.' };
    }
    return await performDbRead(queryName);
  }

  return { output: `Tool ${name} is not implemented.` };
}

app.post('/api/agent/start', applyExpressIdempotency({
  keyBuilder: (req) => `agent:start:${req.user?.sub}:${req.body?.orgSlug ?? ''}:${req.body?.engagementId ?? ''}:${req.body?.agentType ?? ''}`,
  ttlSeconds: 300,
}), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const { orgSlug, engagementId, agentType } = req.body as {
      orgSlug?: string;
      engagementId?: string | null;
      agentType?: string;
    };

    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }
    if (!agentType) {
      return res.status(400).json({ error: 'agentType is required' });
    }

    const normalizedType = normaliseAgentType(agentType);
    const orgContext = await resolveOrgForUser(userId, orgSlug);

    let openaiThreadId: string | null = null;
    let resolvedAgentId: string | null = null;
    if (isAgentPlatformEnabled()) {
      resolvedAgentId = await resolveOpenAiAgentIdForType(normalizedType);
    }
    const openaiAgentId = resolvedAgentId ?? getOpenAiAgentId();
    if (isAgentPlatformEnabled() && openaiAgentId) {
      openaiThreadId = await createAgentThread({
        openAiApiKey: process.env.OPENAI_API_KEY,
        logError,
      });
    }

    const sessionInsert: Record<string, unknown> = {
      org_id: orgContext.orgId,
      engagement_id: engagementId ?? null,
      agent_type: normalizedType,
      started_by_user_id: userId,
      status: 'RUNNING',
    };

    if (isAgentPlatformEnabled() && openaiAgentId) {
      sessionInsert.openai_agent_id = openaiAgentId;
    }
    if (openaiThreadId) {
      sessionInsert.openai_thread_id = openaiThreadId;
    }

    const { data: session, error: sessionError } = await supabaseService
      .from('agent_sessions')
      .insert(sessionInsert)
      .select('id, openai_thread_id')
      .single();

    if (sessionError || !session) {
      throw sessionError ?? new Error('session_not_created');
    }

    const { error: runError } = await supabaseService.from('agent_runs').insert({
      org_id: orgContext.orgId,
      session_id: session.id,
      step_index: 0,
      state: 'PLANNING',
      summary: 'Session initialised; awaiting plan.',
    });

    if (runError) {
      logError('agent.run_bootstrap_failed', runError, { sessionId: session.id, orgId: orgContext.orgId });
    }

    logInfo('agent.session_started', {
      sessionId: session.id,
      orgId: orgContext.orgId,
      agentType: normalizedType,
      userId,
      openaiThreadId: session.openai_thread_id ?? openaiThreadId ?? null,
    });

    return res.status(201).json({ sessionId: session.id });
  } catch (err) {
    logError('agent.session_start_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'failed to start session' });
  }
});

app.get('/api/agent/stream', async (req: AuthenticatedRequest, res) => {
  if (!OPENAI_STREAMING_ENABLED) {
    return res.status(404).json({ error: 'streaming_disabled' });
  }
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const orgSlug = typeof req.query.orgSlug === 'string' ? (req.query.orgSlug as string) : undefined;
    const question = typeof req.query.question === 'string' ? (req.query.question as string) : undefined;
    const agentTypeRaw = typeof req.query.agentType === 'string' ? (req.query.agentType as string) : 'AUDIT';
    const context = typeof req.query.context === 'string' ? (req.query.context as string) : undefined;
    const engagementId = typeof req.query.engagementId === 'string' ? (req.query.engagementId as string) : undefined;
    const agentSessionId = typeof req.query.agentSessionId === 'string' ? (req.query.agentSessionId as string) : undefined;
    const supabaseRunId = typeof req.query.supabaseRunId === 'string' ? (req.query.supabaseRunId as string) : undefined;

    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug query param required' });
    }
    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: 'question query param required' });
    }

    const normalizedType = normaliseAgentType(agentTypeRaw);
    const orgContext = await resolveOrgForUser(userId, orgSlug);

    const messages = [
      { role: 'system', content: AGENT_SYSTEM_PROMPTS[normalizedType] },
      { role: 'user', content: context ? `${question}\n\nContext:\n${context}` : question },
    ];

    try {
      const conversationRecorder = await AgentConversationRecorder.start({
        orgId: orgContext.orgId,
        orgSlug,
        agentType: normalizedType,
        mode: 'plain',
        systemPrompt: AGENT_SYSTEM_PROMPTS[normalizedType],
        userPrompt: question,
        context: context ?? undefined,
        source: 'agent_stream_plain',
        userId,
        agentSessionId: agentSessionId ?? undefined,
        engagementId: engagementId ?? undefined,
        supabaseRunId: supabaseRunId ?? undefined,
        metadata: {
          question_length: String(question.length),
          context_length: context ? String(context.length) : undefined,
          stream_channel: 'sse',
        },
        logError,
        logInfo,
      });

      let deltaBuffer = '';
      let finalBuffer = '';
      let recorded = false;

      await streamOpenAiResponse({
        res,
        openai,
        payload: {
          model: AGENT_MODEL,
          input: messages,
        },
        endpoint: 'responses.stream',
        onStart: () => {
          const conversationId = conversationRecorder.conversationId;
          if (conversationId) {
            const payload: Record<string, unknown> = { conversationId };
            if (agentSessionId) {
              payload.agentSessionId = agentSessionId;
            }
            if (supabaseRunId) {
              payload.supabaseRunId = supabaseRunId;
            }
            res.write(`data: ${JSON.stringify({ type: 'conversation-started', data: payload })}\n\n`);
          }
        },
        onEvent: async (event) => {
          if (event.type === 'text-delta' && typeof event.data === 'string') {
            deltaBuffer += event.data;
          }
          if (event.type === 'text-done' && typeof event.data === 'string') {
            finalBuffer = event.data;
          }
          if (event.type === 'refusal-delta' && typeof event.data === 'string') {
            deltaBuffer += event.data;
          }
          if (event.type === 'refusal-done') {
            if (typeof event.data === 'string') {
              finalBuffer = event.data;
            } else if (event.data) {
              finalBuffer = JSON.stringify(event.data);
            }
          }
        },
        onResponseCompleted: async ({ responseId }) => {
          if (recorded) return;
          const text = finalBuffer || deltaBuffer;
          if (!text) return;
          try {
            await conversationRecorder.recordPlainText({
              text,
              responseId,
              stage: 'completed',
            });
            recorded = true;
          } catch (error) {
            logError('agent.conversation_plain_record_failed', error, {
              orgId: orgContext.orgId,
              conversationId: conversationRecorder.conversationId,
              responseId,
            });
          }
        },
        onStreamClosed: async () => {
          if (recorded) return;
          const text = finalBuffer || deltaBuffer;
          if (!text) return;
          try {
            await conversationRecorder.recordPlainText({
              text,
              stage: 'closed',
              status: 'completed',
            });
            recorded = true;
          } catch (error) {
            logError('agent.conversation_plain_record_failed', error, {
              orgId: orgContext.orgId,
              conversationId: conversationRecorder.conversationId,
              responseRecordedOnClose: true,
            });
          }
        },
        debugLogger: async (event) => {
          await logOpenAIDebugEvent({
            endpoint: event.endpoint,
            response: event.response,
            requestPayload: event.requestPayload,
            metadata: { ...(event.metadata ?? {}), scope: 'agent_stream', orgSlug },
            orgId: orgContext.orgId,
          });
        },
      });
    } catch (err) {
      logError('agent.stream_failed', err, { orgId: orgContext.orgId });
    }
  } catch (err) {
    logError('agent.stream_initialisation_failed', err, { userId: req.user?.sub });
    if (!res.headersSent) {
      res.status(500).json({ error: 'failed to start stream' });
    }
  }
});

app.get('/api/agent/stream/execute', async (req: AuthenticatedRequest, res) => {
  if (!OPENAI_STREAMING_TOOL_ENABLED) {
    return res.status(404).json({ error: 'streaming_tools_disabled' });
  }

  const writeSse = (event: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const orgSlug = typeof req.query.orgSlug === 'string' ? (req.query.orgSlug as string) : undefined;
    const question = typeof req.query.question === 'string' ? (req.query.question as string) : undefined;
    const agentTypeRaw = typeof req.query.agentType === 'string' ? (req.query.agentType as string) : 'AUDIT';
    const context = typeof req.query.context === 'string' ? (req.query.context as string) : undefined;
    const engagementId = typeof req.query.engagementId === 'string' ? (req.query.engagementId as string) : undefined;

    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug query param required' });
    }
    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: 'question query param required' });
    }

    const normalizedType = normaliseAgentType(agentTypeRaw);
    const orgContext = await resolveOrgForUser(userId, orgSlug);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    let closed = false;
    req.on('close', () => {
      closed = true;
    });

    const tools = buildToolDefinitions();
    const messages = [
      { role: 'system', content: AGENT_SYSTEM_PROMPTS[normalizedType] },
      { role: 'user', content: context ? `${question}\n\nContext:\n${context}` : question },
    ];

    writeSse({
      type: 'started',
      data: {
        question,
        context,
        agentType: normalizedType,
        agentSessionId: agentSessionId ?? undefined,
        supabaseRunId: supabaseRunId ?? undefined,
      },
    });

    const toolNames = tools.map((tool) => tool.function?.name).filter((name): name is string => Boolean(name));
    const conversationRecorder = await AgentConversationRecorder.start({
      orgId: orgContext.orgId,
      orgSlug,
      agentType: normalizedType,
      mode: 'tools',
      systemPrompt: AGENT_SYSTEM_PROMPTS[normalizedType],
      userPrompt: question,
      context: context ?? undefined,
      source: 'agent_stream_tools',
      userId,
      agentSessionId: agentSessionId ?? undefined,
      engagementId: engagementId ?? undefined,
      supabaseRunId: supabaseRunId ?? undefined,
      toolNames,
      metadata: {
        question_length: String(question.length),
        context_length: context ? String(context.length) : undefined,
        stream_channel: 'sse',
        tool_count: toolNames.length ? String(toolNames.length) : undefined,
      },
      logError,
      logInfo,
    });
    const conversationId = conversationRecorder.conversationId;
    if (conversationId) {
      const payload: Record<string, unknown> = { conversationId };
      if (agentSessionId) {
        payload.agentSessionId = agentSessionId;
      }
      if (supabaseRunId) {
        payload.supabaseRunId = supabaseRunId;
      }
      writeSse({ type: 'conversation-started', data: payload });
    }

    let response = await openai.responses.create({
      model: AGENT_MODEL,
      input: messages,
      tools,
    });

    let iteration = 0;
    await conversationRecorder.recordResponse({ response, stage: 'initial', iteration });
    iteration += 1;

    await logOpenAIDebugEvent({
      endpoint: 'responses.create',
      response: response as any,
      requestPayload: { model: AGENT_MODEL, messages, tools },
      metadata: { scope: 'agent_stream_tools', stage: 'initial' },
      orgId: orgContext.orgId,
    });

    while (response.output?.some((item: any) => item.type === 'tool_call')) {
      if (closed) break;
      const toolOutputs: any[] = [];
      for (const item of response.output ?? []) {
        if (item.type !== 'tool_call') continue;
        const call = item;
        const toolKey = call.function?.name ?? 'unknown';
        writeSse({ type: 'tool-start', data: { toolKey, callId: call.id } });
        try {
          const result = await executeToolCall(orgContext.orgId, call);
          writeSse({ type: 'tool-result', data: { toolKey, callId: call.id, output: result.output, citations: result.citations ?? [] } });
          toolOutputs.push({ tool_call_id: call.id, output: result.output });
          await conversationRecorder.recordToolResult({
            callId: call.id,
            toolName: toolKey,
            output: result.output,
            stage: 'tool_execution',
            status: 'completed',
          });
        } catch (error) {
          writeSse({ type: 'tool-error', data: { toolKey, callId: call.id, message: error instanceof Error ? error.message : String(error) } });
          const failureMessage = error instanceof Error ? error.message : String(error);
          toolOutputs.push({ tool_call_id: call.id, output: `Tool ${toolKey} failed: ${failureMessage}` });
          await conversationRecorder.recordToolResult({
            callId: call.id,
            toolName: toolKey,
            output: failureMessage,
            stage: 'tool_execution',
            status: 'failed',
          });
        }
      }

      if (toolOutputs.length === 0) {
        break;
      }

      response = await openai.responses.create({
        model: AGENT_MODEL,
        response_id: response.id,
        tool_outputs: toolOutputs,
      });

      await logOpenAIDebugEvent({
        endpoint: 'responses.create',
        response: response as any,
        requestPayload: { model: AGENT_MODEL, response_id: response.id, tool_outputs: toolOutputs },
        metadata: { scope: 'agent_stream_tools', stage: 'followup' },
        orgId: orgContext.orgId,
      });

      await conversationRecorder.recordResponse({ response, stage: 'followup', iteration });
      iteration += 1;
    }

    if (!closed) {
      const answer = extractResponseText(response) || 'No answer generated.';
      writeSse({ type: 'text-final', data: answer });
      if (response.usage) {
        writeSse({ type: 'usage', data: response.usage });
      }
      writeSse({ type: 'completed', data: { responseId: response.id } });
      writeSse({ type: 'done' });
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } catch (err) {
    logError('agent.stream_execute_failed', err, {});
    if (!res.headersSent) {
      res.status(500).json({ error: 'failed to stream execution' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', data: { message: err instanceof Error ? err.message : String(err) } })}\n\n`);
      res.end();
    }
  }
});

app.get('/api/agent/conversations', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const orgSlug = typeof req.query.orgSlug === 'string' ? req.query.orgSlug : undefined;
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug query param required' });
    }

    const orderParam = typeof req.query.order === 'string' && req.query.order.toLowerCase() === 'asc' ? 'asc' : 'desc';
    const limitParam = Number(req.query.limit ?? 20);
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(100, limitParam)) : 20;
    const after = typeof req.query.after === 'string' ? req.query.after : undefined;

    const orgContext = await resolveOrgForUser(userId, orgSlug);

    const response = await listConversations({
      limit,
      order: orderParam,
      after,
      logError,
      logInfo,
    });

    const modeFilter = typeof req.query.mode === 'string' && req.query.mode !== 'all' ? req.query.mode : undefined;
    const agentTypeFilter = typeof req.query.agentType === 'string' && req.query.agentType !== 'all' ? req.query.agentType : undefined;
    const sourceFilter = typeof req.query.source === 'string' && req.query.source !== 'all' ? req.query.source : undefined;
    const sinceFilter = typeof req.query.since === 'string' ? req.query.since : undefined;
    const searchFilter = typeof req.query.search === 'string' && req.query.search.trim().length > 0 ? req.query.search.trim().toLowerCase() : undefined;
    const hasContextFilter = typeof req.query.hasContext === 'string' && req.query.hasContext !== 'any' ? req.query.hasContext : undefined;
    const mineOnly = req.query.mine === '1' || req.query.mine === 'true';

    let sinceTimestamp: number | undefined;
    if (sinceFilter && sinceFilter !== 'all') {
      const nowSeconds = Math.floor(Date.now() / 1000);
      switch (sinceFilter) {
        case '24h':
          sinceTimestamp = nowSeconds - 24 * 60 * 60;
          break;
        case '7d':
          sinceTimestamp = nowSeconds - 7 * 24 * 60 * 60;
          break;
        case '30d':
          sinceTimestamp = nowSeconds - 30 * 24 * 60 * 60;
          break;
        default:
          sinceTimestamp = undefined;
      }
    }

    const conversations = (response.data ?? []).filter((conversation) => {
      const metadata = conversation.metadata ?? {};
      if (metadata.org_id !== orgContext.orgId) {
        return false;
      }
      if (modeFilter && metadata.mode !== modeFilter) {
        return false;
      }
      if (agentTypeFilter && metadata.agent_type !== agentTypeFilter) {
        return false;
      }
      if (sourceFilter && metadata.source !== sourceFilter) {
        return false;
      }
      if (sinceTimestamp && typeof conversation.created_at === 'number' && conversation.created_at < sinceTimestamp) {
        return false;
      }
      if (mineOnly) {
        if (!metadata.user_id) {
          return false;
        }
        if (metadata.user_id !== userId) {
          return false;
        }
      }
      if (hasContextFilter === 'true') {
        if (metadata.has_context !== 'true' && metadata.context_present !== 'true') {
          return false;
        }
      } else if (hasContextFilter === 'false') {
        if (metadata.has_context === 'true' || metadata.context_present === 'true') {
          return false;
        }
      }
      if (searchFilter) {
        const haystack = [
          conversation.id,
          metadata.initial_prompt_preview ?? '',
          metadata.agent_type ?? '',
          metadata.mode ?? '',
          metadata.source ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(searchFilter)) {
          return false;
        }
      }

      return true;
    });

    return res.json({
      conversations,
      hasMore: response.has_more ?? false,
      lastId: response.last_id ?? null,
    });
  } catch (error) {
    logError('agent.conversations_list_failed', error, { userId: req.user?.sub });
    return res.status(500).json({ error: 'failed_to_list_conversations' });
  }
});

app.post('/api/agent/conversations', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const body = req.body as {
      orgSlug?: string;
      agentType?: string;
      question?: string;
      context?: string;
      mode?: string;
      metadata?: Record<string, string>;
      engagementId?: string;
      source?: string;
      toolNames?: string[];
    };

    if (!body.orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }
    if (!body.question || body.question.trim().length === 0) {
      return res.status(400).json({ error: 'question is required' });
    }

    const normalizedType = normaliseAgentType(body.agentType ?? 'AUDIT');
    const orgContext = await resolveOrgForUser(userId, body.orgSlug);

    const recorder = await AgentConversationRecorder.start({
      orgId: orgContext.orgId,
      orgSlug: body.orgSlug,
      agentType: normalizedType,
      mode: body.mode ?? 'manual',
      systemPrompt: AGENT_SYSTEM_PROMPTS[normalizedType],
      userPrompt: body.question.trim(),
      context: body.context?.trim() ? body.context.trim() : undefined,
      source: body.source ?? 'agent_manual',
      metadata: body.metadata,
      userId,
      engagementId: body.engagementId?.trim() ? body.engagementId.trim() : undefined,
      toolNames: Array.isArray(body.toolNames)
        ? body.toolNames
            .filter((value): value is string => typeof value === 'string')
            .map((value) => value.trim())
            .filter((value) => value.length > 0)
        : undefined,
      logError,
      logInfo,
    });

    const conversation = recorder.getConversation();
    if (!conversation) {
      return res.status(500).json({ error: 'failed_to_create_conversation' });
    }

    return res.status(201).json({ conversation });
  } catch (error) {
    logError('agent.conversation_create_route_failed', error, { userId: req.user?.sub });
    return res.status(500).json({ error: 'failed_to_create_conversation' });
  }
});

app.get('/api/agent/conversations/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const orgSlug = typeof req.query.orgSlug === 'string' ? req.query.orgSlug : undefined;
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug query param required' });
    }

    const orgContext = await resolveOrgForUser(userId, orgSlug);
    const conversationId = req.params.id;

    const conversation = await getConversation({
      conversationId,
      logError,
      logInfo,
    });

    if (conversation.metadata?.org_id !== orgContext.orgId) {
      return res.status(404).json({ error: 'conversation_not_found' });
    }

    return res.json({ conversation });
  } catch (error) {
    logError('agent.conversation_fetch_failed', error, { userId: req.user?.sub, conversationId: req.params.id });
    return res.status(500).json({ error: 'failed_to_fetch_conversation' });
  }
});

app.get('/api/agent/conversations/:id/items', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const orgSlug = typeof req.query.orgSlug === 'string' ? req.query.orgSlug : undefined;
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug query param required' });
    }

    const orgContext = await resolveOrgForUser(userId, orgSlug);
    const conversationId = req.params.id;

    const conversation = await getConversation({
      conversationId,
      logError,
      logInfo,
    });

    if (conversation.metadata?.org_id !== orgContext.orgId) {
      return res.status(404).json({ error: 'conversation_not_found' });
    }

    const limitParam = Number(req.query.limit ?? 50);
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(100, limitParam)) : 50;
    const orderParam = typeof req.query.order === 'string' && req.query.order.toLowerCase() === 'asc' ? 'asc' : 'desc';
    const after = typeof req.query.after === 'string' ? req.query.after : undefined;
    const includeParam = req.query.include;
    const include = Array.isArray(includeParam)
      ? includeParam.filter((value): value is string => typeof value === 'string')
      : typeof includeParam === 'string'
        ? [includeParam]
        : undefined;

    const itemsResponse = await listConversationItems({
      conversationId,
      limit,
      order: orderParam,
      after,
      include,
      logError,
      logInfo,
    });

    return res.json({
      conversation,
      items: itemsResponse.data ?? [],
      hasMore: itemsResponse.has_more ?? false,
      lastId: itemsResponse.last_id ?? null,
    });
  } catch (error) {
    logError('agent.conversation_items_fetch_failed', error, { userId: req.user?.sub, conversationId: req.params.id });
    return res.status(500).json({ error: 'failed_to_fetch_conversation_items' });
  }
});

app.post('/api/agent/conversations/:id/items', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const body = req.body as { orgSlug?: string; items?: ConversationItemInput[] };
    if (!body.orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

    const orgContext = await resolveOrgForUser(userId, body.orgSlug);
    const conversationId = req.params.id;

    const conversation = await getConversation({
      conversationId,
      logError,
      logInfo,
    });

    if (conversation.metadata?.org_id !== orgContext.orgId) {
      return res.status(404).json({ error: 'conversation_not_found' });
    }

    const response = await createConversationItems({
      conversationId,
      items: body.items,
      logError,
      logInfo,
    });

    return res.status(201).json({ items: response.data ?? [] });
  } catch (error) {
    logError('agent.conversation_items_create_failed', error, { userId: req.user?.sub, conversationId: req.params.id });
    return res.status(500).json({ error: 'failed_to_create_conversation_items' });
  }
});

app.delete('/api/agent/conversations/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const orgSlug = typeof req.query.orgSlug === 'string' ? req.query.orgSlug : undefined;
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug query param required' });
    }

    const orgContext = await resolveOrgForUser(userId, orgSlug);
    const conversationId = req.params.id;

    const conversation = await getConversation({
      conversationId,
      logError,
      logInfo,
    });

    if (conversation.metadata?.org_id !== orgContext.orgId) {
      return res.status(404).json({ error: 'conversation_not_found' });
    }

    const response = await deleteConversation({
      conversationId,
      logError,
      logInfo,
    });

    return res.json({ deleted: response.deleted, conversationId });
  } catch (error) {
    logError('agent.conversation_delete_failed', error, { userId: req.user?.sub, conversationId: req.params.id });
    return res.status(500).json({ error: 'failed_to_delete_conversation' });
  }
});

app.post('/api/agent/realtime/session', async (req: AuthenticatedRequest, res) => {
  if (!OPENAI_REALTIME_ENABLED) {
    return res.status(404).json({ error: 'realtime_disabled' });
  }
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const { orgSlug, agentSessionId, voice } = req.body as { orgSlug?: string; agentSessionId?: string; voice?: string };
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }

    const orgContext = await resolveOrgForUser(userId, orgSlug);
    if (!agentSessionId) {
      return res.status(400).json({ error: 'agentSessionId is required' });
    }

    const agentSession = await loadAgentSessionForUser(userId, agentSessionId);

    const turnServers = getRealtimeTurnServers();

    const session = await createRealtimeSession({
      openAiApiKey: process.env.OPENAI_API_KEY,
      voice,
      sessionMetadata: {
        agentSessionId,
        orgId: orgContext.orgId,
        userId,
      },
      turnServers,
      logError,
      logInfo,
    });

    const resolvedSessionId = session.id ?? randomUUID();

    await upsertChatkitSession({
      supabase: supabaseService,
      agentSessionId: agentSession.id,
      chatkitSessionId: resolvedSessionId,
      metadata: {
        clientSecret: session.client_secret?.value ?? null,
        expiresAt: session.expires_at ?? null,
        voice: voice ?? null,
        turnServers,
      },
    });

    return res.json({
      clientSecret: session.client_secret?.value,
      sessionId: resolvedSessionId,
      expiresAt: session.expires_at ?? null,
      turnServers,
    });
  } catch (err) {
    logError('agent.realtime_session_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'failed_to_create_realtime_session' });
  }
});

app.post('/api/agent/chatkit/session', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const { agentSessionId, chatkitSessionId, metadata } = req.body as {
      agentSessionId?: string;
      chatkitSessionId?: string;
      metadata?: Record<string, unknown>;
    };

    if (!agentSessionId || !chatkitSessionId) {
      return res.status(400).json({ error: 'agentSessionId and chatkitSessionId are required' });
    }

    await loadAgentSessionForUser(userId, agentSessionId);
    const session = await upsertChatkitSession({
      supabase: supabaseService,
      agentSessionId,
      chatkitSessionId,
      metadata,
    });

    return res.status(201).json({ session });
  } catch (error) {
    logError('chatkit.session_create_failed', error, { userId: req.user?.sub });
    const status = (error as any)?.status ?? 500;
    return res.status(status).json({ error: 'failed_to_create_chatkit_session' });
  }
});

app.get('/api/agent/chatkit/session/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const chatkitSessionId = req.params.id;
    if (!chatkitSessionId) {
      return res.status(400).json({ error: 'chatkit_session_id_required' });
    }

    const existing = await fetchChatkitSession(supabaseService, chatkitSessionId);
    if (!existing) {
      return res.status(404).json({ error: 'chatkit_session_not_found' });
    }

    await loadAgentSessionForUser(userId, existing.agent_session_id);
    return res.json({ session: existing });
  } catch (error) {
    logError('chatkit.session_load_failed', error, { userId: req.user?.sub, chatkitSessionId: req.params.id });
    const status = (error as any)?.status ?? 500;
    return res.status(status).json({ error: 'failed_to_load_chatkit_session' });
  }
});

app.post('/api/agent/chatkit/session/:id/cancel', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const chatkitSessionId = req.params.id;
    const existing = await fetchChatkitSession(supabaseService, chatkitSessionId);
    if (!existing) {
      return res.status(404).json({ error: 'chatkit_session_not_found' });
    }

    await loadAgentSessionForUser(userId, existing.agent_session_id);
    const session = await cancelChatkitSession({ supabase: supabaseService, chatkitSessionId });
    return res.json({ session });
  } catch (error) {
    logError('chatkit.session_cancel_failed', error, { userId: req.user?.sub, chatkitSessionId: req.params.id });
    const status = (error as any)?.status ?? 500;
    return res.status(status).json({ error: 'failed_to_cancel_chatkit_session' });
  }
});

app.post('/api/agent/chatkit/session/:id/resume', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const chatkitSessionId = req.params.id;
    const { metadata } = req.body as { metadata?: Record<string, unknown> };

    const existing = await fetchChatkitSession(supabaseService, chatkitSessionId);
    if (!existing) {
      return res.status(404).json({ error: 'chatkit_session_not_found' });
    }

    await loadAgentSessionForUser(userId, existing.agent_session_id);
    const session = await resumeChatkitSession({
      supabase: supabaseService,
      agentSessionId: existing.agent_session_id,
      chatkitSessionId,
      metadata,
    });
    return res.json({ session });
  } catch (error) {
    logError('chatkit.session_resume_failed', error, { userId: req.user?.sub, chatkitSessionId: req.params.id });
    const status = (error as any)?.status ?? 500;
    return res.status(status).json({ error: 'failed_to_resume_chatkit_session' });
  }
});

app.post('/api/agent/chatkit/session/:id/transcribe', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const chatkitSessionId = req.params.id;
    const body = req.body as {
      audio?: string;
      mimeType?: string;
      language?: string;
      model?: string;
      instructions?: string;
      metadata?: Record<string, unknown>;
    };

    if (typeof body?.audio !== 'string' || body.audio.trim().length === 0) {
      return res.status(400).json({ error: 'audio (base64) is required' });
    }

    const existing = await fetchChatkitSession(supabaseService, chatkitSessionId);
    if (!existing) {
      return res.status(404).json({ error: 'chatkit_session_not_found' });
    }

    await loadAgentSessionForUser(userId, existing.agent_session_id);

    let audioBuffer: Buffer;
    try {
      audioBuffer = decodeBase64Audio(body.audio.trim());
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'invalid_audio_payload' });
    }

    const transcription = await transcribeAudioBuffer({
      audio: audioBuffer,
      mimeType: typeof body.mimeType === 'string' ? body.mimeType : undefined,
      fileName: inferAudioFileName(body.mimeType),
      model: typeof body.model === 'string' ? body.model : undefined,
      language: typeof body.language === 'string' ? body.language : undefined,
      logInfo,
      logError,
    });

    await recordChatkitTranscript({
      supabase: supabaseService,
      chatkitSessionId,
      role: 'user',
      transcript: transcription.text,
      metadata: {
        source: 'speech-to-text',
        mimeType: body.mimeType ?? null,
        model: transcription.model,
        language: transcription.language ?? body.language ?? null,
        duration: transcription.duration ?? null,
        audioBytes: audioBuffer.byteLength,
        ...(body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {}),
      },
    });

    return res.json({
      transcript: transcription.text,
      model: transcription.model,
      language: transcription.language ?? null,
      duration: transcription.duration ?? null,
      usage: transcription.usage ?? null,
    });
  } catch (error) {
    logError('chatkit.session_transcribe_failed', error, { userId: req.user?.sub, chatkitSessionId: req.params.id });
    const status = (error as any)?.status ?? 500;
    return res.status(status).json({ error: 'failed_to_transcribe_audio' });
  }
});

app.post('/api/agent/chatkit/session/:id/tts', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const chatkitSessionId = req.params.id;
    const body = req.body as {
      text?: string;
      voice?: string;
      model?: string;
      format?: string;
      metadata?: Record<string, unknown>;
    };

    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    if (!text) {
      return res.status(400).json({ error: 'text is required for TTS' });
    }

    const existing = await fetchChatkitSession(supabaseService, chatkitSessionId);
    if (!existing) {
      return res.status(404).json({ error: 'chatkit_session_not_found' });
    }

    await loadAgentSessionForUser(userId, existing.agent_session_id);

    const speech = await synthesizeSpeech({
      text,
      voice: typeof body.voice === 'string' ? body.voice : undefined,
      model: typeof body.model === 'string' ? body.model : undefined,
      format: typeof body.format === 'string' ? (body.format as any) : undefined,
      logInfo,
      logError,
    });

    const audioBase64 = speech.audio.toString('base64');

    await recordChatkitTranscript({
      supabase: supabaseService,
      chatkitSessionId,
      role: 'assistant',
      transcript: text,
      metadata: {
        source: 'text-to-speech',
        voice: speech.voice,
        model: speech.model,
        format: speech.format,
        audioBytes: speech.audio.byteLength,
        ...(body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {}),
      },
    });

    return res.json({
      audio: audioBase64,
      format: speech.format,
      model: speech.model,
      voice: speech.voice,
    });
  } catch (error) {
    logError('chatkit.session_tts_failed', error, { userId: req.user?.sub, chatkitSessionId: req.params.id });
    const status = (error as any)?.status ?? 500;
    return res.status(status).json({ error: 'failed_to_generate_speech' });
  }
});

app.get('/api/agent/chatkit/session/:id/transcripts', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const chatkitSessionId = req.params.id;
    const existing = await fetchChatkitSession(supabaseService, chatkitSessionId);
    if (!existing) {
      return res.status(404).json({ error: 'chatkit_session_not_found' });
    }

    await loadAgentSessionForUser(userId, existing.agent_session_id);

    const limitCandidate = typeof req.query.limit === 'string' ? Number(req.query.limit) : Number.NaN;
    const limit = Number.isFinite(limitCandidate) ? Math.min(500, Math.max(1, Math.floor(limitCandidate))) : 200;

    const rows = await listChatkitTranscripts(supabaseService, chatkitSessionId, limit);
    const transcripts = rows.map((row) => ({
      id: row.id,
      chatkitSessionId: row.chatkit_session_id,
      role: row.role,
      transcript: row.transcript,
      metadata: row.metadata ?? {},
      createdAt: row.created_at,
    }));

    return res.json({ transcripts });
  } catch (error) {
    logError('chatkit.session_transcripts_fetch_failed', error, { userId: req.user?.sub, chatkitSessionId: req.params.id });
    const status = (error as any)?.status ?? 500;
    return res.status(status).json({ error: 'failed_to_fetch_transcripts' });
  }
});

app.post('/api/agent/media/video', async (req: AuthenticatedRequest, res) => {
  if (!OPENAI_SORA_ENABLED) {
    return res.status(404).json({ error: 'sora_disabled' });
  }

  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const { orgSlug, prompt, aspectRatio } = req.body as { orgSlug?: string; prompt?: string; aspectRatio?: string };
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }
    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    await resolveOrgForUser(userId, orgSlug); // ensures membership

    const job = await generateSoraVideo({
      prompt: prompt.trim(),
      aspectRatio: aspectRatio?.trim(),
      openAiApiKey: process.env.OPENAI_API_KEY,
      logError,
      logInfo,
    });

    return res.status(202).json({ job });
  } catch (err) {
    logError('agent.sora_video_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'video_generation_failed' });
  }
});

function isStreamingRequested(rawPayload: unknown): boolean {
  if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
    return false;
  }

  if (!('stream' in rawPayload)) {
    return false;
  }

  const streamValue = (rawPayload as Record<string, unknown>).stream;
  const parsed = parseBooleanFlag(streamValue);
  return parsed === true;
}

function normaliseChatCompletionCreatePayload(
  rawPayload: unknown,
  options?: { streaming?: boolean },
): ChatCompletionCreateParamsNonStreaming | ChatCompletionCreateParamsStreaming | null {
  if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
    return null;
  }

  const cloned = JSON.parse(JSON.stringify(rawPayload)) as Record<string, unknown>;
  if (Array.isArray(cloned.messages) === false) {
    return null;
  }

  const model = typeof cloned.model === 'string' ? cloned.model.trim() : '';
  if (!model) {
    return null;
  }

  cloned.model = model;

  if (options?.streaming) {
    cloned.stream = true;
    return cloned as ChatCompletionCreateParamsStreaming;
  }

  if ('stream' in cloned) {
    delete cloned.stream;
  }

  if ('store' in cloned) {
    cloned.store = Boolean(cloned.store);
  }

  return cloned as ChatCompletionCreateParamsNonStreaming;
}

function parseMetadataRecord(input: unknown): Record<string, unknown> | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return undefined;
  }
  return input as Record<string, unknown>;
}

function parseStringArray(input: unknown): string[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const tags = Array.from(
    new Set(
      input
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter((entry): entry is string => entry.length > 0),
    ),
  );
  return tags.length > 0 ? tags : undefined;
}

function parseQuotaTag(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildChatCompletionListQuery(query: Record<string, unknown>): ChatCompletionListParams {
  const params: ChatCompletionListParams = {};
  if (typeof query.after === 'string' && query.after.trim().length > 0) {
    params.after = query.after.trim();
  }
  if (typeof query.limit === 'string') {
    const limitValue = Number(query.limit);
    if (Number.isFinite(limitValue)) {
      params.limit = Math.max(1, Math.min(100, Math.floor(limitValue)));
    }
  }
  if (typeof query.model === 'string' && query.model.trim().length > 0) {
    params.model = query.model.trim();
  }
  return params;
}

function buildChatCompletionMessagesQuery(query: Record<string, unknown>): MessageListParams {
  const params: MessageListParams = {};
  if (typeof query.after === 'string' && query.after.trim().length > 0) {
    params.after = query.after.trim();
  }
  if (typeof query.limit === 'string') {
    const limitValue = Number(query.limit);
    if (Number.isFinite(limitValue)) {
      params.limit = Math.max(1, Math.min(200, Math.floor(limitValue)));
    }
  }
  if (typeof query.order === 'string') {
    const order = query.order.trim().toLowerCase();
    if (order === 'asc' || order === 'desc') {
      params.order = order as 'asc' | 'desc';
    }
  }
  return params;
}

app.post('/api/openai/chat-completions', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const body = req.body as Record<string, unknown> | undefined;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'invalid_request_body' });
    }

    const orgSlugRaw = body.orgSlug;
    const orgSlug = typeof orgSlugRaw === 'string' ? orgSlugRaw.trim() : '';
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }

    const streamingRequested = isStreamingRequested(body.payload);
    const payload = normaliseChatCompletionCreatePayload(body.payload, { streaming: streamingRequested });
    if (!payload) {
      return res.status(400).json({ error: 'payload must include model and messages' });
    }

    const orgContext = await resolveOrgForUser(userId, orgSlug);

    const metadata = parseMetadataRecord(body.metadata);
    const tags = parseStringArray(body.tags);
    const quotaTag = parseQuotaTag(body.quotaTag);
    const requestLogPayload =
      body.requestLogPayload && typeof body.requestLogPayload === 'object'
        ? (body.requestLogPayload as Record<string, unknown>)
        : { model: payload.model };

    const metadataWithOrg = { ...(metadata ?? {}), orgSlug };

    if (streamingRequested) {
      logInfo('openai.chat_completion_streaming_request', {
        userId,
        orgSlug,
        requestId: req.requestId,
      });

      res.status(200);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const cleanupCallbacks: Array<() => void> = [];
      let clientClosed = false;
      let streamStatus: 'pending' | 'completed' | 'client_disconnect' | 'error' = 'pending';
      const streamStartedAt = Date.now();
      let firstChunkAt: number | null = null;
      let lastChunkAt: number | null = null;
      let chunkCount = 0;
      let totalChunkBytes = 0;
      let chunkIntervalTotal = 0;
      let chunkIntervalCount = 0;
      let chunkIntervalMin: number | null = null;
      let chunkIntervalMax = 0;
      let heartbeatCount = 0;
      let lastHeartbeatAt: number | null = null;
      let heartbeatTimer: NodeJS.Timeout | null = null;
      const heartbeatIntervalMs = CHAT_COMPLETIONS_STREAM_HEARTBEAT_INTERVAL_MS;

      const recordChunkMetrics = (chunk: ChatCompletionChunk) => {
        const now = Date.now();
        const chunkString = JSON.stringify(chunk);
        chunkCount += 1;
        totalChunkBytes += Buffer.byteLength(chunkString, 'utf8');
        if (firstChunkAt === null) {
          firstChunkAt = now;
        }
        if (lastChunkAt !== null) {
          const delta = now - lastChunkAt;
          chunkIntervalTotal += delta;
          chunkIntervalCount += 1;
          chunkIntervalMax = Math.max(chunkIntervalMax, delta);
          chunkIntervalMin = chunkIntervalMin === null ? delta : Math.min(chunkIntervalMin, delta);
        }
        lastChunkAt = now;
      };

      try {
        const { stream, logCompletion } = await streamChatCompletion({
          client: openai,
          payload: payload as ChatCompletionCreateParamsStreaming,
          debugLogger: logOpenAIDebugEvent,
          logError,
          metadata: metadataWithOrg,
          tags,
          quotaTag,
          orgId: orgContext.orgId,
          requestLogPayload,
        });

        const writeEvent = (event: { type: string; data?: unknown }) => {
          if (clientClosed || res.writableEnded) {
            return;
          }
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        };

        const abortStream = () => {
          try {
            stream.controller?.abort();
          } catch {
            // ignore abort errors
          }
        };

        const markClientClosed = () => {
          clientClosed = true;
          if (streamStatus === 'pending') {
            streamStatus = 'client_disconnect';
          }
          if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
          }
          abortStream();
        };

        if (res.on) {
          res.on('close', markClientClosed);
          cleanupCallbacks.push(() => res.removeListener?.('close', markClientClosed));
          res.on('finish', markClientClosed);
          cleanupCallbacks.push(() => res.removeListener?.('finish', markClientClosed));
        }

        if (heartbeatIntervalMs > 0) {
          const sendHeartbeat = () => {
            if (clientClosed || res.writableEnded) {
              return;
            }
            lastHeartbeatAt = Date.now();
            heartbeatCount += 1;
            res.write(`: keep-alive ${lastHeartbeatAt}\n\n`);
          };
          heartbeatTimer = setInterval(sendHeartbeat, heartbeatIntervalMs);
          heartbeatTimer.unref?.();
          cleanupCallbacks.push(() => {
            if (heartbeatTimer) {
              clearInterval(heartbeatTimer);
              heartbeatTimer = null;
            }
          });
        }

        let lastChunk: ChatCompletionChunk | undefined;

        for await (const chunk of stream) {
          if (clientClosed) {
            break;
          }
          lastChunk = chunk;
          recordChunkMetrics(chunk);
          writeEvent({ type: 'chunk', data: chunk });
        }

        if (!clientClosed) {
          try {
            await logCompletion({
              response: lastChunk ? { id: lastChunk.id } : undefined,
              metadata: { streaming: true },
            });
          } catch (err) {
            logError('openai.chat_completion_stream_log_failed', err, {
              orgId: orgContext.orgId,
              requestId: req.requestId,
            });
          }

          writeEvent({ type: 'done' });
          if (!res.writableEnded) {
            res.write('data: [DONE]\n\n');
            res.end();
          }

          if (streamStatus === 'pending') {
            streamStatus = 'completed';
          }
        }

        return;
      } catch (error) {
        if (!clientClosed) {
          logError('openai.chat_completion_stream_failed', error, {
            userId,
            orgId: orgContext.orgId,
            requestId: req.requestId,
          });

          const message = error instanceof Error ? error.message : 'stream_error';
          if (!res.headersSent) {
            res.status(500);
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders?.();
          }
          if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ type: 'error', data: { message } })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
          }
        }

        if (!clientClosed && streamStatus === 'pending') {
          streamStatus = 'error';
        }

        return;
      } finally {
        for (const cleanup of cleanupCallbacks) {
          try {
            cleanup();
          } catch {
            // ignore cleanup errors
          }
        }

        const finishedAt = Date.now();
        const durationMs = finishedAt - streamStartedAt;
        const timeToFirstChunkMs = firstChunkAt !== null ? firstChunkAt - streamStartedAt : null;
        const averageChunkIntervalMs =
          chunkIntervalCount > 0 ? chunkIntervalTotal / chunkIntervalCount : null;

        logInfo('openai.chat_completion_stream_metrics', {
          userId,
          orgId: orgContext.orgId,
          orgSlug,
          requestId: req.requestId,
          status: streamStatus,
          durationMs,
          timeToFirstChunkMs,
          chunkCount,
          totalChunkBytes,
          chunkIntervalMinMs: chunkIntervalMin,
          chunkIntervalMaxMs: chunkIntervalCount > 0 ? chunkIntervalMax : null,
          chunkIntervalAvgMs: averageChunkIntervalMs,
          heartbeatCount,
          heartbeatIntervalMs,
          lastHeartbeatAt,
          lastChunkAt,
        });
      }
    }

    const completion = await createChatCompletion({
      client: openai,
      payload: payload as ChatCompletionCreateParamsNonStreaming,
      debugLogger: logOpenAIDebugEvent,
      logError,
      metadata: metadataWithOrg,
      tags,
      quotaTag,
      orgId: orgContext.orgId,
      requestLogPayload,
    });

    return res.status(201).json({ completion });
  } catch (error) {
    logError('openai.chat_completion_proxy_failed', error, { userId: req.user?.sub });
    return res.status(500).json({ error: 'failed_to_create_chat_completion' });
  }
});

app.get('/api/openai/chat-completions', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const orgSlug = typeof req.query.orgSlug === 'string' ? req.query.orgSlug.trim() : '';
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug query param required' });
    }

    const orgContext = await resolveOrgForUser(userId, orgSlug);
    const query = buildChatCompletionListQuery(req.query as Record<string, unknown>);

    const result = await listChatCompletions({
      client: openai,
      query,
      debugLogger: logOpenAIDebugEvent,
      logError,
      metadata: { orgSlug },
      orgId: orgContext.orgId,
    });

    return res.json(result);
  } catch (error) {
    logError('openai.chat_completion_list_failed', error, { userId: req.user?.sub });
    return res.status(500).json({ error: 'failed_to_list_chat_completions' });
  }
});

app.get('/api/openai/chat-completions/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const orgSlug = typeof req.query.orgSlug === 'string' ? req.query.orgSlug.trim() : '';
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug query param required' });
    }

    const orgContext = await resolveOrgForUser(userId, orgSlug);
    const completion = await retrieveChatCompletion({
      client: openai,
      completionId: req.params.id,
      debugLogger: logOpenAIDebugEvent,
      logError,
      metadata: { orgSlug },
      orgId: orgContext.orgId,
    });

    return res.json({ completion });
  } catch (error) {
    logError('openai.chat_completion_retrieve_failed', error, {
      userId: req.user?.sub,
      completionId: req.params.id,
    });
    return res.status(500).json({ error: 'failed_to_retrieve_chat_completion' });
  }
});

app.patch('/api/openai/chat-completions/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const body = req.body as Record<string, unknown> | undefined;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'invalid_request_body' });
    }

    const orgSlugRaw = body.orgSlug ?? req.query.orgSlug;
    const orgSlug = typeof orgSlugRaw === 'string' ? orgSlugRaw.trim() : '';
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }

    const metadata = parseMetadataRecord(body.metadata);
    if (!metadata) {
      return res.status(400).json({ error: 'metadata object is required' });
    }

    const orgContext = await resolveOrgForUser(userId, orgSlug);

    const completion = await updateChatCompletion({
      client: openai,
      completionId: req.params.id,
      payload: { metadata } as ChatCompletionUpdateParams,
      debugLogger: logOpenAIDebugEvent,
      logError,
      metadata: { orgSlug },
      tags: parseStringArray(body.tags),
      quotaTag: parseQuotaTag(body.quotaTag),
      orgId: orgContext.orgId,
    });

    return res.json({ completion });
  } catch (error) {
    logError('openai.chat_completion_update_failed', error, {
      userId: req.user?.sub,
      completionId: req.params.id,
    });
    return res.status(500).json({ error: 'failed_to_update_chat_completion' });
  }
});

app.delete('/api/openai/chat-completions/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const orgSlug = typeof req.query.orgSlug === 'string' ? req.query.orgSlug.trim() : '';
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug query param required' });
    }

    const orgContext = await resolveOrgForUser(userId, orgSlug);
    const deleted = await deleteChatCompletion({
      client: openai,
      completionId: req.params.id,
      debugLogger: logOpenAIDebugEvent,
      logError,
      metadata: { orgSlug },
      orgId: orgContext.orgId,
    });

    return res.json({ deleted });
  } catch (error) {
    logError('openai.chat_completion_delete_failed', error, {
      userId: req.user?.sub,
      completionId: req.params.id,
    });
    return res.status(500).json({ error: 'failed_to_delete_chat_completion' });
  }
});

app.get('/api/openai/chat-completions/:id/messages', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const orgSlug = typeof req.query.orgSlug === 'string' ? req.query.orgSlug.trim() : '';
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug query param required' });
    }

    const orgContext = await resolveOrgForUser(userId, orgSlug);
    const query = buildChatCompletionMessagesQuery(req.query as Record<string, unknown>);

    const result = await listChatCompletionMessages({
      client: openai,
      completionId: req.params.id,
      query,
      debugLogger: logOpenAIDebugEvent,
      logError,
      metadata: { orgSlug },
      orgId: orgContext.orgId,
    });

    return res.json(result);
  } catch (error) {
    logError('openai.chat_completion_messages_list_failed', error, {
      userId: req.user?.sub,
      completionId: req.params.id,
    });
    return res.status(500).json({ error: 'failed_to_list_chat_completion_messages' });
  }
});

app.get('/api/agent/orchestrator/agents', (req: AuthenticatedRequest, res) => {
  if (!OPENAI_ORCHESTRATOR_ENABLED) {
    return res.status(404).json({ error: 'orchestrator_disabled' });
  }
  return res.json({ agents: DOMAIN_AGENT_LIST });
});

app.get('/api/agent/domain-tools/vector-stores', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const orgSlug = typeof req.query?.orgSlug === 'string' ? (req.query.orgSlug as string).trim() : '';
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }

    const agentKey = ensureDomainToolAgent(req.query?.agentKey);
    if (!agentKey) {
      return res.status(400).json({ error: 'agentKey must be a supported domain persona' });
    }

    const orgContext = await resolveOrgForUser(userId, orgSlug);

    const attributeSampleSizeParam = parseAttributeSampleSizeParam(
      extractQueryValue(req.query?.attributeSampleSize),
    );

    const vectorStores = await listAccessibleVectorStores({
      attributeSampleSize: attributeSampleSizeParam,
    });

    logInfo('domain_tools.vector_store_catalog_generated', {
      userId,
      orgId: orgContext.orgId,
      agentKey,
      storeCount: vectorStores.length,
      attributeSampleSize: attributeSampleSizeParam ?? DEFAULT_ATTRIBUTE_SAMPLE_SIZE,
      storesWithAdditionalAttributes: vectorStores.filter((store) => store.attributeSummary.hasMore).length,
    });

    return res.json({
      attributeSampleSize,
      attributePageLimit: DEFAULT_ATTRIBUTE_PAGE_LIMIT,
      vectorStores: vectorStores.map((store) => ({
        id: store.id,
        name: store.name,
        description: store.description,
        status: store.status,
        fileCount: store.fileCount,
        createdAt: store.createdAt,
        attributes: store.attributeSummary.attributes,
        attributeSampledCount: store.attributeSummary.sampledCount,
        attributeHasMore: store.attributeSummary.hasMore,
        attributeNextCursor: store.attributeSummary.nextCursor,
        metadata: store.metadata,
      })),
    });
  } catch (error) {
    logError('domain_tools.vector_store_catalog_failed', error, { userId: req.user?.sub });
    return res.status(500).json({ error: 'vector_store_catalog_failed' });
  }
});

app.get('/api/agent/domain-tools/vector-stores/:vectorStoreId/attributes', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const orgSlug = extractQueryValue(req.query?.orgSlug)?.trim() ?? '';
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }

    const agentKey = ensureDomainToolAgent(extractQueryValue(req.query?.agentKey));
    if (!agentKey) {
      return res.status(400).json({ error: 'agentKey must be a supported domain persona' });
    }

    const vectorStoreId = typeof req.params?.vectorStoreId === 'string' ? req.params.vectorStoreId : '';
    if (!vectorStoreId.trim()) {
      return res.status(400).json({ error: 'vectorStoreId is required' });
    }

    await resolveOrgForUser(userId, orgSlug);

    const cursor = extractQueryValue(req.query?.cursor);
    const limit =
      parseAttributePageLimitParam(extractQueryValue(req.query?.limit)) ?? DEFAULT_ATTRIBUTE_PAGE_LIMIT;

    const summary = await summariseVectorStoreAttributes(vectorStoreId, {
      maxFiles: limit,
      pageSize: limit,
      after: cursor ?? null,
    });

    logInfo('domain_tools.vector_store_attribute_page_generated', {
      userId,
      orgSlug,
      agentKey,
      vectorStoreId,
      limit,
      sampledCount: summary.sampledCount,
      hasMore: summary.hasMore,
    });

    return res.json({
      attributes: summary.attributes,
      sampledCount: summary.sampledCount,
      hasMore: summary.hasMore,
      nextCursor: summary.nextCursor,
    });
  } catch (error) {
    logError('domain_tools.vector_store_attribute_page_failed', error, {
      userId: req.user?.sub,
      vectorStoreId: typeof req.params?.vectorStoreId === 'string' ? req.params.vectorStoreId : undefined,
    });
    return res.status(500).json({ error: 'vector_store_attribute_page_failed' });
  }
});

app.post('/api/agent/domain-tools/web-search', async (req: AuthenticatedRequest, res) => {
  if (!OPENAI_WEB_SEARCH_ENABLED) {
    return res.status(404).json({ error: 'web_search_disabled' });
  }

  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const body = req.body as {
      orgSlug?: string;
      agentKey?: string;
      query?: string;
      reasoningEffort?: string;
      allowedDomains?: unknown;
      location?: { country?: string; city?: string; region?: string };
    };

    const orgSlug = typeof body.orgSlug === 'string' ? body.orgSlug.trim() : '';
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }

    const agentKey = ensureDomainToolAgent(body.agentKey);
    if (!agentKey) {
      return res.status(400).json({ error: 'agentKey must be a supported domain persona' });
    }

    const query = typeof body.query === 'string' ? body.query.trim() : '';
    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    await resolveOrgForUser(userId, orgSlug);

    const allowedDomains = Array.isArray(body.allowedDomains)
      ? Array.from(
          new Set(
            body.allowedDomains
              .map((value) => (typeof value === 'string' ? value.trim() : ''))
              .filter((value) => value.length > 0),
          ),
        )
      : [];
    if (allowedDomains.length > 20) {
      return res.status(400).json({ error: 'allowedDomains cannot exceed 20 entries' });
    }
    const reasoningEffort = normalizeReasoningEffort(body.reasoningEffort);
    const locationInput =
      body.location && typeof body.location === 'object' && !Array.isArray(body.location)
        ? body.location
        : undefined;
    const userLocation = locationInput
      ? {
          type: 'approximate',
          country:
            typeof locationInput.country === 'string' && locationInput.country.trim().length
              ? locationInput.country.trim()
              : undefined,
          city:
            typeof locationInput.city === 'string' && locationInput.city.trim().length
              ? locationInput.city.trim()
              : undefined,
          region:
            typeof locationInput.region === 'string' && locationInput.region.trim().length
              ? locationInput.region.trim()
              : undefined,
        }
      : undefined;

    const webTool: Record<string, unknown> = { type: 'web_search' };
    if (allowedDomains.length) {
      webTool.filters = { allowed_domains: allowedDomains };
    }
    if (userLocation && (userLocation.country || userLocation.city || userLocation.region)) {
      webTool.user_location = userLocation;
    }

    const response = await openai.responses.create({
      model: DOMAIN_TOOL_MODEL,
      input: query,
      tools: [webTool],
      include: ['web_search_call.action.sources'],
      tool_choice: { type: 'web_search' },
      ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
    });

    const answer = extractResponseText(response) || 'No answer generated.';
    const citations = extractCitationsFromResponse(response);
    const sources = extractWebSearchSources(response);

    logInfo('domain_tools.web_search_completed', {
      userId,
      agentKey,
      orgSlug,
      citationCount: citations.length,
      sourceCount: sources.length,
    });

    return res.json({ answer, citations, sources });
  } catch (error) {
    logError('domain_tools.web_search_failed', error, { userId: req.user?.sub });
    return res.status(500).json({ error: 'web_search_failed' });
  }
});

app.post('/api/agent/domain-tools/file-search', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const body = req.body as {
      orgSlug?: string;
      agentKey?: string;
      query?: string;
      vectorStoreIds?: unknown;
      maxResults?: unknown;
    };

    const orgSlug = typeof body.orgSlug === 'string' ? body.orgSlug.trim() : '';
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }

    const agentKey = ensureDomainToolAgent(body.agentKey);
    if (!agentKey) {
      return res.status(400).json({ error: 'agentKey must be a supported domain persona' });
    }

    const query = typeof body.query === 'string' ? body.query.trim() : '';
    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const vectorStoreIds = Array.isArray(body.vectorStoreIds)
      ? Array.from(
          new Set(
            body.vectorStoreIds
              .map((value) => (typeof value === 'string' ? value.trim() : ''))
              .filter((value) => value.length > 0),
          ),
        )
      : [];
    if (!vectorStoreIds.length) {
      return res.status(400).json({ error: 'vectorStoreIds must include at least one id' });
    }

    const maxResultsCandidate = Number(body.maxResults);
    const maxResults = Number.isFinite(maxResultsCandidate) && maxResultsCandidate > 0
      ? Math.min(20, Math.floor(maxResultsCandidate))
      : undefined;

    await resolveOrgForUser(userId, orgSlug);

    const toolSpec: Record<string, unknown> = {
      type: 'file_search',
      vector_store_ids: vectorStoreIds,
    };
    if (typeof maxResults === 'number') {
      toolSpec.max_num_results = maxResults;
    }

    const response = await openai.responses.create({
      model: DOMAIN_TOOL_MODEL,
      input: query,
      tools: [toolSpec],
      include: ['file_search_call.results'],
      tool_choice: { type: 'file_search' },
    });

    const answer = extractResponseText(response) || 'No answer generated.';
    const citations = extractCitationsFromResponse(response);
    const results = extractFileSearchResults(response);

    logInfo('domain_tools.file_search_completed', {
      userId,
      agentKey,
      orgSlug,
      resultCount: results.length,
    });

    return res.json({ answer, citations, results });
  } catch (error) {
    logError('domain_tools.file_search_failed', error, { userId: req.user?.sub });
    return res.status(500).json({ error: 'file_search_failed' });
  }
});

app.post('/api/agent/domain-tools/retrieval', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const body = req.body as {
      orgSlug?: string;
      agentKey?: string;
      vectorStoreId?: string;
      query?: string;
      maxResults?: unknown;
      rewriteQuery?: unknown;
      attributeFilter?: unknown;
    };

    const orgSlug = typeof body.orgSlug === 'string' ? body.orgSlug.trim() : '';
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }

    const agentKey = ensureDomainToolAgent(body.agentKey);
    if (!agentKey) {
      return res.status(400).json({ error: 'agentKey must be a supported domain persona' });
    }

    const vectorStoreId = typeof body.vectorStoreId === 'string' ? body.vectorStoreId.trim() : '';
    if (!vectorStoreId) {
      return res.status(400).json({ error: 'vectorStoreId is required' });
    }

    const query = typeof body.query === 'string' ? body.query.trim() : '';
    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const maxResultsCandidate = Number(body.maxResults);
    const maxResults = Number.isFinite(maxResultsCandidate) && maxResultsCandidate > 0
      ? Math.min(50, Math.floor(maxResultsCandidate))
      : undefined;

    const rewriteQuery = typeof body.rewriteQuery === 'boolean' ? body.rewriteQuery : true;

    const attributeFilter =
      body.attributeFilter && typeof body.attributeFilter === 'object' && !Array.isArray(body.attributeFilter)
        ? body.attributeFilter
        : undefined;

    const orgContext = await resolveOrgForUser(userId, orgSlug);

    const searchPayload: Record<string, unknown> = {
      query,
      rewrite_query: rewriteQuery,
    };
    if (typeof maxResults === 'number') {
      searchPayload.max_num_results = maxResults;
    }
    if (attributeFilter) {
      searchPayload.attribute_filter = attributeFilter;
    }

    const searchResponse = await openai.vectorStores.search(vectorStoreId, searchPayload);
    const hits = Array.isArray(searchResponse.data) ? searchResponse.data : [];
    const results = hits.map((hit) => ({
      fileId: hit.file_id,
      filename: hit.filename,
      score: hit.score,
      content: Array.isArray(hit.content) ? hit.content.map((entry) => entry?.text ?? '').filter(Boolean) : [],
      attributes: hit.attributes ?? null,
    }));

    logInfo('domain_tools.vector_search_completed', {
      userId,
      agentKey,
      orgId: orgContext.orgId,
      vectorStoreId,
      resultCount: results.length,
    });

    return res.json({ results });
  } catch (error) {
    logError('domain_tools.vector_search_failed', error, { userId: req.user?.sub });
    return res.status(500).json({ error: 'retrieval_failed' });
  }
});

app.post('/api/agent/domain-tools/image-generation', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const body = req.body as {
      orgSlug?: string;
      agentKey?: string;
      prompt?: string;
      size?: string;
      quality?: string;
      background?: string;
    };

    const orgSlug = typeof body.orgSlug === 'string' ? body.orgSlug.trim() : '';
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }

    const agentKey = ensureDomainToolAgent(body.agentKey);
    if (!agentKey) {
      return res.status(400).json({ error: 'agentKey must be a supported domain persona' });
    }

    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    await resolveOrgForUser(userId, orgSlug);

    const toolOptions: Record<string, unknown> = { type: 'image_generation' };
    if (typeof body.size === 'string' && body.size.trim()) {
      toolOptions.size = body.size.trim();
    }
    if (typeof body.quality === 'string' && body.quality.trim()) {
      toolOptions.quality = body.quality.trim();
    }
    if (typeof body.background === 'string' && body.background.trim()) {
      toolOptions.background = body.background.trim();
    }

    const response = await openai.responses.create({
      model: DOMAIN_IMAGE_MODEL,
      input: prompt,
      tools: [toolOptions],
      tool_choice: { type: 'image_generation' },
    });

    const outputItems = Array.isArray(response.output) ? response.output : [];
    const imageCall = outputItems.find((item) => item?.type === 'image_generation_call');
    const imageBase64 = typeof imageCall?.result === 'string' ? imageCall.result : null;
    if (!imageBase64) {
      logError('domain_tools.image_generation_missing_result', new Error('image result missing'), { userId });
      return res.status(502).json({ error: 'image_generation_failed' });
    }

    logInfo('domain_tools.image_generation_completed', { userId, agentKey, orgSlug });

    return res.json({ imageBase64, revisedPrompt: imageCall?.revised_prompt ?? null });
  } catch (error) {
    logError('domain_tools.image_generation_failed', error, { userId: req.user?.sub });
    return res.status(500).json({ error: 'image_generation_failed' });
  }
});

app.post('/api/agent/domain-tools/gpt5', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const body = req.body as {
      orgSlug?: string;
      agentKey?: string;
      prompt?: string;
      reasoningEffort?: string;
      verbosity?: string;
      maxOutputTokens?: unknown;
    };

    const orgSlug = typeof body.orgSlug === 'string' ? body.orgSlug.trim() : '';
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }

    const agentKey = ensureDomainToolAgent(body.agentKey);
    if (!agentKey) {
      return res.status(400).json({ error: 'agentKey must be a supported domain persona' });
    }

    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    await resolveOrgForUser(userId, orgSlug);

    const reasoningEffort = normalizeReasoningEffort(body.reasoningEffort);
    const verbosity = normalizeVerbosity(body.verbosity);
    const maxTokensCandidate = Number(body.maxOutputTokens);
    const maxOutputTokens = Number.isFinite(maxTokensCandidate) && maxTokensCandidate > 0
      ? Math.min(4000, Math.floor(maxTokensCandidate))
      : undefined;

    const requestPayload: Record<string, unknown> = {
      model: DOMAIN_TOOL_MODEL,
      input: prompt,
    };
    if (reasoningEffort) {
      requestPayload.reasoning = { effort: reasoningEffort };
    }
    if (verbosity) {
      requestPayload.text = { verbosity };
    }
    if (typeof maxOutputTokens === 'number') {
      requestPayload.max_output_tokens = maxOutputTokens;
    }

    const response = await openai.responses.create(requestPayload);
    const answer = extractResponseText(response) || 'No answer generated.';
    const citations = extractCitationsFromResponse(response);

    logInfo('domain_tools.gpt5_completed', {
      userId,
      agentKey,
      orgSlug,
      citationCount: citations.length,
    });

    return res.json({ answer, citations });
  } catch (error) {
    logError('domain_tools.gpt5_failed', error, { userId: req.user?.sub });
    return res.status(500).json({ error: 'gpt5_failed' });
  }
});

app.post('/api/agent/tools/sync', async (req: AuthenticatedRequest, res) => {
  if (!isAgentPlatformEnabled()) {
    return res.status(404).json({ error: 'agent_platform_disabled' });
  }
  try {
    await syncAgentToolsWithLogging('manual');
    return res.json({ success: true });
  } catch (error) {
    logError('agent_tool_sync.manual_failed', error, { userId: req.user?.sub });
    return res.status(500).json({ error: 'failed_to_sync_tools' });
  }
});

app.post('/api/agent/orchestrator/session', async (req: AuthenticatedRequest, res) => {
  if (!OPENAI_ORCHESTRATOR_ENABLED) {
    return res.status(404).json({ error: 'orchestrator_disabled' });
  }

  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const body = req.body as {
      orgSlug?: string;
      objective?: string;
      engagementId?: string;
      metadata?: Record<string, unknown>;
      directorAgentKey?: string;
      safetyAgentKey?: string;
      tasks?: unknown;
    };

    if (!body.orgSlug || body.orgSlug.trim().length === 0) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }
    if (!body.objective || body.objective.trim().length === 0) {
      return res.status(400).json({ error: 'objective is required' });
    }

    const orgContext = await resolveOrgForUser(userId, body.orgSlug);

    const engagementId = typeof body.engagementId === 'string' && body.engagementId.trim().length > 0
      ? body.engagementId.trim()
      : null;

    const sessionMetadata: Record<string, unknown> = {};
    if (body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)) {
      Object.assign(sessionMetadata, body.metadata);
    }
    if (engagementId) {
      sessionMetadata.engagementId = engagementId;
    }

    const session = await mcpDirector.createSession({
      orgId: orgContext.orgId,
      createdByUserId: userId,
      objective: body.objective.trim(),
      metadata: Object.keys(sessionMetadata).length > 0 ? sessionMetadata : undefined,
      directorAgentKey: typeof body.directorAgentKey === 'string' ? body.directorAgentKey : undefined,
      safetyAgentKey: typeof body.safetyAgentKey === 'string' ? body.safetyAgentKey : undefined,
    });

    const tasksInput = Array.isArray(body.tasks)
      ? body.tasks
          .map((task) => normaliseOrchestrationTaskInput(task))
          .filter((task): task is OrchestrationTaskInput => Boolean(task))
      : [];

    let finalTasks = tasksInput;
    if (finalTasks.length === 0) {
      finalTasks = buildDefaultTasksForObjective({
        orgId: orgContext.orgId,
        objective: body.objective,
        engagementId,
      });
    }

    if (finalTasks.length) {
      await mcpDirector.createTasks(session.id, finalTasks);
    }

    await recomputeOrchestrationSessionStatus(session.id);

    const board = await mcpDirector.getSessionBoard(session.id);
    return res.status(201).json(board);
  } catch (error) {
    logError('mcp.session_create_route_failed', error, { userId: req.user?.sub });
    return res.status(500).json({ error: 'failed_to_create_orchestrator_session' });
  }
});

app.get('/api/agent/orchestrator/sessions', async (req: AuthenticatedRequest, res) => {
  if (!OPENAI_ORCHESTRATOR_ENABLED) {
    return res.status(404).json({ error: 'orchestrator_disabled' });
  }

  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const orgSlug = typeof req.query.orgSlug === 'string' ? req.query.orgSlug : undefined;
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug query param required' });
    }

    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));

    const orgContext = await resolveOrgForUser(userId, orgSlug);

    const { data, error } = await supabaseService
      .from('agent_orchestration_sessions')
      .select('id, org_id, objective, status, metadata, created_at, updated_at')
      .eq('org_id', orgContext.orgId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const sessions = (data ?? []).map((row) => ({
      id: row.id,
      orgId: row.org_id,
      objective: row.objective,
      status: row.status,
      metadata: row.metadata ?? {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return res.json({ sessions });
  } catch (error) {
    logError('mcp.sessions_list_failed', error, { userId: req.user?.sub });
    return res.status(500).json({ error: 'failed_to_list_orchestrator_sessions' });
  }
});

app.get('/api/agent/orchestrator/session/:id', async (req: AuthenticatedRequest, res) => {
  if (!OPENAI_ORCHESTRATOR_ENABLED) {
    return res.status(404).json({ error: 'orchestrator_disabled' });
  }

  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const sessionId = req.params.id;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const board = await mcpDirector.getSessionBoard(sessionId);
    if (!board.session) {
      return res.status(404).json({ error: 'session_not_found' });
    }

    await resolveOrgByIdForUser(userId, board.session.orgId);

    return res.json(board);
  } catch (error) {
    logError('mcp.session_fetch_route_failed', error, { sessionId: req.params.id, userId: req.user?.sub });
    return res.status(500).json({ error: 'failed_to_fetch_orchestrator_session' });
  }
});

app.post('/api/agent/orchestrator/tasks/:id/complete', async (req: AuthenticatedRequest, res) => {
  if (!OPENAI_ORCHESTRATOR_ENABLED) {
    return res.status(404).json({ error: 'orchestrator_disabled' });
  }

  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const taskId = req.params.id;
    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    const body = req.body as {
      status?: string;
      output?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      safetyEvent?: {
        severity?: string;
        ruleCode?: string;
        details?: Record<string, unknown>;
      };
    };

    const status = typeof body.status === 'string' ? body.status : '';
    const allowedStatuses = ['IN_PROGRESS', 'AWAITING_APPROVAL', 'COMPLETED', 'FAILED', 'ASSIGNED'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'invalid status' });
    }

    const { data: taskRow, error: taskError } = await supabaseService
      .from('agent_orchestration_tasks')
      .select('id, session_id')
      .eq('id', taskId)
      .maybeSingle();

    if (taskError) throw taskError;
    if (!taskRow) {
      return res.status(404).json({ error: 'task_not_found' });
    }

    const { data: sessionRow, error: sessionError } = await supabaseService
      .from('agent_orchestration_sessions')
      .select('org_id')
      .eq('id', taskRow.session_id)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!sessionRow) {
      return res.status(404).json({ error: 'session_not_found' });
    }

    const orgContext = await resolveOrgByIdForUser(userId, sessionRow.org_id);

    const metadata = body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
      ? (body.metadata as Record<string, unknown>)
      : undefined;
    const output = body.output && typeof body.output === 'object' && !Array.isArray(body.output)
      ? (body.output as Record<string, unknown>)
      : undefined;

    const updatedTask = await mcpDirector.updateTaskStatus({
      taskId,
      status: status as OrchestrationTaskStatus,
      output,
      metadata,
    });

    const sessionStatus = await recomputeOrchestrationSessionStatus(taskRow.session_id);

    const safetyEvent = body.safetyEvent;
    if (safetyEvent && typeof safetyEvent === 'object' && !Array.isArray(safetyEvent) && typeof safetyEvent.ruleCode === 'string') {
      await mcpSafety.recordEvent({
        sessionId: taskRow.session_id,
        taskId,
        ruleCode: safetyEvent.ruleCode,
        severity: typeof safetyEvent.severity === 'string' ? safetyEvent.severity.toUpperCase() : 'INFO',
        details:
          safetyEvent.details && typeof safetyEvent.details === 'object' && !Array.isArray(safetyEvent.details)
            ? (safetyEvent.details as Record<string, unknown>)
            : {},
      });
    }

    const board = await mcpDirector.getSessionBoard(taskRow.session_id);

    return res.json({
      session: board.session,
      tasks: board.tasks,
      task: updatedTask,
      status: sessionStatus,
      orgSlug: orgContext.orgSlug,
    });
  } catch (error) {
    logError('mcp.task_complete_route_failed', error, { taskId: req.params.id, userId: req.user?.sub });
    return res.status(500).json({ error: 'failed_to_update_task' });
  }
});

app.post('/api/agent/orchestrator/plan', async (req: AuthenticatedRequest, res) => {
  if (!OPENAI_ORCHESTRATOR_ENABLED) {
    return res.status(404).json({ error: 'orchestrator_disabled' });
  }
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const { orgSlug, objective, priority, constraints } = req.body as {
      orgSlug?: string;
      objective?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH';
      constraints?: string[];
    };

    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }
    if (!objective || objective.trim().length === 0) {
      return res.status(400).json({ error: 'objective is required' });
    }

    const orgContext = await resolveOrgForUser(userId, orgSlug);

    const orchestratorContext: OrchestratorContext = {
      orgId: orgContext.orgId,
      orgSlug,
      userId,
      objective: objective.trim(),
      priority,
      constraints,
    };

    const plan = legacyDirectorAgent.generatePlan(orchestratorContext);

    return res.json({ plan });
  } catch (err) {
    logError('agent.orchestrator_plan_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'failed_to_generate_plan' });
  }
});

app.post('/api/agent/plan', applyExpressIdempotency({
  keyBuilder: (req) => {
    const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : 'missing';
    return `agent:plan:${sessionId}`;
  },
  ttlSeconds: 300,
}), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const { sessionId, request } = req.body as { sessionId?: string; request?: unknown };
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const { data: sessionRow, error: sessionError } = await supabaseService
      .from('agent_sessions')
      .select('id, org_id, agent_type, status, openai_thread_id, openai_agent_id')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError || !sessionRow) {
      return res.status(404).json({ error: 'session not found' });
    }

    const orgContext = await resolveOrgByIdForUser(userId, sessionRow.org_id as string);
    const agentType = normaliseAgentType(sessionRow.agent_type);
    const requestContext = parseAgentRequestContext(request);

    const planResult = await generateAgentPlan({
      agentType,
      supabase: supabaseService,
      openai,
      userRole: orgContext.role,
      requestContext,
      enforceCitations: ENFORCE_CITATIONS,
      debugLogger: async (event) => {
        await logOpenAIDebugEvent({
          endpoint: event.endpoint,
          response: event.response,
          requestPayload: event.requestPayload,
          metadata: { ...(event.metadata ?? {}), scope: 'agent_planner', sessionId },
          orgId: orgContext.orgId,
        });
      },
    });

    if (planResult.status === 'refused') {
      const summary = JSON.stringify(
        {
          status: 'refused',
          refusal: planResult.refusal,
          personaVersion: planResult.personaVersion,
          policyPackVersion: planResult.policyPackVersion,
          requestContext,
        },
        null,
        2,
      );

      const { error: updateError } = await supabaseService
        .from('agent_runs')
        .update({ summary, state: 'ERROR' })
        .eq('session_id', sessionId)
        .eq('step_index', 0);

      if (updateError) {
        logError('agent.plan_summary_update_failed', updateError, { sessionId });
      }

      logInfo('agent.plan_refused', {
        sessionId,
        orgId: orgContext.orgId,
        reason: planResult.refusal.reason,
      });

      return res.status(403).json({
        refusal: planResult.refusal,
        personaVersion: planResult.personaVersion,
        policyPackVersion: planResult.policyPackVersion,
      });
    }

    const prettyPlan = JSON.stringify(planResult.plan, null, 2);

    let openaiRunInfo: { runId: string; responseId?: string } | null = null;
    let effectiveAgentId = sessionRow.openai_agent_id ?? null;
    if (!effectiveAgentId && isAgentPlatformEnabled()) {
      effectiveAgentId = await resolveOpenAiAgentIdForType(normalizedType);
    }
    if (isAgentPlatformEnabled() && effectiveAgentId && sessionRow.openai_thread_id) {
      const instructions = buildAgentPlanInstructions({
        sessionId,
        orgSlug: orgContext.orgSlug,
        requestContext,
        plan: planResult.plan,
      });
      openaiRunInfo = await createAgentRun({
        agentId: effectiveAgentId,
        threadId: sessionRow.openai_thread_id,
        instructions,
        metadata: { sessionId, userId },
        openAiApiKey: process.env.OPENAI_API_KEY,
        logError,
        logInfo,
      });
    }

    const runUpdatePayload: Record<string, unknown> = { summary: prettyPlan, state: 'PLANNING' };
    if (openaiRunInfo) {
      runUpdatePayload.openai_run_id = openaiRunInfo.runId;
      if (openaiRunInfo.responseId) {
        runUpdatePayload.openai_response_id = openaiRunInfo.responseId;
      }
    }

    const { error: runUpdateError } = await supabaseService
      .from('agent_runs')
      .update(runUpdatePayload)
      .eq('session_id', sessionId)
      .eq('step_index', 0);

    if (runUpdateError) {
      logError('agent.plan_summary_store_failed', runUpdateError, { sessionId });
    }

    try {
      await supabaseService.from('agent_traces').insert({
        org_id: orgContext.orgId,
        session_id: sessionId,
        trace_type: 'PLAN',
        payload: {
          plan: planResult.plan,
          personaVersion: planResult.personaVersion,
          policyPackVersion: planResult.policyPackVersion,
          model: planResult.model,
          usage: planResult.usage ?? null,
          isFallback: planResult.isFallback,
        },
      });
    } catch (traceError) {
      logError('agent.plan_trace_failed', traceError, { sessionId });
    }

    logInfo('agent.plan_generated', {
      sessionId,
      orgId: orgContext.orgId,
      agentType,
      model: planResult.model,
      isFallback: planResult.isFallback,
      openaiRunId: openaiRunInfo?.runId ?? null,
    });

    return res.json({
      plan: planResult.plan,
      personaVersion: planResult.personaVersion,
      policyPackVersion: planResult.policyPackVersion,
      model: planResult.model,
      usage: planResult.usage,
      costUsd: planResult.costUsd,
      isFallback: planResult.isFallback,
    });
  } catch (err) {
    logError('agent.plan_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'failed to generate plan' });
  }
});

app.post('/api/agent/respond', async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: 'invalid session' });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const orgSlug = typeof body.orgSlug === 'string' ? body.orgSlug : undefined;
  if (!orgSlug) {
    return res.status(400).json({ error: 'orgSlug is required' });
  }

  try {
    const orgContext = await resolveOrgForUser(userId, orgSlug);

    const baseRequest =
      typeof body.request === 'object' && body.request !== null && !Array.isArray(body.request)
        ? { ...(body.request as Record<string, unknown>) }
        : {};

    for (const [key, value] of Object.entries(body)) {
      if (value === undefined) continue;
      if (key === 'orgSlug' || key === 'request' || key === 'model' || key === 'input') continue;
      const normalizedKey = RESPONSE_KEY_ALIASES[key] ?? key;
      if (!RESPONSES_ALLOWED_KEYS.has(normalizedKey)) continue;
      if (baseRequest[normalizedKey] === undefined) {
        baseRequest[normalizedKey] = value;
      }
    }

    const modelFromRequest =
      typeof baseRequest.model === 'string' && baseRequest.model.trim().length > 0
        ? (baseRequest.model as string).trim()
        : undefined;
    const modelFromBody = typeof body.model === 'string' && body.model.trim().length > 0 ? body.model.trim() : undefined;
    baseRequest.model = modelFromRequest ?? modelFromBody ?? AGENT_MODEL;

    let normalizedInput: NormalizedResponseMessage[] | null = null;
    try {
      normalizedInput = normaliseResponsesInput(baseRequest.input ?? body.input ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'invalid responses input';
      return res.status(400).json({ error: message });
    }

    if (normalizedInput) {
      baseRequest.input = normalizedInput;
    } else {
      delete baseRequest.input;
    }

    const hasInput = Array.isArray(normalizedInput) && normalizedInput.length > 0;
    const hasToolOutputs = Array.isArray(baseRequest.tool_outputs) && baseRequest.tool_outputs.length > 0;
    if (!hasInput && !hasToolOutputs) {
      return res.status(400).json({ error: 'input or tool_outputs is required' });
    }

    if (baseRequest.stream === true) {
      return res.status(400).json({ error: 'stream is not supported on this endpoint' });
    }
    if ('stream' in baseRequest) {
      delete baseRequest.stream;
    }

    const start = Date.now();
    try {
      const response = await openai.responses.create(baseRequest as any);

      const latencyMs = Date.now() - start;
      logInfo('agent.model_response_created', {
        userId,
        orgId: orgContext.orgId,
        model: baseRequest.model,
        messageCount: normalizedInput?.length ?? 0,
        hasToolOutputs,
        latencyMs,
      });

      await logOpenAIDebugEvent({
        endpoint: 'responses.create',
        response: response as any,
        requestPayload: {
          model: baseRequest.model,
          messageCount: normalizedInput?.length ?? 0,
          hasToolOutputs,
          orgSlug,
        },
        metadata: {
          scope: 'agent_model_response',
          latencyMs,
          requestId: req.requestId ?? undefined,
        },
        orgId: orgContext.orgId,
      });

      return res.json({ response });
    } catch (error) {
      const status = typeof (error as any)?.status === 'number' ? ((error as any).status as number) : null;
      const message = error instanceof Error ? error.message : 'failed_to_create_response';
      logError('agent.model_response_openai_failed', error, {
        userId,
        orgId: orgContext.orgId,
        status: status ?? undefined,
      });
      if (status && status >= 400 && status < 600) {
        return res.status(status).json({ error: message });
      }
      return res.status(502).json({ error: message });
    }
  } catch (err) {
    logError('agent.model_response_failed', err, { userId, requestId: req.requestId });
    return res.status(500).json({ error: 'failed_to_create_response' });
  }
});

app.post('/api/agent/execute', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const { sessionId, stepIndex } = req.body as { sessionId?: string; stepIndex?: number };
    if (!sessionId || typeof stepIndex !== 'number') {
      return res.status(400).json({ error: 'sessionId and stepIndex are required' });
    }

    const { data: sessionRow, error: sessionError } = await supabaseService
      .from('agent_sessions')
      .select('id, org_id, agent_type, engagement_id, status')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError || !sessionRow) {
      return res.status(404).json({ error: 'session not found' });
    }

    const orgContext = await resolveOrgByIdForUser(userId, sessionRow.org_id as string);

    const { data: runRow, error: runError } = await supabaseService
      .from('agent_runs')
      .select('id, summary, state')
      .eq('session_id', sessionId)
      .eq('step_index', stepIndex)
      .maybeSingle();

    if (runError || !runRow) {
      return res.status(404).json({ error: 'run not found' });
    }

    const planDocument = parsePlanSummary(runRow.summary);
    const steps = ensurePlanSteps(planDocument);
    const planStep = steps.find((step: any) => step?.stepIndex === stepIndex);

    if (!planStep) {
      return res.status(400).json({ error: 'plan step not found for execution' });
    }

    let normalizedTools: Array<{ key: string; input: Record<string, unknown> }> = [];

    if (Array.isArray(planStep.toolIntents)) {
      normalizedTools = planStep.toolIntents
        .map((intent: any) => {
          const toolKey = typeof intent?.toolKey === 'string' ? intent.toolKey : intent?.key;
          if (typeof toolKey !== 'string' || toolKey.length === 0) {
            return null;
          }
          const inputs = intent?.inputs && typeof intent.inputs === 'object' && !Array.isArray(intent.inputs)
            ? (intent.inputs as Record<string, unknown>)
            : {};
          return { key: toolKey, input: inputs };
        })
        .filter((intent): intent is { key: string; input: Record<string, unknown> } => Boolean(intent));
    } else if (Array.isArray(planStep.tools)) {
      normalizedTools = planStep.tools
        .map((tool: any) => {
          if (typeof tool === 'string') {
            return { key: tool, input: {} };
          }
          const key = typeof tool?.key === 'string' ? tool.key : undefined;
          if (!key) return null;
          const input = tool?.input && typeof tool.input === 'object' && !Array.isArray(tool.input)
            ? (tool.input as Record<string, unknown>)
            : {};
          return { key, input };
        })
        .filter((intent): intent is { key: string; input: Record<string, unknown> } => Boolean(intent));
    }

    if (normalizedTools.length === 0) {
      return res.status(400).json({ error: 'no tools defined for this step' });
    }

    const results: AgentToolExecutionResult[] = [];
    const userRoleLevel = ROLE_HIERARCHY[orgContext.role];
    const managerLevel = ROLE_HIERARCHY.MANAGER;

    for (const tool of normalizedTools) {
      const toolKey = tool.key;
      const handler = toolHandlers[toolKey];
      const definition = await resolveToolDefinition(toolKey);

      if (!definition || definition.enabled === false) {
        results.push({ toolKey, status: 'ERROR', error: 'tool_not_available' });
        continue;
      }

      const requiredRole = definition.minRole ?? 'EMPLOYEE';
      const requiredLevel = ROLE_HIERARCHY[requiredRole];

      if (userRoleLevel < requiredLevel) {
        results.push({ toolKey, status: 'ERROR', error: 'insufficient_role' });
        continue;
      }

      const requiresManagerApproval = definition.sensitive && userRoleLevel < managerLevel;
      const initialStatus: AgentActionStatus = requiresManagerApproval ? 'BLOCKED' : 'PENDING';

      let actionId: string;
      try {
        actionId = await insertAgentAction({
          orgId: orgContext.orgId,
          sessionId,
          runId: runRow.id,
          userId,
          toolKey,
          input: tool.input,
          status: initialStatus,
          sensitive: Boolean(definition.sensitive),
        });
      } catch (actionError) {
        logError('agent.action_insert_failed', actionError, { toolKey, sessionId });
        results.push({ toolKey, status: 'ERROR', error: 'agent_action_insert_failed' });
        continue;
      }

      if (requiresManagerApproval) {
        try {
          const approvalId = await createAgentActionApproval({
            orgId: orgContext.orgId,
            orgSlug: orgContext.orgSlug,
            sessionId,
            runId: runRow.id,
            actionId,
            userId,
            toolKey,
            input: tool.input,
            standards: definition.standards_refs ?? [],
          });

          logInfo('agent.tool_blocked_for_approval', {
            toolKey,
            sessionId,
            approvalId,
            orgSlug: orgContext.orgSlug,
          });

          results.push({ toolKey, status: 'BLOCKED', approvalId });
        } catch (approvalError) {
          logError('agent.approval_queue_failed', approvalError, { toolKey, sessionId });
          await supabaseService
            .from('agent_actions')
            .update({ status: 'ERROR', output_json: { error: 'approval_queue_failed' } })
            .eq('id', actionId);

          results.push({ toolKey, status: 'ERROR', error: 'approval_queue_failed' });
        }
        continue;
      }

      if (!handler) {
        results.push({ toolKey, status: 'ERROR', error: 'handler_not_implemented' });
        continue;
      }

      try {
        const output = await handler(tool.input, {
          orgId: orgContext.orgId,
          engagementId: sessionRow.engagement_id ?? null,
          userId,
          sessionId,
          runId: runRow.id,
        });
        await supabaseService
          .from('agent_actions')
          .update({ status: 'SUCCESS', output_json: output ?? {} })
          .eq('id', actionId);
        results.push({ toolKey, status: 'SUCCESS', output });
      } catch (executionError) {
        const message = executionError instanceof Error ? executionError.message : String(executionError);
        await supabaseService
          .from('agent_actions')
          .update({ status: 'ERROR', output_json: { error: message } })
          .eq('id', actionId);
        results.push({
          toolKey,
          status: 'ERROR',
          error: message,
        });
        logError('agent.tool_execution_failed', executionError, { toolKey, sessionId, runId: runRow.id });
      }
    }

    updatePlanStepResults(planDocument, stepIndex, results);
    const runState = deriveRunState(results);

    const { error: runUpdateError } = await supabaseService
      .from('agent_runs')
      .update({ state: runState, summary: JSON.stringify(planDocument) })
      .eq('id', runRow.id);

    if (runUpdateError) {
      logError('agent.execute_summary_update_failed', runUpdateError, { runId: runRow.id });
    }

    try {
      await supabaseService.from('agent_traces').insert({
        org_id: orgContext.orgId,
        session_id: sessionId,
        run_id: runRow.id,
        trace_type: 'EXECUTION',
        payload: {
          stepIndex,
          results,
        },
      });
    } catch (traceError) {
      logError('agent.execute_trace_failed', traceError, { runId: runRow.id });
    }

    logInfo('agent.execute_completed', {
      sessionId,
      runId: runRow.id,
      stepIndex,
      state: runState,
    });

    return res.json({ stepIndex, results, state: runState });
  } catch (err) {
    logError('agent.execute_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'failed to execute tools' });
  }
});

app.post('/api/agent/approve', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const { approvalId, decision, comment } = req.body as {
      approvalId?: string;
      decision?: 'APPROVED' | 'CHANGES_REQUESTED';
      comment?: string;
    };

    if (!approvalId || !decision || !['APPROVED', 'CHANGES_REQUESTED'].includes(decision)) {
      return res.status(400).json({ error: 'approvalId and valid decision are required' });
    }

    const { data: queueItem, error: queueError } = await supabaseService
      .from('approval_queue')
      .select('id, org_id, status, kind, context_json')
      .eq('id', approvalId)
      .maybeSingle();

    if (queueError || !queueItem) {
      return res.status(404).json({ error: 'approval not found' });
    }

    if (queueItem.status && queueItem.status !== 'PENDING') {
      return res.status(409).json({ error: 'approval already decided' });
    }

    const orgContext = await resolveOrgByIdForUser(userId, queueItem.org_id as string);
    if (!hasManagerPrivileges(orgContext.role)) {
      return res.status(403).json({ error: 'manager role required' });
    }

    const context = (queueItem.context_json as Record<string, unknown> | null) ?? {};
    let updatedContext: Record<string, unknown> = { ...context };

    if (decision === 'APPROVED') {
      const resumeOutcome = await resumeApprovedAction({
        approvalId,
        context,
        orgContext,
        approverId: userId,
      });

      updatedContext = {
        ...updatedContext,
        resumeOutcome,
        decision: 'APPROVED',
        decisionComment: comment ?? null,
      };
    } else {
      await rejectBlockedAction({
        approvalId,
        context,
        orgContext,
        approverId: userId,
        comment,
      });

      updatedContext = {
        ...updatedContext,
        decision: 'CHANGES_REQUESTED',
        decisionComment: comment ?? null,
      };
    }

    const now = new Date().toISOString();

    const { data: updated, error: updateError } = await supabaseService
      .from('approval_queue')
      .update({
        status: decision,
        approved_by_user_id: userId,
        decision_at: now,
        context_json: updatedContext,
      })
      .eq('id', approvalId)
      .select('*')
      .single();

    if (updateError || !updated) {
      throw updateError ?? new Error('approval_update_failed');
    }

    await supabaseService.from('activity_log').insert({
      org_id: queueItem.org_id,
      user_id: userId,
      action: decision === 'APPROVED' ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED',
      entity_type: 'approval_queue',
      entity_id: approvalId,
      metadata: {
        decision,
        comment: comment ?? null,
        kind: queueItem.kind,
      },
    });

    logInfo('agent.approval_decision_recorded', {
      approvalId,
      decision,
      userId,
      orgId: orgContext.orgId,
    });

    return res.json({ approval: updated });
  } catch (err) {
    logError('agent.approval_decision_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'failed to record decision' });
  }
});

app.get('/api/agent/telemetry', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    const orgSlug = typeof req.query.orgSlug === 'string' ? (req.query.orgSlug as string) : undefined;

    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug query param required' });
    }

    const orgContext = await resolveOrgForUser(userId, orgSlug);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);

    const [
      { data: sessionsData, error: sessionsError },
      { data: approvalsData, error: approvalsError },
      { data: errorTracesData, error: errorTracesError },
      { data: recentTracesData, error: recentTracesError },
    ] = await Promise.all([
      supabaseService
        .from('agent_sessions')
        .select('id, status, created_at')
        .eq('org_id', orgContext.orgId)
        .gte('created_at', thirtyDaysAgo.toISOString()),
      supabaseService
        .from('approval_queue')
        .select('id, requested_at')
        .eq('org_id', orgContext.orgId)
        .eq('status', 'PENDING'),
      supabaseService
        .from('agent_traces')
        .select('payload, created_at')
        .eq('org_id', orgContext.orgId)
        .eq('trace_type', 'ERROR')
        .gte('created_at', thirtyDaysAgo.toISOString()),
      supabaseService
        .from('agent_traces')
        .select('id, session_id, trace_type, payload, created_at')
        .eq('org_id', orgContext.orgId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    if (sessionsError) throw sessionsError;
    if (approvalsError) throw approvalsError;
    if (errorTracesError) throw errorTracesError;
    if (recentTracesError) throw recentTracesError;

    const sessionsByStatus: Record<string, number> = {
      RUNNING: 0,
      WAITING_APPROVAL: 0,
      COMPLETED: 0,
      FAILED: 0,
    };

    const trendBuckets: Record<string, number> = {};
    const trendKeys = buildLastNDaysKeys(7, now);

    for (const row of sessionsData ?? []) {
      const status = typeof row.status === 'string' ? row.status : null;
      if (status) {
        sessionsByStatus[status] = (sessionsByStatus[status] ?? 0) + 1;
      }

      const createdAtRaw = (row as Record<string, unknown>).created_at as string | undefined;
      if (createdAtRaw) {
        const createdKey = formatDateKey(new Date(createdAtRaw));
        trendBuckets[createdKey] = (trendBuckets[createdKey] ?? 0) + 1;
      }
    }

    const sessionsTrend = trendKeys.map((key) => ({ date: key, count: trendBuckets[key] ?? 0 }));

    let totalPendingAgeMs = 0;
    for (const item of approvalsData ?? []) {
      const requestedAt = (item as Record<string, unknown>).requested_at as string | undefined;
      if (!requestedAt) continue;
      const requested = Date.parse(requestedAt);
      if (!Number.isNaN(requested)) {
        totalPendingAgeMs += now.getTime() - requested;
      }
    }
    const pendingCount = approvalsData?.length ?? 0;
    const averagePendingHours = pendingCount > 0
      ? Math.round((totalPendingAgeMs / pendingCount / (60 * 60 * 1000)) * 100) / 100
      : 0;

    const toolFailureCounts: Record<string, number> = {};
    for (const trace of errorTracesData ?? []) {
      const payload = (trace as Record<string, unknown>).payload as Record<string, unknown> | undefined;
      if (!payload) continue;
      const toolKey =
        typeof payload.toolKey === 'string'
          ? (payload.toolKey as string)
          : typeof payload.tool_key === 'string'
          ? (payload.tool_key as string)
          : 'unknown';
      toolFailureCounts[toolKey] = (toolFailureCounts[toolKey] ?? 0) + 1;
    }

    const totalErrors = errorTracesData?.length ?? 0;
    const topErrorTools = Object.entries(toolFailureCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([toolKey, count]) => ({ toolKey, count }));

    const recentTraces = (recentTracesData ?? []).map((row) => {
      const record = row as Record<string, unknown>;
      const payload = (record.payload ?? {}) as Record<string, unknown>;
      const statusCandidate = typeof payload.status === 'string' ? payload.status : undefined;
      const errorMessage = typeof payload.error === 'string' ? payload.error : undefined;
      return {
        id: record.id,
        sessionId: record.session_id ?? null,
        createdAt: record.created_at,
        traceType: record.trace_type,
        status: statusCandidate ?? (errorMessage ? 'ERROR' : undefined) ?? null,
        summary: errorMessage ?? (typeof payload.message === 'string' ? payload.message : null),
      };
    });

    return res.json({
      sessions: {
        byStatus: sessionsByStatus,
        trend: sessionsTrend,
      },
      approvals: {
        pendingCount,
        averagePendingHours,
      },
      errors: {
        total: totalErrors,
        topTools: topErrorTools,
      },
      traces: {
        items: recentTraces,
      },
    });
  } catch (err) {
    logError('agent.telemetry_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'telemetry_failed' });
  }
});

app.get('/v1/approvals', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    const orgSlug = typeof req.query.orgSlug === 'string' ? (req.query.orgSlug as string) : undefined;

    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug query param required' });
    }

    const orgContext = await resolveOrgForUser(userId, orgSlug);
    if (!hasManagerPrivileges(orgContext.role)) {
      return res.status(403).json({ error: 'manager role required' });
    }

    const { data, error } = await supabaseService
      .from('approval_queue')
      .select(
        'id, kind, status, requested_at, requested_by_user_id, approved_by_user_id, decision_at, decision_comment, context_json'
      )
      .eq('org_id', orgContext.orgId)
      .order('requested_at', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    const rows = data ?? [];
    const approvals = rows.map((row) => reshapeApprovalRow(row, orgSlug));
    const pending = approvals.filter((item) => item.status === 'PENDING');
    const history = approvals.filter((item) => item.status !== 'PENDING');

    return res.json({ pending, history });
  } catch (err) {
    logError('approvals.list_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'failed to list approvals' });
  }
});

app.post('/v1/approvals/:id/decision', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    const approvalId = req.params.id;
    const { decision, comment, evidence, orgSlug } = req.body as {
      decision?: ApprovalDecision;
      comment?: string;
      evidence?: ApprovalEvidence[];
      orgSlug?: string;
    };

    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }
    if (!approvalId || !decision) {
      return res.status(400).json({ error: 'approvalId and decision are required' });
    }
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }

    const orgContext = await resolveOrgForUser(userId, orgSlug);
    if (!hasManagerPrivileges(orgContext.role)) {
      return res.status(403).json({ error: 'manager role required' });
    }
    const { data: approvalRow, error: fetchError } = await supabaseService
      .from('approval_queue')
      .select(
        'id, org_id, status, kind, context_json, requested_at, requested_by_user_id, approved_by_user_id, decision_at, decision_comment'
      )
      .eq('id', approvalId)
      .maybeSingle();

    if (fetchError || !approvalRow) {
      return res.status(404).json({ error: 'approval not found' });
    }
    if (approvalRow.org_id !== orgContext.orgId) {
      return res.status(403).json({ error: 'forbidden' });
    }
    if ((approvalRow.status ?? 'PENDING') !== 'PENDING') {
      return res.status(409).json({ error: 'approval already decided' });
    }

    const context = (approvalRow.context_json ?? {}) as Record<string, unknown>;
    let updatedContext: Record<string, unknown> = { ...context };

    if (Array.isArray(evidence) && evidence.length > 0) {
      const existing = Array.isArray(context.evidenceRefs) ? (context.evidenceRefs as ApprovalEvidence[]) : [];
      const merged = [...existing];
      for (const item of evidence) {
        if (!merged.find((existingItem) => existingItem.id === item.id)) {
          merged.push(item);
        }
      }
      updatedContext = { ...updatedContext, evidenceRefs: merged };
    }

    if (decision === 'APPROVED') {
      const resumeOutcome = await resumeApprovedAction({
        approvalId,
        context,
        orgContext,
        approverId: userId,
      });
      updatedContext = {
        ...updatedContext,
        resumeOutcome,
        decisionComment: comment ?? null,
      };
    } else {
      await rejectBlockedAction({
        approvalId,
        context,
        orgContext,
        approverId: userId,
        comment,
      });
      updatedContext = {
        ...updatedContext,
        rejection: {
          comment: comment ?? null,
        },
      };
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabaseService
      .from('approval_queue')
      .update({
        status: decision,
        approved_by_user_id: userId,
        decision_at: now,
        decision_comment: comment ?? null,
        context_json: updatedContext,
      })
      .eq('id', approvalId)
      .select('*')
      .single();

    if (updateError || !updated) {
      throw updateError ?? new Error('approval_update_failed');
    }

    await supabaseService.from('activity_log').insert({
      org_id: orgContext.orgId,
      user_id: userId,
      action: decision === 'APPROVED' ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED',
      entity_type: 'approval_queue',
      entity_id: approvalId,
      metadata: {
        decision,
        comment: comment ?? null,
        kind: approvalRow.kind,
      },
    });

    const reshaped = reshapeApprovalRow(updated, orgSlug);
    return res.json({ approval: reshaped });
  } catch (err) {
    logError('approvals.decision_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'failed to process decision' });
  }
});

app.post('/v1/journal/entries', (req: AuthenticatedRequest, res) => enforceApprovalGate(req, res, 'JOURNAL_POST'));
app.post('/v1/periods/:periodId/lock', (req: AuthenticatedRequest, res) => enforceApprovalGate(req, res, 'PERIOD_LOCK'));
app.post('/v1/handoff/:engagementId/send', (req: AuthenticatedRequest, res) => enforceApprovalGate(req, res, 'HANDOFF_SEND'));
app.post('/v1/archive/build', (req: AuthenticatedRequest, res) => enforceApprovalGate(req, res, 'ARCHIVE_BUILD'));
app.post('/v1/clients/:id/send', (req: AuthenticatedRequest, res) => enforceApprovalGate(req, res, 'CLIENT_SEND'));

async function runAgentConversation(options: {
  orgId: string;
  agentKind: 'AUDIT' | 'FINANCE' | 'TAX';
  question: string;
  context?: string;
}): Promise<AgentRunResult> {
  const tools = buildToolDefinitions();
  const messages = [
    { role: 'system', content: AGENT_SYSTEM_PROMPTS[options.agentKind] },
    {
      role: 'user',
      content: options.context ? `${options.question}\n\nContext:\n${options.context}` : options.question,
    },
  ];

  const toolInvocations: Array<{ name: string; args: Record<string, unknown> }> = [];
  const citations: any[] = [];
  const start = Date.now();

  let response = await openai.responses.create({
    model: AGENT_MODEL,
    input: messages,
    tools,
  });
  await logOpenAIDebugEvent({
    endpoint: 'responses.create',
    response: response as any,
    requestPayload: { model: AGENT_MODEL, messages },
    metadata: { scope: 'agent_conversation', step: 'initial' },
    orgId: options.orgId,
  });

  while (response.output?.some((item: any) => item.type === 'tool_call')) {
    const toolOutputs: AgentToolResult[] = [];

    for (const item of response.output ?? []) {
      if (item.type !== 'tool_call') continue;
      const name = item?.function?.name ?? 'unknown';
      const callId = item.id;
      try {
        const result = await executeToolCall(options.orgId, item);
        toolOutputs.push({ tool_call_id: callId, output: result.output });
        if (result.citations) {
          citations.push(...result.citations);
        }
        const rawArgs = item?.function?.arguments ?? '{}';
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = JSON.parse(rawArgs);
        } catch {
          parsedArgs = { rawArgs };
        }
        toolInvocations.push({ name, args: parsedArgs });
      } catch (err) {
        logError('agent.tool_failed', err, { name });
        toolOutputs.push({ tool_call_id: callId, output: `Tool ${name} failed: ${(err as Error).message}` });
      }
    }

    response = await openai.responses.create({
      model: AGENT_MODEL,
      response_id: response.id,
      tool_outputs: toolOutputs,
    });
    await logOpenAIDebugEvent({
      endpoint: 'responses.create',
      response: response as any,
      requestPayload: { model: AGENT_MODEL, tool_outputs: toolOutputs },
      metadata: { scope: 'agent_conversation', step: 'tool-followup' },
      orgId: options.orgId,
    });
  }

  const answer = extractResponseText(response) || 'No answer generated.';
  const usage = response.usage ?? {};
  const latencyMs = Date.now() - start;

  return { answer, citations, usage, latencyMs, toolInvocations };
}

async function queueWebHarvestJob(params: {
  knowledgeSourceId: string;
  webSourceId: string;
  orgId: string;
  agentKind: AgentPersona;
  initiatedBy: string;
  mode: LearningMode;
}) {
  const nowIso = new Date().toISOString();

  const { data: linkRow, error: linkError } = await supabaseService
    .from('knowledge_sources')
    .select('state')
    .eq('id', params.knowledgeSourceId)
    .maybeSingle();

  if (linkError || !linkRow) {
    throw linkError ?? new Error('knowledge source not found');
  }

  const currentState = (linkRow.state ?? {}) as Record<string, any>;

  const { data: runRow, error: runError } = await supabaseService
    .from('learning_runs')
    .insert({
      org_id: params.orgId,
      agent_kind: params.agentKind,
      mode: params.mode,
      status: 'queued',
      stats: {
        sourceUri: params.webSourceId,
        knowledgeSourceId: params.knowledgeSourceId,
        messages: [`Web harvest scheduled for ${params.webSourceId}`],
      },
    })
    .select('id, status')
    .single();

  if (runError || !runRow) {
    throw runError ?? new Error('learning_run_insert_failed');
  }

  await supabaseService
    .from('knowledge_sources')
    .update({
      state: {
        ...currentState,
        lastRunStatus: 'pending',
        lastQueuedAt: nowIso,
        lastRunId: runRow.id,
      },
    })
    .eq('id', params.knowledgeSourceId);

  setImmediate(() => {
    void processWebHarvest({
      runId: runRow.id,
      orgId: params.orgId,
      agentKind: params.agentKind,
      webSourceId: params.webSourceId,
      knowledgeSourceId: params.knowledgeSourceId,
      initiatedBy: params.initiatedBy,
    });
  });

  return runRow;
}

async function bootstrapWebLearning() {
  if (webBootstrapRunning) {
    return;
  }
  webBootstrapRunning = true;
  try {
    const [{ data: orgs, error: orgError }, { data: webSources, error: webError }] = await Promise.all([
      supabaseService.from('organizations').select('id, slug'),
      supabaseService.from('web_knowledge_sources').select('id, domain'),
    ]);

    if (orgError) throw orgError;
    if (webError) throw webError;
    if (!orgs?.length || !webSources?.length) {
      return;
    }

    for (const org of orgs) {
      const corpusCache = new Map<string, CorpusRow>();
      for (const webSource of webSources) {
        try {
          await ensureWebSourceSyncForOrg({
            orgId: org.id,
            webSource,
            corpusCache,
            initiatedBy: 'system:bootstrap',
          });
        } catch (err) {
          logError('web.bootstrap_schedule_failed', err, {
            orgId: org.id,
            webSourceId: webSource.id,
          });
        }
      }
    }
  } catch (err) {
    logError('web.bootstrap_failed', err, {});
  } finally {
    webBootstrapRunning = false;
  }
}

async function handleWebSourceInserted(webSource: WebSourceRow) {
  try {
    const { data: orgs, error: orgError } = await supabaseService
      .from('organizations')
      .select('id, slug');

    if (orgError) {
      throw orgError;
    }
    if (!orgs?.length) {
      return;
    }

    for (const org of orgs) {
      try {
        await ensureWebSourceSyncForOrg({
          orgId: org.id,
          webSource,
          initiatedBy: 'system:web_source_insert',
          force: true,
        });
      } catch (err) {
        logError('web.realtime_schedule_failed', err, {
          orgId: org.id,
          webSourceId: webSource.id,
        });
      }
    }
  } catch (err) {
    logError('web.realtime_web_source_failed', err, { webSourceId: webSource.id });
  }
}

async function handleOrganizationInserted(org: { id: string }) {
  try {
    const webSources = await listWebSources();
    if (!webSources.length) {
      return;
    }

    const corpusCache = new Map<string, CorpusRow>();
    for (const webSource of webSources) {
      try {
        await ensureWebSourceSyncForOrg({
          orgId: org.id,
          webSource,
          corpusCache,
          initiatedBy: 'system:org_insert',
        });
      } catch (err) {
        logError('web.realtime_org_schedule_failed', err, {
          orgId: org.id,
          webSourceId: webSource.id,
        });
      }
    }
  } catch (err) {
    logError('web.realtime_org_failed', err, { orgId: org.id });
  }
}

function startRealtimeKnowledgeWatchers() {
  supabaseService
    .channel('realtime-web-knowledge-sources')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'web_knowledge_sources' },
      (payload) => {
        const newSource = payload.new as WebSourceRow | null;
        if (!newSource) {
          return;
        }
        logInfo('web.realtime_web_source_insert', { webSourceId: newSource.id });
        void handleWebSourceInserted(newSource);
      },
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        logInfo('web.realtime_web_sources_connected', {});
      }
      if (status === 'CHANNEL_ERROR') {
        logError('web.realtime_web_sources_error', new Error('subscription error'), {});
      }
    });

  supabaseService
    .channel('realtime-organizations')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'organizations' },
      (payload) => {
        const org = payload.new as { id?: string } | null;
        if (!org?.id) {
          return;
        }
        logInfo('web.realtime_org_insert', { orgId: org.id });
        void handleOrganizationInserted({ id: org.id });
      },
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        logInfo('web.realtime_org_connected', {});
      }
      if (status === 'CHANNEL_ERROR') {
        logError('web.realtime_org_error', new Error('subscription error'), {});
      }
    });
}

app.post('/v1/rag/ingest', upload.single('file'), async (req: AuthenticatedRequest, res) => {
  let orgContext: Awaited<ReturnType<typeof resolveOrgForUser>> | null = null;
  let chunks: string[] = [];
  let embeddingUsage: EmbedUsage = {};
  let embeddingModel = 'text-embedding-3-small';
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'file required' });
    }

    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const { orgSlug, engagementId, name } = req.body as {
      orgSlug?: string;
      engagementId?: string;
      name?: string;
    };

    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }

    try {
      orgContext = await resolveOrgForUser(userId, orgSlug);
    } catch (err) {
      if ((err as Error).message === 'organization_not_found') {
        return res.status(404).json({ error: 'organization not found' });
      }
      if ((err as Error).message === 'not_a_member') {
        return res.status(403).json({ error: 'forbidden' });
      }
      throw err;
    }

    const { buffer, mimetype, originalname } = req.file;
    const text = await extractText(buffer, mimetype);
    chunks = chunkText(text);
    const { vectors: embeddings, usage, model } = await embed(chunks);
    embeddingUsage = usage;
    embeddingModel = model;

    await db.query('BEGIN');
    const docResult = await db.query(
      'INSERT INTO documents(org_id, name) VALUES ($1, $2) RETURNING id',
      [orgContext.orgId, name ?? originalname]
    );
    const docId = docResult.rows[0].id;

    const insertChunk =
      'INSERT INTO document_chunks(org_id, doc_id, chunk_index, content, embedding) VALUES ($1,$2,$3,$4,$5)';
    for (let i = 0; i < chunks.length; i++) {
      await db.query(insertChunk, [orgContext.orgId, docId, i, chunks[i], vector(embeddings[i])]);
    }
    await db.query('COMMIT');

    logInfo('ingest.complete', {
      userId,
      documentId: docId,
      chunks: chunks.length,
      orgId: orgContext.orgId,
    });
    await recordEmbeddingTelemetry({
      orgId: orgContext.orgId,
      scenario: 'manual_ingest',
      decision: 'APPROVED',
      metrics: {
        documentId: docId,
        chunkCount: chunks.length,
        tokens: embeddingUsage.total_tokens ?? 0,
        promptTokens: embeddingUsage.prompt_tokens ?? 0,
        model: embeddingModel,
        fileType: mimetype,
      },
      actor: userId,
    });
    res.json({ documentId: docId, chunks: chunks.length });
  } catch (err) {
    await db.query('ROLLBACK');
    logError('ingest.failed', err, { userId: req.user?.sub });
    if (orgContext) {
      await recordEmbeddingTelemetry({
        orgId: orgContext.orgId,
        scenario: 'manual_ingest',
        decision: 'REFUSED',
        metrics: {
          chunkCount: chunks.length,
          error: err instanceof Error ? err.message : String(err),
        },
        actor: req.user?.sub ?? null,
      }).catch(() => undefined);
    }
    res.status(500).json({ error: 'ingest failed' });
  }
});

app.post('/v1/rag/search', async (req: AuthenticatedRequest, res) => {
  try {
    const { query, limit = 5, orgSlug } = req.body as {
      query: string;
      limit?: number;
      orgSlug?: string;
    };
    if (!query) {
      return res.status(400).json({ error: 'query required' });
    }
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }

    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    let orgContext;
    try {
      orgContext = await resolveOrgForUser(userId, orgSlug);
    } catch (err) {
      if ((err as Error).message === 'organization_not_found') {
        return res.status(404).json({ error: 'organization not found' });
      }
      if ((err as Error).message === 'not_a_member') {
        return res.status(403).json({ error: 'forbidden' });
      }
      throw err;
    }

    const numericLimit = Math.max(1, Math.min(12, Number(limit ?? 5)));

    const cacheKey = `search:${orgContext.orgId}:${numericLimit}:${query}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      logInfo('search.cache_hit', { userId, orgId: orgContext.orgId, query });
      return res.json(cached);
    }

    const ragResult = await performRagSearch(orgContext.orgId, query, numericLimit);
    let parsedResults: Array<Record<string, unknown>> = [];

    try {
      const parsed = ragResult?.output ? JSON.parse(ragResult.output) : null;
      if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).results)) {
        parsedResults = (parsed as any).results as Array<Record<string, unknown>>;
      }
    } catch (error) {
      logError('search.result_parse_failed', error, { orgId: orgContext.orgId });
    }

    if (!parsedResults.length) {
      parsedResults = [];
    }

    const response = { results: parsedResults };
    cache.set(cacheKey, response);
    logInfo('search.complete', {
      userId,
      orgId: orgContext.orgId,
      query,
      results: parsedResults.length,
    });
    res.json(response);
  } catch (err) {
    logError('search.failed', err, { userId: req.user?.sub });
    res.status(500).json({ error: 'search failed' });
  }
});

app.post('/v1/rag/reembed', async (req: AuthenticatedRequest, res) => {
  let orgContext: Awaited<ReturnType<typeof resolveOrgForUser>> | null = null;
  try {
    const { documentId, orgSlug } = req.body as { documentId?: string; orgSlug?: string };
    if (!documentId) {
      return res.status(400).json({ error: 'documentId required' });
    }
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }

    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    try {
      orgContext = await resolveOrgForUser(userId, orgSlug);
    } catch (err) {
      if ((err as Error).message === 'organization_not_found') {
        return res.status(404).json({ error: 'organization not found' });
      }
      if ((err as Error).message === 'not_a_member') {
        return res.status(403).json({ error: 'forbidden' });
      }
      throw err;
    }
    if (!hasManagerPrivileges(orgContext.role)) {
      return res.status(403).json({ error: 'manager role required' });
    }

    const { rows } = await db.query(
      'SELECT id, content FROM document_chunks WHERE doc_id = $1 AND org_id = $2 ORDER BY chunk_index',
      [documentId, orgContext.orgId]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'document not found' });
    }

    const texts = rows.map((r: any) => r.content);
    const { vectors: embeddings, usage: embeddingUsage, model: embeddingModel } = await embed(texts);
    for (let i = 0; i < rows.length; i++) {
      await db.query('UPDATE document_chunks SET embedding = $1 WHERE id = $2', [vector(embeddings[i]), rows[i].id]);
    }
    logInfo('reembed.complete', {
      userId,
      documentId,
      updated: rows.length,
      orgId: orgContext.orgId,
    });
    await recordEmbeddingTelemetry({
      orgId: orgContext.orgId,
      scenario: 'manual_reembed',
      decision: 'APPROVED',
      metrics: {
        documentId,
        chunkCount: rows.length,
        tokens: embeddingUsage.total_tokens ?? 0,
        promptTokens: embeddingUsage.prompt_tokens ?? 0,
        model: embeddingModel,
      },
      actor: userId,
    });
    res.json({ updated: rows.length });
  } catch (err) {
    logError('reembed.failed', err, { userId: req.user?.sub });
    if (orgContext) {
      await recordEmbeddingTelemetry({
        orgId: orgContext.orgId,
        scenario: 'manual_reembed',
        decision: 'REFUSED',
        metrics: {
          documentId: (req.body as any)?.documentId ?? null,
          error: err instanceof Error ? err.message : String(err),
        },
        actor: req.user?.sub ?? null,
      }).catch(() => undefined);
    }
    res.status(500).json({ error: 'reembed failed' });
  }
});

app.post('/api/knowledge/embeddings/backfill', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const { orgSlug, limit, includePolicies } = req.body as {
      orgSlug?: string;
      limit?: number;
      includePolicies?: boolean;
    };

    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug required' });
    }

    const orgContext = await resolveOrgForUser(userId, orgSlug);
    if (!hasManagerPrivileges(orgContext.role)) {
      return res.status(403).json({ error: 'manager role required' });
    }

    const parsedLimit = Number(limit);
    const batchSize = Number.isFinite(parsedLimit)
      ? Math.max(1, Math.min(100, Math.trunc(parsedLimit)))
      : 25;

    const summary = await backfillOrgEmbeddings({
      orgId: orgContext.orgId,
      limit: batchSize,
      includePolicies: includePolicies !== false,
      initiatedBy: userId,
    });

    logInfo('embeddings.backfill_complete', {
      orgId: orgContext.orgId,
      documents: summary.documentsProcessed,
      policies: summary.policyVersionsProcessed,
      chunks: summary.chunksEmbedded,
      tokens: summary.tokensConsumed,
    });

    return res.json({ summary });
  } catch (err) {
    logError('embeddings.backfill_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'backfill failed' });
  }
});

app.post('/v1/storage/documents', upload.single('file'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'file required' });
    }

    const { orgSlug, engagementId, name } = req.body as {
      orgSlug?: string;
      engagementId?: string;
      name?: string;
    };

    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }

    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    let orgContext;
    try {
      orgContext = await resolveOrgForUser(userId, orgSlug);
    } catch (err) {
      if ((err as Error).message === 'organization_not_found') {
        return res.status(404).json({ error: 'organization not found' });
      }
      if ((err as Error).message === 'not_a_member') {
        return res.status(403).json({ error: 'forbidden' });
      }
      throw err;
    }

    const storagePath = `documents/${orgSlug}/${engagementId ?? 'general'}/${randomUUID()}_${req.file.originalname}`;

    const { error: uploadError } = await supabaseService.storage
      .from('documents')
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: document, error: insertError } = await supabaseService
      .from('documents')
      .insert({
        org_id: orgContext.orgId,
        engagement_id: engagementId ?? null,
        name: name ?? req.file.originalname,
        file_path: storagePath,
        file_size: req.file.size,
        file_type: req.file.mimetype,
        uploaded_by: userId,
      })
      .select('*')
      .single();

    if (insertError) {
      throw insertError;
    }

    await supabaseService.from('activity_log').insert({
      org_id: orgContext.orgId,
      user_id: userId,
      action: 'UPLOAD_DOCUMENT',
      entity_type: 'document',
      entity_id: document.id,
      metadata: {
        name: document.name,
        path: storagePath,
        size: req.file.size,
      },
    });

    logInfo('documents.uploaded', { userId, documentId: document.id, path: storagePath });
    return res.status(201).json({ document });
  } catch (err) {
    logError('documents.upload_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'upload failed' });
  }
});

app.get('/v1/storage/documents', async (req: AuthenticatedRequest, res) => {
  try {
    const orgSlug = req.query.orgSlug as string | undefined;
    const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? '20')));
    const offset = Math.max(0, Number(req.query.offset ?? '0'));

    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug query param required' });
    }

    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    let orgContext;
    try {
      orgContext = await resolveOrgForUser(userId, orgSlug);
    } catch (err) {
      if ((err as Error).message === 'organization_not_found') {
        return res.status(404).json({ error: 'organization not found' });
      }
      if ((err as Error).message === 'not_a_member') {
        return res.status(403).json({ error: 'forbidden' });
      }
      throw err;
    }

    const { data: documents, error } = await supabaseService
      .from('documents')
      .select('*')
      .eq('org_id', orgContext.orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    res.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
    return res.json({ documents: documents ?? [] });
  } catch (err) {
    logError('documents.list_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'list failed' });
  }
});

app.get('/v1/notifications', async (req: AuthenticatedRequest, res) => {
  try {
    const orgSlug = req.query.orgSlug as string | undefined;
    const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? '20')));
    const offset = Math.max(0, Number(req.query.offset ?? '0'));

    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug query param required' });
    }

    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    let orgContext;
    try {
      orgContext = await resolveOrgForUser(userId, orgSlug);
    } catch (err) {
      if ((err as Error).message === 'organization_not_found') {
        return res.status(404).json({ error: 'organization not found' });
      }
      if ((err as Error).message === 'not_a_member') {
        return res.status(403).json({ error: 'forbidden' });
      }
      throw err;
    }

    const { data, error } = await supabaseService
      .from('notifications')
      .select('id, org_id, user_id, title, body, kind, link, urgent, read, created_at')
      .eq('org_id', orgContext.orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    res.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    return res.json({ notifications: data ?? [] });
  } catch (err) {
    logError('notifications.list_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'list failed' });
  }
});

app.post('/v1/storage/sign', async (req: AuthenticatedRequest, res) => {
  try {
    const { documentId } = req.body as { documentId?: string };
    if (!documentId) {
      return res.status(400).json({ error: 'documentId is required' });
    }

    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

  const { data: document, error: fetchError } = await supabaseService
    .from('documents')
    .select('id, org_id, file_path, name, uploaded_by')
    .eq('id', documentId)
    .maybeSingle();

    if (fetchError || !document) {
      return res.status(404).json({ error: 'document not found' });
    }

    const { data: org } = await supabaseService
      .from('organizations')
      .select('slug')
      .eq('id', document.org_id)
      .maybeSingle();

    if (!org) {
      return res.status(404).json({ error: 'organization not found' });
    }

    try {
      await resolveOrgForUser(userId, org.slug);
    } catch (err) {
      if ((err as Error).message === 'not_a_member') {
        return res.status(403).json({ error: 'forbidden' });
      }
      throw err;
    }

    const { data: signedUrlData, error: signError } = await supabaseService.storage
      .from('documents')
      .createSignedUrl(document.file_path, getSignedUrlTTL('document'));

    if (signError || !signedUrlData) {
      throw signError ?? new Error('failed to sign url');
    }

    logInfo('documents.signed_url', { userId, documentId });
    return res.json({ url: signedUrlData.signedUrl });
  } catch (err) {
    logError('documents.sign_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'sign failed' });
  }
});

app.delete('/v1/storage/documents/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const documentId = req.params.id;
    const { data: document, error: fetchError } = await supabaseService
      .from('documents')
      .select('id, org_id, file_path, name')
      .eq('id', documentId)
      .maybeSingle();

    if (fetchError || !document) {
      return res.status(404).json({ error: 'document not found' });
    }

    const { data: org } = await supabaseService
      .from('organizations')
      .select('slug')
      .eq('id', document.org_id)
      .maybeSingle();

    if (!org) {
      return res.status(404).json({ error: 'organization not found' });
    }

    try {
      await resolveOrgForUser(userId, org.slug);
    } catch (err) {
      if ((err as Error).message === 'not_a_member') {
        return res.status(403).json({ error: 'forbidden' });
      }
      throw err;
    }
    const actorContext = await resolveOrgForUser(userId, org.slug);
    const { data: membership } = await supabaseService
      .from('memberships')
      .select('role')
      .eq('org_id', actorContext.orgId)
      .eq('user_id', userId)
      .maybeSingle();

    const actorRole = membership?.role ?? 'EMPLOYEE';
    const isUploader = document.uploaded_by === userId;
    const isManager = actorRole === 'MANAGER' || actorRole === 'SYSTEM_ADMIN';
    if (!isUploader && !isManager) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const { error: storageError } = await supabaseService
      .storage
      .from('documents')
      .remove([document.file_path]);

    if (storageError) {
      throw storageError;
    }

    const { error: deleteError } = await supabaseService
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('org_id', document.org_id);

    if (deleteError) {
      throw deleteError;
    }

    await supabaseService.from('activity_log').insert({
      org_id: document.org_id,
      user_id: userId,
      action: 'DELETE_DOCUMENT',
      entity_type: 'document',
      entity_id: documentId,
      metadata: {
        name: document.name,
        path: document.file_path,
      },
    });

    logInfo('documents.deleted', { userId, documentId });
    return res.status(204).send();
  } catch (err) {
    logError('documents.delete_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'delete failed' });
  }
});

app.get('/v1/tasks', async (req: AuthenticatedRequest, res) => {
  try {
    const orgSlug = req.query.orgSlug as string | undefined;
    const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? '20')));
    const offset = Math.max(0, Number(req.query.offset ?? '0'));
    const status = req.query.status as string | undefined;

    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug query param required' });
    }

    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const { orgId } = await resolveOrgForUser(userId, orgSlug);

    let query = supabaseService
      .from('tasks')
      .select('id, org_id, engagement_id, title, description, status, priority, assigned_to, due_date, created_at, updated_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && ['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    res.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    return res.json({ tasks: data ?? [] });
  } catch (err) {
    logError('tasks.list_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'list failed' });
  }
});

app.patch('/v1/engagements/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const engagementId = req.params.id;
    const orgSlugFromQuery = typeof req.query.orgSlug === 'string' ? req.query.orgSlug : undefined;

    const bodyPayload = req.body as {
      orgSlug?: string;
      clientId?: string;
      title?: string;
      description?: string | null;
      status?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      budget?: number | string | null;
      isAuditClient?: boolean;
      requiresEqr?: boolean;
      nonAuditServices?: unknown;
      independenceChecked?: boolean;
      overrideNote?: string | null;
    };

    const orgSlug = orgSlugFromQuery ?? bodyPayload.orgSlug;
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }

    let orgContext;
    try {
      orgContext = await resolveOrgForUser(userId, orgSlug);
    } catch (err) {
      if ((err as Error).message === 'organization_not_found') {
        return res.status(404).json({ error: 'organization not found' });
      }
      if ((err as Error).message === 'not_a_member') {
        return res.status(403).json({ error: 'forbidden' });
      }
      throw err;
    }

    if (!hasManagerPrivileges(orgContext.role)) {
      return res.status(403).json({ error: 'manager role required' });
    }

    const { data: existing, error: fetchError } = await supabaseService
      .from('engagements')
      .select('*')
      .eq('id', engagementId)
      .maybeSingle();

    if (fetchError || !existing || existing.org_id !== orgContext.orgId) {
      return res.status(404).json({ error: 'engagement not found' });
    }

    const {
      clientId,
      title,
      description,
      status,
      startDate,
      endDate,
      budget,
      isAuditClient,
      requiresEqr,
      nonAuditServices,
      independenceChecked,
      overrideNote,
    } = bodyPayload;

    const updatePayload: Record<string, unknown> = {};

    if (typeof clientId === 'string') {
      const { data: clientRow, error: clientError } = await supabaseService
        .from('clients')
        .select('org_id')
        .eq('id', clientId)
        .maybeSingle();

      if (clientError || !clientRow || clientRow.org_id !== orgContext.orgId) {
        return res.status(400).json({ error: 'client does not belong to organization' });
      }
      updatePayload.client_id = clientId;
    }

    if (typeof title === 'string') updatePayload.title = title;
    if (typeof description !== 'undefined') updatePayload.description = description ?? null;
    if (typeof status === 'string') {
      const normalizedStatus = status.trim().toUpperCase();
      if (normalizedStatus.length > 0) {
        updatePayload.status = normalizedStatus;
      }
    }
    if (typeof startDate !== 'undefined') updatePayload.start_date = startDate ?? null;
    if (typeof endDate !== 'undefined') updatePayload.end_date = endDate ?? null;
    if (typeof budget !== 'undefined') {
      if (budget === null) {
        updatePayload.budget = null;
      } else if (typeof budget === 'number') {
        updatePayload.budget = Number.isFinite(budget) ? budget : null;
      } else if (typeof budget === 'string') {
        const parsed = Number(budget);
        updatePayload.budget = Number.isFinite(parsed) ? parsed : null;
      }
    }

    const independenceFieldsProvided =
      typeof isAuditClient === 'boolean' ||
      typeof requiresEqr === 'boolean' ||
      typeof nonAuditServices !== 'undefined' ||
      typeof independenceChecked === 'boolean' ||
      typeof overrideNote !== 'undefined';

    const targetIsAuditClient = Boolean(
      typeof isAuditClient === 'boolean' ? isAuditClient : existing.is_audit_client,
    );
    const targetRequiresEqr = Boolean(
      typeof requiresEqr === 'boolean' ? requiresEqr : existing.requires_eqr,
    );
    let targetServices =
      typeof nonAuditServices !== 'undefined'
        ? sanitizeNonAuditServices(nonAuditServices)
        : sanitizeNonAuditServices(existing.non_audit_services);
    let targetIndependenceChecked =
      typeof independenceChecked === 'boolean'
        ? independenceChecked
        : Boolean(existing.independence_checked);
    let targetOverrideNote =
      typeof overrideNote === 'undefined'
        ? toNullableString(existing.independence_conclusion_note)
        : toNullableString(overrideNote);

    let independenceAssessment: IndependenceAssessmentResult | null = null;
    let overrideApprovalId: string | null = null;

    if (independenceFieldsProvided) {
      independenceAssessment = assessIndependence({
        isAuditClient: targetIsAuditClient,
        independenceChecked: targetIndependenceChecked,
        services: targetServices,
        overrideNote: targetOverrideNote,
      });

      if (!independenceAssessment.ok) {
        if (independenceAssessment.error === 'independence_check_required') {
          return res.status(400).json({ error: 'independence_check_required' });
        }
        if (independenceAssessment.error === 'prohibited_nas') {
          return res.status(409).json({ error: 'prohibited_non_audit_services' });
        }
      } else {
        targetIndependenceChecked = independenceAssessment.checked;
        targetOverrideNote = independenceAssessment.note;
        targetServices = independenceAssessment.services;

        updatePayload.independence_checked = independenceAssessment.checked;
        updatePayload.independence_conclusion = independenceAssessment.conclusion;
        updatePayload.independence_conclusion_note = independenceAssessment.note;
        updatePayload.non_audit_services = targetServices.length > 0 ? targetServices : null;
        updatePayload.is_audit_client = targetIsAuditClient;
        updatePayload.requires_eqr = targetRequiresEqr;

        if (independenceAssessment.needsApproval) {
          overrideApprovalId = await ensureIndependenceOverrideApproval({
            orgId: orgContext.orgId,
            engagementId,
            userId,
            note: independenceAssessment.note ?? '',
            services: targetServices,
            isAuditClient: targetIsAuditClient,
          });
        }
      }
    }

    const currentStatus = (existing.status ?? 'PLANNING').toUpperCase();
    const nextStatus = typeof status === 'string' ? status.trim().toUpperCase() : currentStatus;

    const finalConclusion = (updatePayload.independence_conclusion as string | undefined)
      ?? (existing.independence_conclusion as string | undefined)
      ?? 'OK';
    const finalIndependenceChecked = Boolean(
      Object.prototype.hasOwnProperty.call(updatePayload, 'independence_checked')
        ? updatePayload.independence_checked
        : existing.independence_checked,
    );

    const activating = currentStatus === 'PLANNING' && nextStatus !== 'PLANNING';

    if (activating && targetIsAuditClient) {
      if (!finalIndependenceChecked) {
        return res.status(400).json({ error: 'independence_check_required' });
      }
      if (finalConclusion === 'OK') {
        // no-op
      } else if (finalConclusion === 'OVERRIDE') {
        const overrideApproved = await hasApprovedIndependenceOverride(orgContext.orgId, engagementId);
        if (!overrideApproved) {
          return res.status(403).json({ error: 'independence_override_pending' });
        }
      } else {
        return res.status(409).json({ error: 'prohibited_non_audit_services' });
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ error: 'no updates provided' });
    }

    const { data: engagement, error: updateError } = await supabaseService
      .from('engagements')
      .update(updatePayload)
      .eq('id', engagementId)
      .eq('org_id', orgContext.orgId)
      .select(
        'id, org_id, client_id, title, description, status, start_date, end_date, budget, created_at, updated_at, is_audit_client, requires_eqr, non_audit_services, independence_checked, independence_conclusion, independence_conclusion_note',
      )
      .single();

    if (updateError || !engagement) {
      throw updateError ?? new Error('engagement_not_updated');
    }

    await supabaseService.from('activity_log').insert({
      org_id: orgContext.orgId,
      user_id: userId,
      action: 'UPDATE_ENGAGEMENT',
      entity_type: 'engagement',
      entity_id: engagement.id,
      metadata: {
        title: engagement.title,
        updates: updatePayload,
        independence: {
          conclusion: engagement.independence_conclusion,
          ...(overrideApprovalId ? { overrideApprovalId } : {}),
        },
      },
    });

    const normalizedEngagement = {
      ...engagement,
      non_audit_services: sanitizeNonAuditServices(engagement.non_audit_services),
      is_audit_client: Boolean(engagement.is_audit_client),
      requires_eqr: Boolean(engagement.requires_eqr),
      independence_checked: Boolean(engagement.independence_checked),
      independence_conclusion:
        typeof engagement.independence_conclusion === 'string'
          ? engagement.independence_conclusion
          : 'OK',
      independence_conclusion_note: toNullableString(engagement.independence_conclusion_note),
    };

    logInfo('engagements.updated', { userId, engagementId: engagement.id, orgId: orgContext.orgId });
    return res.json({ engagement: normalizedEngagement });
  } catch (err) {
    logError('engagements.update_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'update failed' });
  }
});

app.post('/v1/tasks', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const {
      orgSlug,
      title,
      description,
      status,
      priority,
      engagementId,
      assigneeId,
      dueDate,
    } = req.body as {
      orgSlug?: string;
      title?: string;
      description?: string | null;
      status?: string;
      priority?: string;
      engagementId?: string | null;
      assigneeId?: string | null;
      dueDate?: string | null;
    };

    if (!orgSlug || !title) {
      return res.status(400).json({ error: 'orgSlug and title are required' });
    }

    const { orgId } = await resolveOrgForUser(userId, orgSlug);

    const { data: task, error: insertError } = await supabaseService
      .from('tasks')
      .insert({
        org_id: orgId,
        title,
        description: description ?? null,
        status: status ?? 'TODO',
        priority: priority ?? 'MEDIUM',
        engagement_id: engagementId ?? null,
        assigned_to: assigneeId ?? null,
        due_date: dueDate ?? null,
      })
      .select('id, org_id, engagement_id, title, description, status, priority, assigned_to, due_date, created_at, updated_at')
      .single();

    if (insertError) {
      throw insertError;
    }

    await supabaseService.from('activity_log').insert({
      org_id: orgId,
      user_id: userId,
      action: 'CREATE_TASK',
      entity_type: 'task',
      entity_id: task.id,
      metadata: {
        title: task.title,
        status: task.status,
      },
    });

    logInfo('tasks.created', { userId, taskId: task.id });
    return res.status(201).json({ task });
  } catch (err) {
    logError('tasks.create_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'create failed' });
  }
});

app.patch('/v1/tasks/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const taskId = req.params.id;
    const updates = req.body as {
      status?: string;
      priority?: string;
      assigneeId?: string | null;
      engagementId?: string | null;
      dueDate?: string | null;
      title?: string;
      description?: string | null;
    };

    const { data: taskRow, error: fetchError } = await supabaseService
      .from('tasks')
      .select('id, org_id, assigned_to, status, priority, engagement_id, due_date, title, description')
      .eq('id', taskId)
      .maybeSingle();

    if (fetchError || !taskRow) {
      return res.status(404).json({ error: 'task not found' });
    }

    const { data: orgRow } = await supabaseService
      .from('organizations')
      .select('slug')
      .eq('id', taskRow.org_id)
      .maybeSingle();

    if (!orgRow) {
      return res.status(404).json({ error: 'organization not found' });
    }

    const { orgId, role } = await resolveOrgForUser(userId, orgRow.slug);

    const isAssignee = taskRow.assigned_to === userId;
    if (!isAssignee && !hasManagerPrivileges(role)) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const updatePayload: Record<string, unknown> = {};
    if (updates.status && ['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'].includes(updates.status)) {
      updatePayload.status = updates.status;
    }
    if (updates.priority && ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(updates.priority)) {
      updatePayload.priority = updates.priority;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'assigneeId')) {
      updatePayload.assigned_to = updates.assigneeId ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'engagementId')) {
      updatePayload.engagement_id = updates.engagementId ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'dueDate')) {
      updatePayload.due_date = updates.dueDate ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'title')) {
      updatePayload.title = updates.title;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'description')) {
      updatePayload.description = updates.description;
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ error: 'no valid updates provided' });
    }

    const { data: task, error: updateError } = await supabaseService
      .from('tasks')
      .update(updatePayload)
      .eq('id', taskId)
      .select('id, org_id, engagement_id, title, description, status, priority, assigned_to, due_date, created_at, updated_at')
      .single();

    if (updateError) {
      throw updateError;
    }

    await supabaseService.from('activity_log').insert({
      org_id: orgId,
      user_id: userId,
      action: 'UPDATE_TASK',
      entity_type: 'task',
      entity_id: taskId,
      metadata: {
        updates: updatePayload,
      },
    });

    logInfo('tasks.updated', { userId, taskId });
    return res.json({ task });
  } catch (err) {
    logError('tasks.update_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'update failed' });
  }
});

app.get('/v1/knowledge/drive/metadata', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    const orgSlug = typeof req.query.orgSlug === 'string' ? req.query.orgSlug : undefined;
    if (!userId || !orgSlug) {
      return res.status(400).json({ error: 'orgSlug required' });
    }

    const { role } = await resolveOrgForUser(userId, orgSlug);
    if (!hasManagerPrivileges(role)) {
      return res.status(403).json({ error: 'insufficient_role' });
    }

    const connector = await getDriveConnectorMetadata();
    return res.json({ connector });
  } catch (err) {
    logError('knowledge.drive_metadata_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'fetch failed' });
  }
});

app.get('/v1/knowledge/drive/status', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    const orgSlug = typeof req.query.orgSlug === 'string' ? req.query.orgSlug : undefined;
    if (!userId || !orgSlug) {
      return res.status(400).json({ error: 'orgSlug required' });
    }

    const { orgId, role } = await resolveOrgForUser(userId, orgSlug);
    if (!hasManagerPrivileges(role)) {
      return res.status(403).json({ error: 'insufficient_role' });
    }

    const connectorMetadata = await getDriveConnectorMetadata();

    const { data: connectorRows, error: connectorError } = await supabaseService
      .from('gdrive_connectors')
      .select(
        'id, org_id, folder_id, service_account_email, shared_drive_id, start_page_token, cursor_page_token, last_sync_at, last_backfill_at, last_error, watch_channel_id, watch_expires_at, updated_at, created_at',
      )
      .eq('org_id', orgId)
      .order('created_at', { ascending: true })
      .limit(1);

    if (connectorError) {
      throw connectorError;
    }

    const connectorRow = connectorRows?.[0] ?? null;

    const pendingQueue = await supabaseService
      .from('gdrive_change_queue')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .is('processed_at', null);

    if (pendingQueue.error) {
      throw pendingQueue.error;
    }

    const failureWindow = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const failedQueue = await supabaseService
      .from('gdrive_change_queue')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .not('error', 'is', null)
      .not('processed_at', 'is', null)
      .gte('processed_at', failureWindow);

    if (failedQueue.error) {
      throw failedQueue.error;
    }

    const metadataCounts = await supabaseService
      .from('gdrive_file_metadata')
      .select('file_id', { count: 'exact', head: true })
      .eq('org_id', orgId);

    if (metadataCounts.error) {
      throw metadataCounts.error;
    }

    const blockedCounts = await supabaseService
      .from('gdrive_file_metadata')
      .select('file_id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('allowlisted_domain', false);

    if (blockedCounts.error) {
      throw blockedCounts.error;
    }

    const recentErrorsResp = await supabaseService
      .from('gdrive_change_queue')
      .select('file_id, error, processed_at')
      .eq('org_id', orgId)
      .not('error', 'is', null)
      .not('processed_at', 'is', null)
      .order('processed_at', { ascending: false })
      .limit(5);

    if (recentErrorsResp.error) {
      throw recentErrorsResp.error;
    }

    const connectorStatus = connectorRow
      ? {
          id: connectorRow.id,
          folderId: connectorRow.folder_id,
          serviceAccountEmail: connectorRow.service_account_email,
          sharedDriveId: connectorRow.shared_drive_id,
          startPageToken: connectorRow.start_page_token,
          cursorPageToken: connectorRow.cursor_page_token,
          lastSyncAt: connectorRow.last_sync_at,
          lastBackfillAt: connectorRow.last_backfill_at,
          lastError: connectorRow.last_error,
          watchChannelId: connectorRow.watch_channel_id,
          watchExpiresAt: connectorRow.watch_expires_at,
          updatedAt: connectorRow.updated_at,
          createdAt: connectorRow.created_at,
        }
      : null;

    const recentErrors = (recentErrorsResp.data ?? []).map((row) => ({
      fileId: row.file_id,
      error: row.error,
      processedAt: row.processed_at,
    }));

    return res.json({
      config: connectorMetadata,
      connector: connectorStatus,
      queue: {
        pending: pendingQueue.count ?? 0,
        failed24h: failedQueue.count ?? 0,
        recentErrors,
      },
      metadata: {
        total: metadataCounts.count ?? 0,
        blocked: blockedCounts.count ?? 0,
      },
    });
  } catch (err) {
    logError('knowledge.drive_status_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'fetch failed' });
  }
});

app.get('/api/learning/jobs', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    const orgSlug = typeof req.query.orgSlug === 'string' ? req.query.orgSlug : undefined;
    const statusFilter = typeof req.query.status === 'string' ? req.query.status : undefined;
    if (!userId || !orgSlug) {
      return res.status(400).json({ error: 'orgSlug required' });
    }

    const { orgId, role } = await resolveOrgForUser(userId, orgSlug);
    if (!hasManagerPrivileges(role)) {
      return res.status(403).json({ error: 'insufficient_role' });
    }

    let query = supabaseService
      .from('agent_learning_jobs')
      .select('id, org_id, kind, status, payload, result, policy_version_id, created_at, updated_at, processed_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return res.json({ jobs: data ?? [] });
  } catch (err) {
    logError('learning.jobs_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'fetch failed' });
  }
});

app.post('/api/learning/approve', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    const { orgSlug, jobId, note } = (await req.json()) as {
      orgSlug?: string;
      jobId?: string;
      note?: string;
    };

    if (!userId || !orgSlug || !jobId) {
      return res.status(400).json({ error: 'orgSlug and jobId required' });
    }

    const { orgId, role } = await resolveOrgForUser(userId, orgSlug);
    if (!hasManagerPrivileges(role)) {
      return res.status(403).json({ error: 'insufficient_role' });
    }

    const job = await fetchLearningJob(jobId);
    if (!job || job.org_id !== orgId) {
      return res.status(404).json({ error: 'job not found' });
    }

    if (job.status !== 'PENDING') {
      return res.status(409).json({ error: 'job_not_pending' });
    }

    const approvalInfo = {
      approved_by: userId,
      approved_at: new Date().toISOString(),
      note: note ?? null,
    };

    const { error: updateError } = await supabaseService
      .from('agent_learning_jobs')
      .update({
        status: 'READY',
        updated_at: approvalInfo.approved_at,
        result: { ...(job.result ?? {}), approval: approvalInfo },
      })
      .eq('id', jobId)
      .eq('org_id', orgId);

    if (updateError) {
      throw updateError;
    }

    await supabaseService.from('learning_signals').insert({
      org_id: orgId,
      run_id: null,
      source: 'api.approve',
      kind: `job_approved:${job.kind}`,
      payload: { job_id: jobId, approval: approvalInfo },
    });

    return res.json({ status: 'READY', jobId });
  } catch (err) {
    logError('learning.job_approve_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'approve failed' });
  }
});

app.get('/api/learning/policies', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    const orgSlug = typeof req.query.orgSlug === 'string' ? req.query.orgSlug : undefined;
    if (!userId || !orgSlug) {
      return res.status(400).json({ error: 'orgSlug required' });
    }

    const { orgId, role } = await resolveOrgForUser(userId, orgSlug);
    if (!hasManagerPrivileges(role)) {
      return res.status(403).json({ error: 'insufficient_role' });
    }

    const { data, error } = await supabaseService
      .from('agent_policy_versions')
      .select('id, version, status, summary, diff, approved_by, approved_at, rolled_back_at, created_at, updated_at')
      .eq('org_id', orgId)
      .order('version', { ascending: false });

    if (error) {
      throw error;
    }

    return res.json({ policies: data ?? [] });
  } catch (err) {
    logError('learning.policies_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'fetch failed' });
  }
});

app.get('/api/learning/metrics', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    const orgSlug = typeof req.query.orgSlug === 'string' ? req.query.orgSlug : undefined;
    const metric = typeof req.query.metric === 'string' ? req.query.metric : undefined;
    const limit = Math.max(1, Math.min(200, Number(req.query.limit ?? '50')));
    if (!userId || !orgSlug) {
      return res.status(400).json({ error: 'orgSlug required' });
    }

    const { orgId, role } = await resolveOrgForUser(userId, orgSlug);
    if (!hasManagerPrivileges(role)) {
      return res.status(403).json({ error: 'insufficient_role' });
    }

    let query = supabaseService
      .from('learning_metrics')
      .select('id, window:window_name, metric, value, dims, computed_at')
      .eq('org_id', orgId)
      .order('computed_at', { ascending: false })
      .limit(limit);

    if (metric) {
      query = query.eq('metric', metric);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return res.json({ metrics: data ?? [] });
  } catch (err) {
    logError('learning.metrics_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'fetch failed' });
  }
});

app.post('/api/learning/rollback', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    const { orgSlug, policyVersionId, note } = (await req.json()) as {
      orgSlug?: string;
      policyVersionId?: string;
      note?: string;
    };

    if (!userId || !orgSlug || !policyVersionId) {
      return res.status(400).json({ error: 'orgSlug and policyVersionId required' });
    }

    const { orgId, role } = await resolveOrgForUser(userId, orgSlug);
    if (!hasManagerPrivileges(role)) {
      return res.status(403).json({ error: 'insufficient_role' });
    }

    const { data: policy, error: policyError } = await supabaseService
      .from('agent_policy_versions')
      .select('id, status')
      .eq('id', policyVersionId)
      .eq('org_id', orgId)
      .maybeSingle();

    if (policyError) {
      throw policyError;
    }
    if (!policy) {
      return res.status(404).json({ error: 'policy_not_found' });
    }
    if (policy.status === 'rolled_back') {
      return res.status(409).json({ error: 'policy_already_rolled_back' });
    }

    await rollbackPolicyVersion(orgId, policyVersionId, note);

    return res.json({ status: 'rolled_back', policyVersionId });
  } catch (err) {
    logError('learning.rollback_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'rollback failed' });
  }
});

app.get('/v1/knowledge/sources/:id/preview', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    const orgSlugQuery = typeof req.query.orgSlug === 'string' ? req.query.orgSlug : undefined;
    if (!userId || !orgSlugQuery) {
      return res.status(400).json({ error: 'orgSlug required' });
    }

    const sourceId = req.params.id;
    const { data: source, error: sourceError } = await supabaseService
      .from('knowledge_sources')
      .select('id, corpus_id, source_uri')
      .eq('id', sourceId)
      .maybeSingle();

    if (sourceError || !source) {
      return res.status(404).json({ error: 'knowledge source not found' });
    }

    const { data: corpus, error: corpusError } = await supabaseService
      .from('knowledge_corpora')
      .select('id, org_id')
      .eq('id', source.corpus_id)
      .maybeSingle();

    if (corpusError || !corpus) {
      return res.status(404).json({ error: 'knowledge corpus not found' });
    }

    const { data: orgRow, error: orgError } = await supabaseService
      .from('organizations')
      .select('slug')
      .eq('id', corpus.org_id)
      .maybeSingle();

    if (orgError || !orgRow) {
      return res.status(404).json({ error: 'organization not found' });
    }

    if (orgRow.slug !== orgSlugQuery) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const { role } = await resolveOrgForUser(userId, orgSlugQuery);
    if (!hasManagerPrivileges(role)) {
      return res.status(403).json({ error: 'insufficient_role' });
    }

    if (source.provider === 'web_catalog') {
      if (!source.source_uri) {
        return res.status(400).json({ error: 'web source id missing' });
      }
      const webSource = await getWebSource(source.source_uri);
      return res.json({
        webSource,
        placeholder: false,
        documents: [
          {
            id: webSource.id,
            name: webSource.title,
            mimeType: 'text/html',
            modifiedTime: new Date().toISOString(),
            downloadUrl: webSource.url,
          },
        ],
      });
    }

    const driveSource: DriveSource = {
      id: source.id,
      corpusId: source.corpus_id,
      sourceUri: source.source_uri ?? '',
      orgId: corpus.org_id,
    };

    const documents = await previewDriveDocuments(driveSource);
    return res.json({ documents, placeholder: false });
  } catch (err) {
    logError('knowledge.preview_failed', err, { userId: req.user?.sub, sourceId: req.params.id });
    return res.status(500).json({ error: 'preview failed' });
  }
});

app.post('/v1/knowledge/runs', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    const { orgSlug, agentKind, mode, sourceId } = req.body as {
      orgSlug?: string;
      agentKind?: AgentPersona;
      mode?: LearningMode;
      sourceId?: string;
    };

    if (!userId || !orgSlug || !agentKind || !mode || !sourceId) {
      return res.status(400).json({ error: 'missing required fields' });
    }

    const { orgId, role } = await resolveOrgForUser(userId, orgSlug);
    if (!hasManagerPrivileges(role)) {
      return res.status(403).json({ error: 'insufficient_role' });
    }

    const { data: source, error: sourceError } = await supabaseService
      .from('knowledge_sources')
      .select('id, corpus_id, provider, source_uri, state')
      .eq('id', sourceId)
      .maybeSingle();

    if (sourceError || !source) {
      return res.status(404).json({ error: 'knowledge source not found' });
    }

    const { data: corpus, error: corpusError } = await supabaseService
      .from('knowledge_corpora')
      .select('org_id')
      .eq('id', source.corpus_id)
      .maybeSingle();

    if (corpusError || !corpus || corpus.org_id !== orgId) {
      return res.status(403).json({ error: 'source not in organization' });
    }

    if (source.provider === 'web_catalog') {
      if (!source.source_uri) {
        return res.status(400).json({ error: 'web source id missing' });
      }

      const runRow = await queueWebHarvestJob({
        knowledgeSourceId: source.id,
        webSourceId: source.source_uri,
        orgId,
        agentKind,
        initiatedBy: userId,
        mode,
      });

      return res.status(202).json({ run: runRow });
    }

    const run = await scheduleLearningRun({
      orgId,
      agentKind,
      mode,
      corpusId: source.corpus_id,
      sourceId: source.id,
      initiatedBy: userId,
    });

    return res.status(202).json({ run });
  } catch (err) {
    logError('knowledge.schedule_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'schedule failed' });
  }
});

app.get('/v1/knowledge/web-sources', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    const orgSlug = typeof req.query.orgSlug === 'string' ? req.query.orgSlug : undefined;
    if (!userId || !orgSlug) {
      return res.status(400).json({ error: 'orgSlug required' });
    }

    const { role } = await resolveOrgForUser(userId, orgSlug);
    if (!hasManagerPrivileges(role)) {
      return res.status(403).json({ error: 'insufficient_role' });
    }

    const sources = await listWebSources();
    return res.json({ sources });
  } catch (err) {
    logError('knowledge.web_sources_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'fetch failed' });
  }
});

app.post('/v1/knowledge/web-harvest', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    const { orgSlug, agentKind: requestedAgentKind, webSourceId } = req.body as {
      orgSlug?: string;
      agentKind?: AgentPersona;
      webSourceId?: string;
    };

    if (!userId || !orgSlug || !webSourceId) {
      return res.status(400).json({ error: 'missing required fields' });
    }

    const { orgId, role } = await resolveOrgForUser(userId, orgSlug);
    if (!hasManagerPrivileges(role)) {
      return res.status(403).json({ error: 'insufficient_role' });
    }

    const webSource = await getWebSource(webSourceId);
    const mapping = resolveWebDomainMetadata(webSource.domain);
    const targetAgent = requestedAgentKind ?? mapping.agentKind;

    const corpus = await ensureCorpusForDomain(orgId, mapping.corpusDomain);
    const knowledgeSource = await ensureKnowledgeSourceLink(corpus.id, webSourceId);

    const mode: LearningMode = knowledgeSource.last_sync_at ? 'CONTINUOUS' : 'INITIAL';
    const run = await queueWebHarvestJob({
      knowledgeSourceId: knowledgeSource.id,
      webSourceId,
      orgId,
      agentKind: targetAgent,
      initiatedBy: userId,
      mode,
    });

    return res.status(202).json({ run });
  } catch (err) {
    logError('knowledge.web_harvest_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'schedule failed' });
  }
});

app.post('/api/gdrive/backfill', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    const { orgSlug, sourceId } = req.body as { orgSlug?: string; sourceId?: string };

    if (!userId || !orgSlug) {
      return res.status(400).json({ error: 'orgSlug required' });
    }

    const { orgId, role } = await resolveOrgForUser(userId, orgSlug);
    if (!hasManagerPrivileges(role)) {
      return res.status(403).json({ error: 'insufficient_role' });
    }

    if (sourceId) {
      const { data: source, error: sourceError } = await supabaseService
        .from('knowledge_sources')
        .select('id, corpus_id')
        .eq('id', sourceId)
        .maybeSingle();

      if (sourceError || !source) {
        return res.status(404).json({ error: 'knowledge source not found' });
      }

      const { data: corpus, error: corpusError } = await supabaseService
        .from('knowledge_corpora')
        .select('org_id')
        .eq('id', source.corpus_id)
        .maybeSingle();

      if (corpusError || !corpus || corpus.org_id !== orgId) {
        return res.status(403).json({ error: 'source not in organization' });
      }
    }

    const batchLimit = Math.max(
      1,
      Math.min(100, Number((req.body as Record<string, unknown>)?.limit ?? GDRIVE_QUEUE_PROCESS_LIMIT)),
    );

    const { connectorId, queued } = await triggerDriveBackfill({ orgId, sourceId: sourceId ?? null });
    const queueOutcome = await processDriveQueueEntries(orgId, connectorId, batchLimit);
    const remaining = Math.max(queued - (queueOutcome.processed + queueOutcome.skipped + queueOutcome.failed), 0);

    return res.json({ connectorId, queued, remaining, ...queueOutcome });
  } catch (err) {
    logError('gdrive.backfill_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'backfill failed' });
  }
});

app.post('/api/gdrive/process-changes', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    const { orgSlug, connectorId: connectorIdInput, pageToken, sourceId, limit } = req.body as {
      orgSlug?: string;
      connectorId?: string;
      pageToken?: string;
      sourceId?: string;
      limit?: number;
    };

    if (!userId || !orgSlug) {
      return res.status(400).json({ error: 'orgSlug required' });
    }

    const { orgId, role } = await resolveOrgForUser(userId, orgSlug);
    if (!hasManagerPrivileges(role)) {
      return res.status(403).json({ error: 'insufficient_role' });
    }

    let connectorId = connectorIdInput ?? null;
    if (!connectorId) {
      connectorId = await getConnectorIdForOrg(orgId, sourceId ?? null);
    }

    if (!connectorId) {
      return res.status(404).json({ error: 'connector not found' });
    }

    const changeResult = await processDriveChanges({ orgId, connectorId, pageToken });
    const batchLimit = Math.max(1, Math.min(100, Number(limit ?? GDRIVE_QUEUE_PROCESS_LIMIT)));
    const queueOutcome = await processDriveQueueEntries(orgId, connectorId, batchLimit);

    return res.json({ connectorId, ...changeResult, ...queueOutcome });
  } catch (err) {
    logError('gdrive.process_changes_failed', err, { userId: req.user?.sub });
    if ((err as Error).message === 'missing_page_token') {
      return res.status(409).json({ error: 'missing_page_token' });
    }
    if ((err as Error).message === 'connector_not_found') {
      return res.status(404).json({ error: 'connector not found' });
    }
    return res.status(500).json({ error: 'process changes failed' });
  }
});

app.post('/v1/knowledge/corpora', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    const { orgSlug, name, domain, jurisdictions, retention, isDefault } = req.body as {
      orgSlug?: string;
      name?: string;
      domain?: string;
      jurisdictions?: string[] | string | null;
      retention?: string | null;
      isDefault?: boolean;
    };

    if (!userId || !orgSlug || !name || !domain) {
      return res.status(400).json({ error: 'missing required fields' });
    }

    const { orgId, role } = await resolveOrgForUser(userId, orgSlug);
    if (!hasManagerPrivileges(role)) {
      return res.status(403).json({ error: 'insufficient_role' });
    }

    const jurisdictionArray = Array.isArray(jurisdictions)
      ? jurisdictions
      : jurisdictions
      ? jurisdictions.split(',').map((j) => j.trim()).filter(Boolean)
      : [];

    const { data, error } = await supabaseService
      .from('knowledge_corpora')
      .insert({
        org_id: orgId,
        name,
        domain,
        jurisdiction: jurisdictionArray,
        retention: retention ?? null,
        is_default: Boolean(isDefault),
      })
      .select('id, name, domain, jurisdiction, retention, is_default, created_at')
      .single();

    if (error) {
      throw error;
    }

    return res.status(201).json({ corpus: data });
  } catch (err) {
    logError('knowledge.corpus_create_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'create failed' });
  }
});

app.post('/v1/knowledge/sources', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    const { orgSlug, corpusId, provider, sourceUri } = req.body as {
      orgSlug?: string;
      corpusId?: string;
      provider?: string;
      sourceUri?: string;
    };

    if (!userId || !orgSlug || !corpusId || !provider || !sourceUri) {
      return res.status(400).json({ error: 'missing required fields' });
    }

    const { orgId, role } = await resolveOrgForUser(userId, orgSlug);
    if (!hasManagerPrivileges(role)) {
      return res.status(403).json({ error: 'insufficient_role' });
    }

    const { data: corpus, error: corpusError } = await supabaseService
      .from('knowledge_corpora')
      .select('org_id')
      .eq('id', corpusId)
      .maybeSingle();

    if (corpusError || !corpus || corpus.org_id !== orgId) {
      return res.status(403).json({ error: 'corpus not found for org' });
    }

    const { data, error } = await supabaseService
      .from('knowledge_sources')
      .insert({
        corpus_id: corpusId,
        provider,
        source_uri: sourceUri,
      })
      .select('id, corpus_id, provider, source_uri, created_at, last_sync_at')
      .single();

    if (error) {
      throw error;
    }

    return res.status(201).json({ source: data });
  } catch (err) {
    logError('knowledge.source_create_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'create failed' });
  }
});

app.post('/v1/agents/query', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    const { orgSlug, agentKind, question, context } = req.body as {
      orgSlug?: string;
      agentKind?: 'AUDIT' | 'FINANCE' | 'TAX';
      question?: string;
      context?: string | null;
    };

    if (!userId || !orgSlug || !agentKind || !question) {
      return res.status(400).json({ error: 'missing required fields' });
    }

    const { orgId, role } = await resolveOrgForUser(userId, orgSlug);
    if (!hasManagerPrivileges(role) && agentKind === 'TAX') {
      // Example of applying extra guardrails per persona if needed.
      logInfo('agent.restricted_access', { userId, orgId, agentKind });
    }

    const { data: session } = await supabaseService
      .from('agent_sessions')
      .insert({
        org_id: orgId,
        user_id: userId,
        kind: agentKind,
      })
      .select('id')
      .single();

    const sessionId = session?.id ?? null;

    const result = await runAgentConversation({
      orgId,
      agentKind,
      question,
      context: context ?? undefined,
    });

    if (sessionId) {
      await supabaseService
        .from('agent_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', sessionId);

      await supabaseService.from('agent_logs').insert({
        org_id: orgId,
        session_id: sessionId,
        route: '/v1/agents/query',
        model: AGENT_MODEL,
        tools: result.toolInvocations,
        prompt_tokens: result.usage.prompt_tokens ?? null,
        completion_tokens: result.usage.completion_tokens ?? null,
        created_at: new Date().toISOString(),
        latency_ms: result.latencyMs,
        answer_preview: result.answer.slice(0, 280),
        citations: result.citations,
        severity: 'info',
      });
    }

    return res.json({
      answer: result.answer,
      citations: result.citations,
      usage: result.usage,
      latencyMs: result.latencyMs,
    });
  } catch (err) {
    logError('agent.query_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'agent query failed' });
  }
});

app.patch('/v1/notifications/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    const notificationId = req.params.id;
    const { read } = req.body as { read?: boolean };

    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const { data: notification, error: fetchError } = await supabaseService
      .from('notifications')
      .select('id, org_id, user_id, read')
      .eq('id', notificationId)
      .maybeSingle();

    if (fetchError || !notification) {
      return res.status(404).json({ error: 'notification not found' });
    }

    const { data: orgRow } = await supabaseService
      .from('organizations')
      .select('slug')
      .eq('id', notification.org_id)
      .maybeSingle();

    if (!orgRow) {
      return res.status(404).json({ error: 'organization not found' });
    }

    await resolveOrgForUser(userId, orgRow.slug);

    if (notification.user_id !== userId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const { data: updated, error: updateError } = await supabaseService
      .from('notifications')
      .update({ read: read ?? true })
      .eq('id', notificationId)
      .select('id, org_id, user_id, title, body, kind, link, urgent, read, created_at')
      .single();

    if (updateError) {
      throw updateError;
    }

    return res.json({ notification: updated });
  } catch (err) {
    logError('notifications.update_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'update failed' });
  }
});

app.post('/v1/notifications/mark-all', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    const { orgSlug } = req.body as { orgSlug?: string };

    if (!userId || !orgSlug) {
      return res.status(400).json({ error: 'orgSlug required' });
    }

    const { orgId } = await resolveOrgForUser(userId, orgSlug);

    const { error } = await supabaseService
      .from('notifications')
      .update({ read: true })
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      throw error;
    }

    return res.status(204).send();
  } catch (err) {
    logError('notifications.mark_all_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'mark all failed' });
  }
});

app.get('/v1/engagements', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const orgSlug = typeof req.query.orgSlug === 'string' ? (req.query.orgSlug as string) : null;
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }

    const limit = Math.min(Number(req.query.limit ?? 50), 100);
    const offset = Math.max(Number(req.query.offset ?? 0), 0);

    const { orgId } = await resolveOrgForUser(userId, orgSlug);

    const independenceStatusRaw = Array.isArray(req.query.independenceStatus)
      ? (req.query.independenceStatus as string[])
      : typeof req.query.independenceStatus === 'string'
      ? (req.query.independenceStatus as string).split(',').map((value) => value.trim()).filter(Boolean)
      : [];
    const auditOnly = req.query.auditOnly === 'true';

    let query = supabaseService
      .from('engagements')
      .select(
        'id, org_id, client_id, title, description, status, start_date, end_date, budget, created_at, updated_at, is_audit_client, requires_eqr, non_audit_services, independence_checked, independence_conclusion, independence_conclusion_note'
      )
      .eq('org_id', orgId);

    if (auditOnly) {
      query = query.eq('is_audit_client', true);
    }
    if (independenceStatusRaw.length > 0) {
      query = query.in('independence_conclusion', independenceStatusRaw);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    const engagements = Array.isArray(data) ? data.map(mapEngagementRow) : [];
    return res.json({ engagements });
  } catch (err) {
    logError('engagements.list_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'list failed' });
  }
});

app.post('/v1/engagements', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const {
      orgSlug,
      clientId,
      title,
      description,
      status,
      startDate,
      endDate,
      budget,
      isAuditClient,
      requiresEqr,
      nonAuditServices,
      independenceChecked,
      overrideNote,
    } = req.body as {
      orgSlug?: string;
      clientId?: string;
      title?: string;
      description?: string | null;
      status?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      budget?: number | string | null;
      isAuditClient?: boolean;
      requiresEqr?: boolean;
      nonAuditServices?: unknown;
      independenceChecked?: boolean;
      overrideNote?: string | null;
    };

    if (!orgSlug || !clientId || !title) {
      return res.status(400).json({ error: 'orgSlug, clientId, and title are required' });
    }

    const orgContext = await resolveOrgForUser(userId, orgSlug);
    if (!hasManagerPrivileges(orgContext.role)) {
      return res.status(403).json({ error: 'manager role required' });
    }

    const { data: clientRow, error: clientError } = await supabaseService
      .from('clients')
      .select('org_id')
      .eq('id', clientId)
      .maybeSingle();
    if (clientError || !clientRow || clientRow.org_id !== orgContext.orgId) {
      return res.status(400).json({ error: 'client does not belong to organization' });
    }

    const normalizedStatus = typeof status === 'string' ? status.trim().toUpperCase() : 'PLANNING';
    const normalizedBudget = typeof budget === 'string' ? Number(budget) : budget;
    const sanitizedServices = sanitizeNonAuditServices(nonAuditServices);
    const sanitizedOverrideNote = toNullableString(overrideNote);

    const independenceAssessment = assessIndependence({
      isAuditClient: Boolean(isAuditClient),
      independenceChecked: Boolean(independenceChecked),
      services: sanitizedServices,
      overrideNote: sanitizedOverrideNote,
    });

    if (!independenceAssessment.ok) {
      if (independenceAssessment.error === 'independence_check_required') {
        return res.status(400).json({ error: 'independence_check_required' });
      }
      if (independenceAssessment.error === 'prohibited_nas') {
        return res.status(409).json({ error: 'prohibited_non_audit_services' });
      }
    }

    const payload = {
      org_id: orgContext.orgId,
      client_id: clientId,
      title,
      description: description ?? null,
      status: normalizedStatus.length > 0 ? normalizedStatus : 'PLANNING',
      start_date: startDate ?? null,
      end_date: endDate ?? null,
      budget:
        normalizedBudget === null
          ? null
          : typeof normalizedBudget === 'number' && Number.isFinite(normalizedBudget)
          ? normalizedBudget
          : null,
      is_audit_client: Boolean(isAuditClient),
      requires_eqr: Boolean(requiresEqr),
      non_audit_services: sanitizedServices.length > 0 ? sanitizedServices : null,
      independence_checked: independenceAssessment.checked,
      independence_conclusion: independenceAssessment.conclusion,
      independence_conclusion_note: independenceAssessment.note,
    };

    const { data: created, error } = await supabaseService
      .from('engagements')
      .insert(payload)
      .select(
        'id, org_id, client_id, title, description, status, start_date, end_date, budget, created_at, updated_at, is_audit_client, requires_eqr, non_audit_services, independence_checked, independence_conclusion, independence_conclusion_note'
      )
      .single();

    if (error || !created) {
      throw error ?? new Error('engagement_not_created');
    }

    let overrideApprovalId: string | null = null;
    if (independenceAssessment.needsApproval) {
      overrideApprovalId = await ensureIndependenceOverrideApproval({
        orgId: orgContext.orgId,
        engagementId: created.id,
        userId,
        note: independenceAssessment.note ?? '',
        services: sanitizedServices,
        isAuditClient: Boolean(isAuditClient),
      });
    }

    await supabaseService.from('activity_log').insert({
      org_id: orgContext.orgId,
      user_id: userId,
      action: 'CREATE_ENGAGEMENT',
      entity_type: 'engagement',
      entity_id: created.id,
      metadata: {
        title: created.title,
        client_id: created.client_id,
        status: created.status,
        independence: {
          conclusion: independenceAssessment.conclusion,
          overrideApprovalId,
        },
      },
    });

    logInfo('engagements.created', { userId, engagementId: created.id, orgId: orgContext.orgId });
    return res.status(201).json({ engagement: mapEngagementRow(created) });
  } catch (err) {
    logError('engagements.create_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'create failed' });
  }
});

app.patch('/v1/engagements/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const engagementId = req.params.id;
    const orgSlugFromQuery = typeof req.query.orgSlug === 'string' ? (req.query.orgSlug as string) : undefined;

    const bodyPayload = req.body as {
      orgSlug?: string;
      clientId?: string;
      title?: string;
      description?: string | null;
      status?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      budget?: number | string | null;
      isAuditClient?: boolean;
      requiresEqr?: boolean;
      nonAuditServices?: unknown;
      independenceChecked?: boolean;
      overrideNote?: string | null;
    };

    const orgSlug = orgSlugFromQuery ?? bodyPayload.orgSlug;
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }

    const orgContext = await resolveOrgForUser(userId, orgSlug);
    if (!hasManagerPrivileges(orgContext.role)) {
      return res.status(403).json({ error: 'manager role required' });
    }

    const { data: existing, error: existingError } = await supabaseService
      .from('engagements')
      .select(
        'id, org_id, client_id, title, description, status, start_date, end_date, budget, is_audit_client, requires_eqr, non_audit_services, independence_checked, independence_conclusion, independence_conclusion_note'
      )
      .eq('id', engagementId)
      .maybeSingle();

    if (existingError || !existing || existing.org_id !== orgContext.orgId) {
      return res.status(404).json({ error: 'engagement not found' });
    }

    const updatePayload: Record<string, unknown> = {};

    if (typeof bodyPayload.clientId === 'string') {
      if (bodyPayload.clientId !== existing.client_id) {
        const { data: clientRow, error: clientError } = await supabaseService
          .from('clients')
          .select('org_id')
          .eq('id', bodyPayload.clientId)
          .maybeSingle();

        if (clientError || !clientRow || clientRow.org_id !== orgContext.orgId) {
          return res.status(400).json({ error: 'client does not belong to organization' });
        }
      }
      updatePayload.client_id = bodyPayload.clientId;
    }

    if (typeof bodyPayload.title === 'string') updatePayload.title = bodyPayload.title;
    if (typeof bodyPayload.description !== 'undefined') {
      updatePayload.description = bodyPayload.description ?? null;
    }

    const normalizedStatus = typeof bodyPayload.status === 'string'
      ? bodyPayload.status.trim().toUpperCase()
      : undefined;
    if (normalizedStatus && normalizedStatus.length > 0) {
      updatePayload.status = normalizedStatus;
    }

    if (typeof bodyPayload.startDate !== 'undefined') {
      updatePayload.start_date = bodyPayload.startDate ?? null;
    }
    if (typeof bodyPayload.endDate !== 'undefined') {
      updatePayload.end_date = bodyPayload.endDate ?? null;
    }

    if (typeof bodyPayload.budget !== 'undefined') {
      if (bodyPayload.budget === null) {
        updatePayload.budget = null;
      } else if (typeof bodyPayload.budget === 'number') {
        updatePayload.budget = Number.isFinite(bodyPayload.budget) ? bodyPayload.budget : null;
      } else if (typeof bodyPayload.budget === 'string') {
        const parsed = Number(bodyPayload.budget);
        updatePayload.budget = Number.isFinite(parsed) ? parsed : null;
      }
    }

    const independenceFieldsProvided =
      typeof bodyPayload.isAuditClient === 'boolean' ||
      typeof bodyPayload.requiresEqr === 'boolean' ||
      typeof bodyPayload.nonAuditServices !== 'undefined' ||
      typeof bodyPayload.independenceChecked === 'boolean' ||
      typeof bodyPayload.overrideNote !== 'undefined';

    const targetIsAuditClient = Boolean(
      typeof bodyPayload.isAuditClient === 'boolean' ? bodyPayload.isAuditClient : existing.is_audit_client,
    );
    const targetRequiresEqr = Boolean(
      typeof bodyPayload.requiresEqr === 'boolean' ? bodyPayload.requiresEqr : existing.requires_eqr,
    );

    let targetServices =
      typeof bodyPayload.nonAuditServices !== 'undefined'
        ? sanitizeNonAuditServices(bodyPayload.nonAuditServices)
        : sanitizeNonAuditServices(existing.non_audit_services);

    let targetIndependenceChecked =
      typeof bodyPayload.independenceChecked === 'boolean'
        ? bodyPayload.independenceChecked
        : Boolean(existing.independence_checked);

    let targetOverrideNote =
      typeof bodyPayload.overrideNote === 'undefined'
        ? toNullableString(existing.independence_conclusion_note)
        : toNullableString(bodyPayload.overrideNote);

    let independenceAssessment: IndependenceAssessmentResult | null = null;
    let overrideApprovalId: string | null = null;

    if (independenceFieldsProvided) {
      independenceAssessment = assessIndependence({
        isAuditClient: targetIsAuditClient,
        independenceChecked: targetIndependenceChecked,
        services: targetServices,
        overrideNote: targetOverrideNote,
      });

      if (!independenceAssessment.ok) {
        if (independenceAssessment.error === 'independence_check_required') {
          return res.status(400).json({ error: 'independence_check_required' });
        }
        if (independenceAssessment.error === 'prohibited_nas') {
          return res.status(409).json({ error: 'prohibited_non_audit_services' });
        }
      } else {
        targetIndependenceChecked = independenceAssessment.checked;
        targetOverrideNote = independenceAssessment.note;
        targetServices = independenceAssessment.services;

        updatePayload.independence_checked = independenceAssessment.checked;
        updatePayload.independence_conclusion = independenceAssessment.conclusion;
        updatePayload.independence_conclusion_note = independenceAssessment.note;
        updatePayload.non_audit_services = targetServices.length > 0 ? targetServices : null;
        updatePayload.is_audit_client = targetIsAuditClient;
        updatePayload.requires_eqr = targetRequiresEqr;

        if (independenceAssessment.needsApproval && targetOverrideNote) {
          overrideApprovalId = await ensureIndependenceOverrideApproval({
            orgId: orgContext.orgId,
            engagementId,
            userId,
            note: targetOverrideNote,
            services: targetServices,
            isAuditClient: targetIsAuditClient,
          });
        }
      }
    } else {
      if (typeof bodyPayload.isAuditClient === 'boolean') {
        updatePayload.is_audit_client = targetIsAuditClient;
      }
      if (typeof bodyPayload.requiresEqr === 'boolean') {
        updatePayload.requires_eqr = targetRequiresEqr;
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ error: 'no updates provided' });
    }

    const currentStatus = (existing.status ?? 'PLANNING').toUpperCase();
    const nextStatus = normalizedStatus && normalizedStatus.length > 0 ? normalizedStatus : currentStatus;

    const finalConclusion =
      independenceAssessment && independenceAssessment.ok
        ? independenceAssessment.conclusion
        : typeof existing.independence_conclusion === 'string'
        ? existing.independence_conclusion
        : 'OK';

    const finalIndependenceChecked =
      independenceAssessment && independenceAssessment.ok
        ? independenceAssessment.checked
        : Boolean(existing.independence_checked);

    const activating = currentStatus === 'PLANNING' && nextStatus !== 'PLANNING';

    if (activating && targetIsAuditClient) {
      if (!finalIndependenceChecked) {
        return res.status(400).json({ error: 'independence_check_required' });
      }
      if (finalConclusion === 'OVERRIDE') {
        const overrideApproved = await hasApprovedIndependenceOverride(orgContext.orgId, engagementId);
        if (!overrideApproved) {
          return res.status(409).json({ error: 'independence_override_pending' });
        }
      } else if (finalConclusion !== 'OK') {
        return res.status(409).json({ error: 'independence_blocked' });
      }
    }

    const { data: updated, error: updateError } = await supabaseService
      .from('engagements')
      .update(updatePayload)
      .eq('id', engagementId)
      .select(
        'id, org_id, client_id, title, description, status, start_date, end_date, budget, created_at, updated_at, is_audit_client, requires_eqr, non_audit_services, independence_checked, independence_conclusion, independence_conclusion_note'
      )
      .single();

    if (updateError || !updated) {
      throw updateError ?? new Error('engagement_not_updated');
    }

    await supabaseService.from('activity_log').insert({
      org_id: orgContext.orgId,
      user_id: userId,
      action: 'UPDATE_ENGAGEMENT',
      entity_type: 'engagement',
      entity_id: engagementId,
      metadata: {
        updates: updatePayload,
        independence: {
          conclusion: updated.independence_conclusion,
          ...(overrideApprovalId ? { overrideApprovalId } : {}),
        },
      },
    });

    return res.json({ engagement: mapEngagementRow(updated) });
  } catch (err) {
    logError('engagements.update_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'update failed' });
  }
});

app.delete('/v1/engagements/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
    }

    const engagementId = req.params.id;
    const orgSlug = typeof req.query.orgSlug === 'string' ? (req.query.orgSlug as string) : null;
    if (!orgSlug) {
      return res.status(400).json({ error: 'orgSlug is required' });
    }

    const orgContext = await resolveOrgForUser(userId, orgSlug);
    if (!hasManagerPrivileges(orgContext.role)) {
      return res.status(403).json({ error: 'manager role required' });
    }

    const { data: existing, error: existingError } = await supabaseService
      .from('engagements')
      .select('id, org_id')
      .eq('id', engagementId)
      .maybeSingle();

    if (existingError || !existing || existing.org_id !== orgContext.orgId) {
      return res.status(404).json({ error: 'engagement not found' });
    }

    const { error } = await supabaseService
      .from('engagements')
      .delete()
      .eq('id', engagementId);

    if (error) {
      throw error;
    }

    await supabaseService.from('activity_log').insert({
      org_id: orgContext.orgId,
      user_id: userId,
      action: 'DELETE_ENGAGEMENT',
      entity_type: 'engagement',
      entity_id: engagementId,
      metadata: {},
    });

    return res.status(204).send();
  } catch (err) {
    logError('engagements.delete_failed', err, { userId: req.user?.sub });
    return res.status(500).json({ error: 'delete failed' });
  }
});

startRealtimeKnowledgeWatchers();

void (async () => {
  await bootstrapWebLearning();
  if (WEB_HARVEST_INTERVAL_MS > 0) {
    setInterval(() => {
      bootstrapWebLearning().catch((err) =>
        logError('web.bootstrap_failed_interval', err, {}),
      );
    }, WEB_HARVEST_INTERVAL_MS).unref();
  }
})();

if (SENTRY_ENABLED) {
  app.use(Sentry.Handlers.errorHandler());
}

export default app;
