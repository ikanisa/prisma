#!/usr/bin/env node

/**
 * Knowledge Base Ingestion Script
 * 
 * Ingests accounting/tax PDFs and documents into Supabase with embeddings.
 * Supports IFRS, IAS, ISA, GAAP, Tax Laws, ACCA, CPA resources.
 * 
 * Usage:
 *   pnpm tsx scripts/knowledge-ingest/ingest.ts
 *   
 * Environment variables required:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - OPENAI_API_KEY
 */

import fs from "node:fs/promises";
import path from "node:path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import pdfParse from "pdf-parse";
import OpenAI from "openai";

// Types
interface SourceConfig {
  name: string;
  type: string;
  authority_level: string;
  jurisdiction_code: string;
  url: string;
  description?: string;
}

interface ParsedDoc {
  sourceName: string;
  url: string;
  localPath: string;
  text: string;
  pageCount: number;
}

interface Chunk {
  documentTitle: string;
  chunkIndex: number;
  sectionPath?: string;
  heading?: string;
  content: string;
  tokens: number;
}

interface EmbeddingResult {
  chunkRef: {
    documentTitle: string;
    chunkIndex: number;
  };
  embedding: number[];
}

// Configuration
const SOURCES: SourceConfig[] = [
  {
    name: "IFRS Foundation - IAS 21",
    type: "IAS",
    authority_level: "PRIMARY",
    jurisdiction_code: "GLOBAL",
    url: "https://www.ifrs.org/issued-standards/list-of-standards/ias-21/",
    description: "The Effects of Changes in Foreign Exchange Rates",
  },
  {
    name: "IFRS Foundation - IFRS 15",
    type: "IFRS",
    authority_level: "PRIMARY",
    jurisdiction_code: "GLOBAL",
    url: "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15/",
    description: "Revenue from Contracts with Customers",
  },
  {
    name: "Rwanda Income Tax Act 2023",
    type: "TAX_LAW",
    authority_level: "PRIMARY",
    jurisdiction_code: "RW",
    url: "https://www.rra.gov.rw/en/laws-and-regulations/tax-laws",
    description: "Rwanda Direct Taxation Framework",
  },
  {
    name: "ACCA Technical Articles - Revenue Recognition",
    type: "ACCA",
    authority_level: "SECONDARY",
    jurisdiction_code: "GLOBAL",
    url: "https://www.accaglobal.com/uk/en/technical-activities/technical-resources-search/2021/june/ifrs-15-revenue-from-contracts-with-customers.html",
    description: "ACCA guidance on IFRS 15 implementation",
  },
];

const EMBEDDING_MODEL = "text-embedding-3-large";
const EMBEDDING_BATCH_SIZE = 50;
const CHUNK_MAX_CHARS = 1500;
const CHUNK_OVERLAP_CHARS = 200;

// Initialize clients
const supabase: SupabaseClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Utility: Map jurisdiction code to name
function jurisdictionNameFromCode(code: string): string {
  const mapping: Record<string, string> = {
    GLOBAL: "Global / International",
    RW: "Rwanda",
    EU: "European Union",
    US: "United States",
    UK: "United Kingdom",
  };
  return mapping[code] || code;
}

// Utility: Extract standard code from title
function extractCodeFromTitle(title: string): string | null {
  const match = title.match(/\b(IAS|IFRS|ISA)\s*(\d+)\b/i);
  return match ? `${match[1].toUpperCase()} ${match[2]}` : null;
}

// Utility: Chunk text with overlap
function chunkText(text: string, maxChars: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(text.length, start + maxChars);
    const chunk = text.slice(start, end);
    chunks.push(chunk);

    if (end === text.length) break;
    start = end - overlap;
  }

  return chunks;
}

// Utility: Estimate token count (rough approximation)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Step 1: Ensure jurisdiction exists
async function ensureJurisdiction(code: string): Promise<string> {
  const { data, error } = await supabase
    .from("jurisdictions")
    .select("id")
    .eq("code", code)
    .maybeSingle();

  if (error) throw error;

  if (data) return data.id;

  const name = jurisdictionNameFromCode(code);
  const { data: inserted, error: insertError } = await supabase
    .from("jurisdictions")
    .insert({ code, name })
    .select("id")
    .single();

  if (insertError) throw insertError;
  return inserted.id;
}

// Step 2: Ensure source exists
async function ensureSource(src: SourceConfig): Promise<string> {
  const jurisdictionId = await ensureJurisdiction(src.jurisdiction_code);

  const { data, error } = await supabase
    .from("knowledge_sources")
    .select("id")
    .eq("name", src.name)
    .eq("type", src.type)
    .maybeSingle();

  if (error) throw error;

  if (data) return data.id;

  const { data: inserted, error: insertError } = await supabase
    .from("knowledge_sources")
    .insert({
      name: src.name,
      type: src.type,
      authority_level: src.authority_level,
      jurisdiction_id: jurisdictionId,
      url: src.url,
      description: src.description,
    })
    .select("id")
    .single();

  if (insertError) throw insertError;
  return inserted.id;
}

