// scripts/ingestKnowledgeFromWeb.ts
// RAG Ingestion Pipeline Worker
// Fetches URLs from knowledge_web_sources, chunks, embeds, and stores in Supabase

import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";
import pdfParse from "pdf-parse";
import { sha256 } from "js-sha256";

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
  console.error("❌ Missing required environment variables:");
  console.error("   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Tunable parameters
const MAX_PAGES_PER_RUN = 25;       // Process max 25 URLs per run (rate limiting)
const CHUNK_CHAR_SIZE = 4000;       // ~1000 tokens per chunk
const MIN_TEXT_LENGTH = 200;        // Skip pages with <200 chars
const FETCH_TIMEOUT_MS = 30000;     // 30 second timeout per URL
const EMBEDDING_MODEL = "text-embedding-3-large"; // 1536 dimensions
const EMBEDDING_BATCH_SIZE = 50;    // OpenAI allows up to 2048 inputs

// ============================================================================
// Types
// ============================================================================

type PageRow = {
  id: string;
  source_id: string;
  url: string;
  status: string;
  last_fetched_at: string | null;
};

type SourceRow = {
  id: string;
  category: string;
  jurisdiction_code: string;
  tags: string[] | null;
};

type PageWithSource = PageRow & { source: SourceRow };

// ============================================================================
// Database queries
// ============================================================================

async function fetchPagesToIngest(): Promise<PageWithSource[]> {
  const { data, error } = await supabase
    .from("knowledge_web_pages")
    .select(
      `
      id,
      source_id,
      url,
      status,
      last_fetched_at,
      source:knowledge_web_sources (
        id,
        category,
        jurisdiction_code,
        tags,
        status
      )
    `
    )
    .eq("status", "ACTIVE")
    .limit(MAX_PAGES_PER_RUN);

  if (error) throw error;
  if (!data) return [];

  // Filter out if source is inactive
  return (data as any[]).filter(
    (row) => row.source && row.source.status === "ACTIVE"
  ) as PageWithSource[];
}

async function deleteExistingChunks(pageId: string): Promise<void> {
  const { error } = await supabase
    .from("knowledge_chunks")
    .delete()
    .eq("page_id", pageId);

  if (error) throw error;
}

async function insertChunks(params: {
  page: PageWithSource;
  chunks: string[];
  embeddings: number[][];
}): Promise<void> {
  const { page, chunks, embeddings } = params;

  const rows = chunks.map((content, idx) => ({
    source_id: page.source_id,
    page_id: page.id,
    chunk_index: idx,
    content,
    tokens: null, // Optional: compute with tiktoken if needed
    category: page.source.category,
    jurisdiction_code: page.source.jurisdiction_code,
    tags: page.source.tags || [],
    embedding: embeddings[idx]
  }));

  // Insert in batches to avoid payload size limits
  const batchSize = 50;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    const { error } = await supabase
      .from("knowledge_chunks")
      .insert(batch);

    if (error) throw error;
  }
}

async function updatePageMeta(params: {
  pageId: string;
  title?: string | null;
  contentType?: string | null;
  httpStatus?: number;
  hash?: string;
  status?: "ACTIVE" | "ERROR" | "INACTIVE";
  errorMessage?: string | null;
}): Promise<void> {
  const { pageId, title, contentType, httpStatus, hash, status, errorMessage } = params;

  const updates: any = {
    updated_at: new Date().toISOString(),
    last_fetched_at: new Date().toISOString()
  };

  if (title !== undefined) updates.title = title;
  if (contentType !== undefined) updates.content_type = contentType;
  if (httpStatus !== undefined) updates.http_status = httpStatus;
  if (hash !== undefined) updates.sha256_hash = hash;
  if (status !== undefined) updates.status = status;
  if (errorMessage !== undefined) updates.fetch_error = errorMessage;

  const { error } = await supabase
    .from("knowledge_web_pages")
    .update(updates)
    .eq("id", pageId);

  if (error) throw error;
}

// ============================================================================
// Content fetching
// ============================================================================

async function fetchUrlContent(url: string): Promise<{
  status: number;
  contentType: string | null;
  body: Buffer;
}> {
  const res = await fetch(url, {
    redirect: "follow",
    timeout: FETCH_TIMEOUT_MS
  } as any);

  const status = res.status;
  const contentType = res.headers.get("content-type");
  const body = Buffer.from(await res.arrayBuffer());
  
  return { status, contentType, body };
}

// ============================================================================
// Text extraction
// ============================================================================

