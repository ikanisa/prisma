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
const RATE_WINDOW_MS = Number(process.env.API_RATE_WINDOW_SECONDS ?? '60000');
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

export default app;
