/* eslint-env node */
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import Tesseract from 'tesseract.js';
import { Client } from 'pg';
import { vector } from 'pgvector';
import NodeCache from 'node-cache';
import OpenAI from 'openai';
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
import { buildReadinessSummary } from './readiness';
import { getUrlSourceSettings, type UrlSourceSettings } from './system-config';

type AgentPersona = 'AUDIT' | 'FINANCE' | 'TAX';
type LearningMode = 'INITIAL' | 'CONTINUOUS';

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME ?? 'rag-service';
const OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
let telemetryInitialised = false;

function configureTelemetry(): void {
  if (telemetryInitialised) {
    return;
  }

  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
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
const SENTRY_ENVIRONMENT =
  process.env.SENTRY_ENVIRONMENT ?? process.env.ENVIRONMENT ?? 'development';
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
let webBootstrapRunning = false;

type RobotsRules = { allow: string[]; disallow: string[] };
const robotsCache = new Map<string, { rules: RobotsRules; fetchedAt: number }>();

type WebCacheRow = {
  id: string;
  url: string;
  content: string | null;
  fetched_at: string | null;
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
    .select('id, url, content, fetched_at, status, metadata')
    .eq('url', url)
    .maybeSingle();
  if (error && status !== 406) {
    throw error;
  }
  return (data as WebCacheRow | null) ?? null;
}

async function upsertWebCache(url: string, content: string, metadata: Record<string, any>, status = 'fetched') {
  const payload = {
    url,
    content,
    content_hash: createHash('sha256').update(content).digest('hex'),
    status,
    fetched_at: new Date().toISOString(),
    metadata,
  };
  const { error } = await supabaseService.from('web_fetch_cache').upsert(payload, { onConflict: 'url' });
  if (error) {
    throw error;
  }
}

async function touchWebCache(cache: WebCacheRow, metadataUpdates: Record<string, any>) {
  const merged = { ...(cache.metadata ?? {}), ...metadataUpdates };
  const { error } = await supabaseService
    .from('web_fetch_cache')
    .update({ metadata: merged })
    .eq('id', cache.id);
  if (error) {
    console.warn(JSON.stringify({ level: 'warn', msg: 'web.cache_touch_failed', url: cache.url, error: error.message }));
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

function sanitizeNonAuditServices(input: unknown): NonAuditService[] {
  if (!Array.isArray(input)) return [];
  const services: NonAuditService[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const name = typeof record.service === 'string' ? record.service.trim() : '';
    if (!name) continue;
    const prohibited = Boolean(record.prohibited);
    const description = typeof record.description === 'string' ? record.description : null;
    services.push({ service: name, prohibited, description });
    if (services.length >= 100) break;
  }
  return services;
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
  if (!isAuditClient) {
    return {
      ok: true,
      conclusion: 'OK',
      checked,
      note: null,
      services,
      prohibitedCount: services.filter((svc) => svc.prohibited).length,
      needsApproval: false,
    };
  }

  if (!independenceChecked) {
    return { ok: false, error: 'independence_check_required' };
  }

  const prohibitedCount = services.filter((svc) => svc.prohibited).length;
  if (prohibitedCount === 0) {
    return {
      ok: true,
      conclusion: 'OK',
      checked: true,
      note: null,
      services,
      prohibitedCount,
      needsApproval: false,
    };
  }

  const normalizedNote = typeof overrideNote === 'string' ? overrideNote.trim() : '';
  if (normalizedNote.length === 0) {
    return { ok: false, error: 'prohibited_nas', prohibitedCount };
  }

  return {
    ok: true,
    conclusion: 'OVERRIDE',
    checked: true,
    note: normalizedNote,
    services,
    prohibitedCount,
    needsApproval: true,
  };
}

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

if (!JWT_SECRET) {
  throw new Error('SUPABASE_JWT_SECRET must be set to secure the RAG service.');
}

const upload = multer();
const cache = new NodeCache({ stdTTL: 60 });

const RATE_LIMIT = Number(process.env.API_RATE_LIMIT ?? '60');
const RATE_WINDOW_MS = Number(process.env.API_RATE_WINDOW_SECONDS ?? '60') * 1000;
const requestBuckets = new Map<string, number[]>();

const requestContext = new AsyncLocalStorage<{ requestId: string }>();

const GDRIVE_QUEUE_PROCESS_LIMIT = Number(process.env.GDRIVE_PROCESS_BATCH_LIMIT ?? '10');
const driveUploaderCache = new Map<string, string>();
type DriveFileMetadata = { metadata: Record<string, unknown>; allowlisted_domain: boolean };

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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const OPENAI_WEB_SEARCH_ENABLED =
  (process.env.OPENAI_WEB_SEARCH_ENABLED ?? 'false').toLowerCase() === 'true';
const OPENAI_WEB_SEARCH_MODEL = process.env.OPENAI_WEB_SEARCH_MODEL ?? 'gpt-4.1-mini';
const OPENAI_SUMMARY_MODEL = process.env.OPENAI_SUMMARY_MODEL ?? OPENAI_WEB_SEARCH_MODEL;

const SUPABASE_URL = process.env.SUPABASE_URL;
if (!SUPABASE_URL) {
  throw new Error('SUPABASE_URL must be configured.');
}

const SUPABASE_SERVICE_ROLE_KEY = await getSupabaseServiceRoleKey();

const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
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

async function ensureDocumentsBucket() {
  const { data: bucket } = await supabaseService.storage.getBucket('documents');
  if (!bucket) {
    await supabaseService.storage.createBucket('documents', { public: false });
  }
}

await ensureDocumentsBucket();

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
    return pending.id as string;
  }

  const context = {
    engagementId,
    isAuditClient,
    nonAuditServices: services,
    note,
  };

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

  return { orgId: org.id, role: membership.role as 'EMPLOYEE' | 'MANAGER' | 'SYSTEM_ADMIN' };
}

function hasManagerPrivileges(role: 'EMPLOYEE' | 'MANAGER' | 'SYSTEM_ADMIN') {
  return role === 'MANAGER' || role === 'SYSTEM_ADMIN';
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

async function embed(texts: string[]): Promise<number[][]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });
  return res.data.map((d) => d.embedding);
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

  const embeddings = await embed(chunks);
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
    throw err;
  }

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
      const summary = extractResponseText(response)?.trim();
      if (summary) {
        return summary;
      }
    } catch (err) {
      logError('web.harvest_summary_web_search_failed', err, { url });
    }
  }

  try {
    const chat = await openai.chat.completions.create({
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
    });
    const summary = chat.choices[0]?.message?.content?.trim();
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
  try {
    const { data: linkRow } = await supabaseService
      .from('knowledge_sources')
      .select('state')
      .eq('id', options.knowledgeSourceId)
      .maybeSingle();
    if (linkRow?.state) {
      existingState = linkRow.state as Record<string, any>;
    }

    const webSource = await getWebSource(options.webSourceId);

    await supabaseService
      .from('learning_runs')
      .update({ status: 'processing' })
      .eq('id', options.runId);

    const urlSettings = await getUrlSourceSettings();
    const cacheTtlMs = Math.max(0, urlSettings.fetchPolicy.cacheTtlMinutes) * 60_000;
    const cached = await getCachedWebContent(webSource.url);

    let cleaned: string | null = null;
    let usedCache = false;
    let fetchedFresh = false;

    if (cached?.content) {
      const fetchedAt = cached.fetched_at ? Date.parse(cached.fetched_at) : Number.NaN;
      if (!Number.isNaN(fetchedAt) && Date.now() - fetchedAt <= cacheTtlMs) {
        cleaned = cached.content;
        usedCache = true;
        await touchWebCache(cached, { lastUsedAt: new Date().toISOString() });
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

    const summary = await summariseWebDocument(webSource.url, cleaned);
    const chunks = chunkText(cleaned, 700);
    if (chunks.length === 0) {
      throw new Error('No chunks generated from web content');
    }

    const embeddings = await embed(chunks);

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

async function performPolicyCheck(statement: string, domain?: string) {
  try {
    const completion = await openai.chat.completions.create({
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
    });
    const answer = completion.choices[0]?.message?.content ?? 'Policy review unavailable.';
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
    return await performPolicyCheck(statement, args.domain ? String(args.domain) : undefined);
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

    const { buffer, mimetype, originalname } = req.file;
    const text = await extractText(buffer, mimetype);
    const chunks = chunkText(text);
    const embeddings = await embed(chunks);

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
    res.json({ documentId: docId, chunks: chunks.length });
  } catch (err) {
    await db.query('ROLLBACK');
    logError('ingest.failed', err, { userId: req.user?.sub });
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

    const cacheKey = `search:${orgContext.orgId}:${limit}:${query}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      logInfo('search.cache_hit', { userId, orgId: orgContext.orgId, query });
      return res.json(cached);
    }

    const [queryEmbedding] = await embed([query]);
    const { rows } = await db.query(
      'SELECT doc_id, chunk_index, content, source, embedding <-> $1 AS distance FROM document_chunks WHERE org_id = $2 ORDER BY embedding <-> $1 LIMIT $3',
      [vector(queryEmbedding), orgContext.orgId, limit]
    );

    const results = rows.map((r: any) => ({
      text: r.content,
      score: 1 - Number(r.distance),
      citation: { documentId: r.doc_id, chunkIndex: r.chunk_index, source: r.source },
    }));

    const response = { results };
    cache.set(cacheKey, response);
    logInfo('search.complete', {
      userId,
      orgId: orgContext.orgId,
      query,
      results: results.length,
    });
    res.json(response);
  } catch (err) {
    logError('search.failed', err, { userId: req.user?.sub });
    res.status(500).json({ error: 'search failed' });
  }
});

app.post('/v1/rag/reembed', async (req: AuthenticatedRequest, res) => {
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

    const { rows } = await db.query(
      'SELECT id, content FROM document_chunks WHERE doc_id = $1 AND org_id = $2 ORDER BY chunk_index',
      [documentId, orgContext.orgId]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'document not found' });
    }

    const texts = rows.map((r: any) => r.content);
    const embeddings = await embed(texts);
    for (let i = 0; i < rows.length; i++) {
      await db.query('UPDATE document_chunks SET embedding = $1 WHERE id = $2', [vector(embeddings[i]), rows[i].id]);
    }
    logInfo('reembed.complete', {
      userId,
      documentId,
      updated: rows.length,
      orgId: orgContext.orgId,
    });
    res.json({ updated: rows.length });
  } catch (err) {
    logError('reembed.failed', err, { userId: req.user?.sub });
    res.status(500).json({ error: 'reembed failed' });
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
      .select('id, org_id, user_id, title, body, type, read, created_at')
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
    const orgSlug = req.query.orgSlug as string | undefined;
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
    } = req.body as {
      clientId?: string;
      title?: string;
      description?: string | null;
      status?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      budget?: number | null;
      isAuditClient?: boolean;
      requiresEqr?: boolean;
      nonAuditServices?: unknown;
      independenceChecked?: boolean;
      overrideNote?: string | null;
    };

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
    if (typeof status === 'string') updatePayload.status = status.toUpperCase();
    if (typeof startDate !== 'undefined') updatePayload.start_date = startDate ?? null;
    if (typeof endDate !== 'undefined') updatePayload.end_date = endDate ?? null;
    if (typeof budget !== 'undefined') updatePayload.budget = budget ?? null;

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
        ? existing.independence_conclusion_note ?? null
        : overrideNote ?? null;

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
    const nextStatus = typeof status === 'string' ? status.toUpperCase() : currentStatus;

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
      independence_conclusion_note: engagement.independence_conclusion_note ?? null,
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
      .select('id, org_id, user_id, title, body, type, read, created_at')
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