function extractTextFromHtml(html: string): { title: string | null; text: string } {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Extract title
  const title = doc.querySelector("title")?.textContent?.trim() || null;

  // Naive content extraction (prioritize article/main tags)
  const articleNodes = doc.querySelectorAll("article, main");
  let textContent = "";

  if (articleNodes.length) {
    articleNodes.forEach((n) => {
      textContent += " " + n.textContent;
    });
  } else {
    textContent = doc.body?.textContent || "";
  }

  // Clean whitespace
  const cleaned = textContent
    .replace(/\s+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();

  return { title, text: cleaned };
}

async function extractTextFromPdf(buffer: Buffer): Promise<{ text: string }> {
  const data = await pdfParse(buffer);
  const cleaned = data.text.replace(/\s+$/g, "");
  return { text: cleaned };
}

// ============================================================================
// Chunking
// ============================================================================

function chunkText(text: string, chunkSize: number): string[] {
  if (!text) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunk = text.slice(start, end);

    // Try to break on nearest sentence end if possible (better semantic boundaries)
    const lastPeriod = chunk.lastIndexOf(". ");
    if (lastPeriod > chunkSize * 0.6 && end < text.length) {
      chunk = chunk.slice(0, lastPeriod + 1);
      start += lastPeriod + 1;
    } else {
      start = end;
    }

    chunks.push(chunk.trim());
  }

  // Drop very small chunks
  return chunks.filter((c) => c.length > 50);
}

// ============================================================================
// Embedding
// ============================================================================

async function embedChunks(chunks: string[]): Promise<number[][]> {
  if (chunks.length === 0) return [];

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: chunks
  });

  return response.data.map((d) => d.embedding as number[]);
}

// ============================================================================
// Main processing logic
// ============================================================================

async function processPage(page: PageWithSource): Promise<void> {
  console.log(`\n📄 Processing: ${page.url}`);

  try {
    // 1. Fetch content
    const { status, contentType, body } = await fetchUrlContent(page.url);

    if (status >= 400) {
      console.warn(`❌ HTTP ${status} for ${page.url}`);
      await updatePageMeta({
        pageId: page.id,
        httpStatus: status,
        contentType: contentType || null,
        status: "ERROR",
        errorMessage: `HTTP ${status}`
      });
      return;
    }

    // 2. Check if content changed via hash
    const hash = sha256(body);
    const { data: existing, error: existingErr } = await supabase
      .from("knowledge_web_pages")
      .select("sha256_hash")
      .eq("id", page.id)
      .single();

    if (existingErr) throw existingErr;

    if (existing?.sha256_hash && existing.sha256_hash === hash) {
      console.log("⏭️  No content change, skipping re-chunking.");
      await updatePageMeta({
        pageId: page.id,
        httpStatus: status,
        contentType: contentType || null,
        hash,
        status: "ACTIVE",
        errorMessage: null
      });
      return;
    }

    // 3. Extract text
    let text = "";
    let title: string | null = null;

    if (contentType && contentType.includes("pdf")) {
      const { text: pdfText } = await extractTextFromPdf(body);
      text = pdfText;
    } else {
      const html = body.toString("utf8");
      const res = extractTextFromHtml(html);
      text = res.text;
      title = res.title;
    }

    if (!text || text.length < MIN_TEXT_LENGTH) {
      console.warn(`⚠️  Extracted text too short (${text.length} chars), marking as ERROR.`);
      await updatePageMeta({
        pageId: page.id,
        title,
        httpStatus: status,
        contentType: contentType || null,
        hash,
        status: "ERROR",
        errorMessage: "Extracted text too short"
      });
      return;
    }

    // 4. Chunk text
    const chunks = chunkText(text, CHUNK_CHAR_SIZE);
    console.log(`   📝 Created ${chunks.length} chunks`);

    // 5. Embed chunks
    const embeddings = await embedChunks(chunks);
    console.log(`   🧠 Generated ${embeddings.length} embeddings`);

    if (chunks.length !== embeddings.length) {
      throw new Error("Chunks and embeddings length mismatch");
    }

    // 6. Replace old chunks
    await deleteExistingChunks(page.id);
    await insertChunks({ page, chunks, embeddings });

    // 7. Update page metadata
    await updatePageMeta({
      pageId: page.id,
      title,
      httpStatus: status,
      contentType: contentType || null,
      hash,
      status: "ACTIVE",
      errorMessage: null
    });

    console.log(`✅ Ingested ${chunks.length} chunks for ${page.url}`);
  } catch (err: any) {
    console.error(`❌ Error processing ${page.url}:`, err.message);

    await updatePageMeta({
      pageId: page.id,
      status: "ERROR",
      errorMessage: err.message
    });
  }
}

// ============================================================================
// Main entry point
// ============================================================================

async function main() {
  console.log("🚀 Starting knowledge ingestion from web sources...\n");
  console.log(`   Max pages per run: ${MAX_PAGES_PER_RUN}`);
  console.log(`   Chunk size: ${CHUNK_CHAR_SIZE} chars`);
  console.log(`   Embedding model: ${EMBEDDING_MODEL}\n`);

  const pages = await fetchPagesToIngest();
  console.log(`📊 Found ${pages.length} pages to process.\n`);

  if (pages.length === 0) {
    console.log("✨ No pages to process. All caught up!\n");
    return;
  }

  for (const page of pages) {
    await processPage(page);
  }

  console.log("\n✅ Ingestion run completed successfully!");
}

// ============================================================================
// Run
// ============================================================================

main().catch((err) => {
  console.error("\n💥 Fatal error in ingestion worker:", err);
  process.exit(1);
});