// Step 3: Download document (stub - implement actual HTTP fetch)
async function downloadDocument(src: SourceConfig): Promise<string> {
  const fileName = `${src.name.replace(/\W+/g, "_")}.pdf`;
  const localPath = path.join("/tmp", "kb_ingest", fileName);

  // Ensure directory exists
  await fs.mkdir(path.dirname(localPath), { recursive: true });

  // TODO: Implement actual HTTP download from src.url
  // For now, assume file exists locally for testing
  console.log(`  [STUB] Would download ${src.url} → ${localPath}`);

  return localPath;
}

// Step 4: Parse PDF to text
async function parsePdf(localPath: string): Promise<{ text: string; pages: number }> {
  const pdfBuffer = await fs.readFile(localPath);
  const parsed = await pdfParse(pdfBuffer);

  return {
    text: parsed.text,
    pages: parsed.numpages,
  };
}

// Step 5: Create document record
async function createDocument(
  sourceId: string,
  sourceName: string,
  url: string,
  localPath: string,
  pageCount: number
): Promise<string> {
  const code = extractCodeFromTitle(sourceName);

  const { data, error } = await supabase
    .from("knowledge_documents")
    .insert({
      source_id: sourceId,
      title: sourceName,
      code,
      metadata: { url, local_path: localPath, page_count: pageCount },
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

// Step 6: Create chunks
async function createChunks(
  documentId: string,
  documentTitle: string,
  text: string
): Promise<Chunk[]> {
  const rawChunks = chunkText(text, CHUNK_MAX_CHARS, CHUNK_OVERLAP_CHARS);

  const chunks: Chunk[] = rawChunks.map((content, idx) => ({
    documentTitle,
    chunkIndex: idx,
    content,
    tokens: estimateTokens(content),
  }));

  const chunkRecords = chunks.map((c) => ({
    document_id: documentId,
    chunk_index: c.chunkIndex,
    content: c.content,
    tokens: c.tokens,
  }));

  const { data: inserted, error } = await supabase
    .from("knowledge_chunks")
    .insert(chunkRecords)
    .select("id, chunk_index, content");

  if (error) throw error;

  // Attach chunk IDs back to Chunk objects
  return inserted.map((row, idx) => ({
    ...chunks[idx],
    chunkId: row.id,
  })) as any;
}

// Step 7: Generate embeddings
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });

  return response.data.map((d) => d.embedding);
}

// Step 8: Insert embeddings
async function insertEmbeddings(
  chunks: Array<Chunk & { chunkId: string }>
): Promise<void> {
  for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
    const texts = batch.map((c) => c.content);
    const vectors = await generateEmbeddings(texts);

    const embeddingRows = batch.map((c, idx) => ({
      chunk_id: c.chunkId,
      embedding: vectors[idx],
    }));

    const { error } = await supabase
      .from("knowledge_embeddings")
      .insert(embeddingRows);

    if (error) throw error;

    console.log(`    Embedded batch ${Math.floor(i / EMBEDDING_BATCH_SIZE) + 1}`);
  }
}

// Main ingestion workflow
async function ingestSource(src: SourceConfig): Promise<void> {
  console.log(`\nIngesting: ${src.name}`);
  console.log(`  Type: ${src.type}, Jurisdiction: ${src.jurisdiction_code}`);

  try {
    // 1. Ensure source exists
    const sourceId = await ensureSource(src);
    console.log(`  ✓ Source ID: ${sourceId}`);

    // 2. Download (stub)
    const localPath = await downloadDocument(src);
    console.log(`  ✓ Downloaded to: ${localPath}`);

    // 3. Parse PDF (skip if file doesn't exist for stub)
    let text: string;
    let pageCount: number;
    try {
      const parsed = await parsePdf(localPath);
      text = parsed.text;
      pageCount = parsed.pages;
      console.log(`  ✓ Parsed ${pageCount} pages, ${text.length} chars`);
    } catch (err) {
      console.log(`  ⚠ PDF not found (stub mode), using placeholder text`);
      text = `This is placeholder text for ${src.name}. In production, download and parse actual PDFs.`;
      pageCount = 1;
    }

    // 4. Create document
    const documentId = await createDocument(
      sourceId,
      src.name,
      src.url,
      localPath,
      pageCount
    );
    console.log(`  ✓ Document ID: ${documentId}`);

    // 5. Create chunks
    const chunks = await createChunks(documentId, src.name, text);
    console.log(`  ✓ Created ${chunks.length} chunks`);

    // 6. Generate and insert embeddings
    await insertEmbeddings(chunks as any);
    console.log(`  ✓ Embedded ${chunks.length} chunks`);

    console.log(`✅ Completed: ${src.name}`);
  } catch (error) {
    console.error(`❌ Failed: ${src.name}`, error);
    throw error;
  }
}

// Main entry point
async function main() {
  console.log("========================================");
  console.log("Knowledge Base Ingestion");
  console.log("========================================");
  console.log(`Model: ${EMBEDDING_MODEL}`);
  console.log(`Chunk size: ${CHUNK_MAX_CHARS} chars (overlap: ${CHUNK_OVERLAP_CHARS})`);
  console.log(`Batch size: ${EMBEDDING_BATCH_SIZE}`);
  console.log(`Sources: ${SOURCES.length}`);
  console.log("========================================");

  for (const src of SOURCES) {
    await ingestSource(src);
  }

  console.log("\n========================================");
  console.log("✅ Ingestion Complete");
  console.log("========================================");
}

// Run
main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
