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
import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createClient } from '@supabase/supabase-js';
import { getSignedUrlTTL } from '../../lib/security/signed-url-policy';
import {
  scheduleLearningRun,
  getDriveConnectorMetadata,
  previewDriveDocuments,
} from './knowledge/ingestion';
import type { DriveSource } from './knowledge/drive';
import { listWebSources, getWebSource, type WebSourceRow } from './knowledge/web';
import { getSupabaseJwtSecret, getSupabaseServiceRoleKey } from '../../lib/secrets';

type AgentPersona = 'AUDIT' | 'FINANCE' | 'TAX';
type LearningMode = 'INITIAL' | 'CONTINUOUS';

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
app.use(express.json({ limit: '10mb' }));

const HEADER_REQUEST_ID = 'x-request-id';

app.use((req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const existing = req.header(HEADER_REQUEST_ID);
  const requestId = existing && existing.trim().length > 0 ? existing : randomUUID();
  req.requestId = requestId;
  res.set(HEADER_REQUEST_ID, requestId);
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

app.use(authenticate);

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

    const response = await fetch(webSource.url, {
      headers: {
        'User-Agent': 'Aurora-AI-Agent/1.0 (+https://example.com)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL (status ${response.status})`);
    }

    const html = await response.text();
    const cleaned = normalizeText(stripHtml(html));
    if (!cleaned) {
      throw new Error('Fetched page produced no readable content');
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
    };

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

app.get('/v1/knowledge/drive/metadata', async (_req, res) => {
  const connector = await getDriveConnectorMetadata();
  return res.json({ connector });
});

app.get('/v1/knowledge/sources/:id/preview', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'invalid session' });
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

    await resolveOrgForUser(userId, orgRow.slug);

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
    };

    const documents = await previewDriveDocuments(driveSource);
    return res.json({ documents, placeholder: true });
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

app.get('/v1/knowledge/web-sources', async (_req: AuthenticatedRequest, res) => {
  try {
    const sources = await listWebSources();
    return res.json({ sources });
  } catch (err) {
    logError('knowledge.web_sources_failed', err, {});
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

export default app;
