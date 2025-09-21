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
import { createClient } from '@supabase/supabase-js';

// Basic RAG service implementing ingest, search and reembed endpoints.
// Documents are stored in PostgreSQL with pgvector embeddings.

const app = express();
app.use(express.json({ limit: '10mb' }));

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const JWT_AUDIENCE = process.env.SUPABASE_JWT_AUDIENCE ?? 'authenticated';

if (!JWT_SECRET) {
  throw new Error('SUPABASE_JWT_SECRET must be set to secure the RAG service.');
}

const upload = multer();
const cache = new NodeCache({ stdTTL: 60 });

const RATE_LIMIT = Number(process.env.API_RATE_LIMIT ?? '60');
const RATE_WINDOW_MS = Number(process.env.API_RATE_WINDOW_SECONDS ?? '60') * 1000;
const requestBuckets = new Map<string, number[]>();

interface AuthenticatedRequest extends Request {
  user?: JwtPayload & { sub?: string };
}

function logInfo(message: string, meta: Record<string, unknown>) {
  console.log(JSON.stringify({ level: 'info', msg: message, ...meta }));
}

function logError(message: string, error: unknown, meta: Record<string, unknown> = {}) {
  console.error(
    JSON.stringify({
      level: 'error',
      msg: message,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...meta,
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
      logInfo('rate.limit_exceeded', { userId, path: req.path });
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

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.');
}

const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

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

app.post('/v1/rag/ingest', upload.single('file'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'file required' });
    }

    const { buffer, mimetype, originalname } = req.file;
    const text = await extractText(buffer, mimetype);
    const chunks = chunkText(text);
    const embeddings = await embed(chunks);

    await db.query('BEGIN');
    const docResult = await db.query(
      'INSERT INTO documents(name) VALUES ($1) RETURNING id',
      [originalname]
    );
    const docId = docResult.rows[0].id;

    const insertChunk =
      'INSERT INTO document_chunks(doc_id, chunk_index, content, embedding) VALUES ($1,$2,$3,$4)';
    for (let i = 0; i < chunks.length; i++) {
      await db.query(insertChunk, [docId, i, chunks[i], vector(embeddings[i])]);
    }
    await db.query('COMMIT');

    logInfo('ingest.complete', { userId: req.user?.sub, documentId: docId, chunks: chunks.length });
    res.json({ documentId: docId, chunks: chunks.length });
  } catch (err) {
    await db.query('ROLLBACK');
    logError('ingest.failed', err, { userId: req.user?.sub });
    res.status(500).json({ error: 'ingest failed' });
  }
});

app.post('/v1/rag/search', async (req: AuthenticatedRequest, res) => {
  try {
    const { query, limit = 5 } = req.body as { query: string; limit?: number };
    if (!query) {
      return res.status(400).json({ error: 'query required' });
    }

    const cacheKey = `search:${query}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      logInfo('search.cache_hit', { userId: req.user?.sub, query });
      return res.json(cached);
    }

    const [queryEmbedding] = await embed([query]);
    const { rows } = await db.query(
      'SELECT doc_id, chunk_index, content, source, embedding <-> $1 AS distance FROM document_chunks ORDER BY embedding <-> $1 LIMIT $2',
      [vector(queryEmbedding), limit]
    );

    const results = rows.map((r: any) => ({
      text: r.content,
      score: 1 - Number(r.distance),
      citation: { documentId: r.doc_id, chunkIndex: r.chunk_index, source: r.source },
    }));

    const response = { results };
    cache.set(cacheKey, response);
    logInfo('search.complete', { userId: req.user?.sub, query, results: results.length });
    res.json(response);
  } catch (err) {
    logError('search.failed', err, { userId: req.user?.sub });
    res.status(500).json({ error: 'search failed' });
  }
});

app.post('/v1/rag/reembed', async (req: AuthenticatedRequest, res) => {
  try {
    const { documentId } = req.body as { documentId: string };
    if (!documentId) {
      return res.status(400).json({ error: 'documentId required' });
    }

    const { rows } = await db.query(
      'SELECT id, content FROM document_chunks WHERE doc_id = $1 ORDER BY chunk_index',
      [documentId]
    );
    const texts = rows.map((r: any) => r.content);
    const embeddings = await embed(texts);
    for (let i = 0; i < rows.length; i++) {
      await db.query('UPDATE document_chunks SET embedding = $1 WHERE id = $2', [vector(embeddings[i]), rows[i].id]);
    }
    logInfo('reembed.complete', { userId: req.user?.sub, documentId, updated: rows.length });
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

    const { data: signedUrlData, error: signError } = await supabaseService
      .storage
      .from('documents')
      .createSignedUrl(document.file_path, Number(process.env.DOCUMENT_SIGN_TTL ?? '120'));

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

export default app;
