#!/usr/bin/env node
/**
 * Knowledge Ingestion Script
 * 
 * Ingests accounting/tax PDFs into Supabase with embeddings for RAG.
 * 
 * Usage:
 *   pnpm tsx scripts/ingest-knowledge.ts
 * 
 * Environment Variables:
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key for admin access
 *   OPENAI_API_KEY - OpenAI API key for embeddings
 */

import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import pdfParse from "pdf-parse";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

type SourceConfig = {
  name: string;
  type: string;
  authority_level: string;
  jurisdiction_code: string;
  url: string;
  description?: string;
};

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
    name: "IFRS Foundation - IFRS 9",
    type: "IFRS",
    authority_level: "PRIMARY",
    jurisdiction_code: "GLOBAL",
    url: "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-9/",
    description: "Financial Instruments",
  },
  {
    name: "Rwanda Income Tax Act 2023",
    type: "TAX_LAW",
    authority_level: "PRIMARY",
    jurisdiction_code: "RW",
    url: "https://www.rra.gov.rw/fileadmin/user_upload/Income_Tax_Law_2023.pdf",
    description: "Rwanda Revenue Authority Income Tax Law",
  },
];

const JURISDICTION_NAME_MAP: Record<string, string> = {
  GLOBAL: "Global/International",
  RW: "Rwanda",
  US: "United States",
  EU: "European Union",
  UK: "United Kingdom",
  KE: "Kenya",
  UG: "Uganda",
  TZ: "Tanzania",
};

async function ensureJurisdiction(code: string): Promise<string> {
  const { data, error } = await supabase
    .from("jurisdictions")
    .select("id")
    .eq("code", code)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    console.log(`  ✓ Jurisdiction ${code} exists`);
    return data.id;
  }

  const name = JURISDICTION_NAME_MAP[code] || code;
  const { data: inserted, error: insertError } = await supabase
    .from("jurisdictions")
    .insert({ code, name })
    .select("id")
    .single();

  if (insertError) throw insertError;
  console.log(`  ✓ Created jurisdiction ${code}: ${name}`);
  return inserted.id;
}

async function ensureSource(src: SourceConfig): Promise<string> {
  const jurisdictionId = await ensureJurisdiction(src.jurisdiction_code);

  const { data, error } = await supabase
    .from("knowledge_sources")
    .select("id")
    .eq("name", src.name)
    .eq("type", src.type)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    console.log(`  ✓ Source "${src.name}" exists`);
    return data.id;
  }

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
  console.log(`  ✓ Created source "${src.name}"`);
  return inserted.id;
}

function chunkText(text: string, maxChars = 1500, overlap = 200): string[] {
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

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function extractCode(title: string): string | null {
  const patterns = [
    /\b(IAS\s+\d+)\b/i,
    /\b(IFRS\s+\d+)\b/i,
    /\b(ISA\s+\d+)\b/i,
    /\b(ASC\s+\d+)\b/i,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) return match[1].toUpperCase();
  }

  return null;
}

async function embed(texts: string[]): Promise<number[][]> {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: texts,
  });

  return res.data.map((d) => d.embedding as number[]);
}

async function createIngestionJob(sourceId: string | null): Promise<string> {
  const { data, error } = await supabase
    .from("ingestion_jobs")
    .insert({
      source_id: sourceId,
      status: "RUNNING",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

async function updateIngestionJob(
  jobId: string,
  status: string,
  stats?: Record<string, unknown>,
  errorMessage?: string
) {
  await supabase
    .from("ingestion_jobs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      stats: stats || {},
      error_message: errorMessage,
    })
    .eq("id", jobId);
}

async function ingestSource(src: SourceConfig) {
  console.log(`\n🔄 Ingesting: ${src.name}`);
  
  const sourceId = await ensureSource(src);
  const jobId = await createIngestionJob(sourceId);

  try {
    const localPath = path.join("/tmp", `${src.name.replace(/\W+/g, "_")}.pdf`);

    console.log(`  📥 Downloading from ${src.url}...`);
    // TODO: Implement actual download logic
    // For now, we'll skip files that don't exist locally
    try {
      await fs.access(localPath);
    } catch {
      console.log(`  ⚠️  File not found locally: ${localPath}`);
      console.log(`  ℹ️  Skipping for now. Download from ${src.url} manually to ${localPath}`);
      await updateIngestionJob(jobId, "FAILED", undefined, "File not available");
      return;
    }

    console.log(`  📄 Parsing PDF...`);
    const pdfBuffer = await fs.readFile(localPath);
    const parsed = await pdfParse(pdfBuffer);
    const fullText = parsed.text;
    const pageCount = parsed.numpages;

    console.log(`  ✓ Parsed ${pageCount} pages (${fullText.length} chars)`);

    const { data: doc, error: docError } = await supabase
      .from("knowledge_documents")
      .insert({
        source_id: sourceId,
        title: src.name,
        code: extractCode(src.name),
        status: "ACTIVE",
        metadata: { 
          url: src.url, 
          local_path: localPath,
          page_count: pageCount,
        },
      })
      .select("*")
      .single();

    if (docError) throw docError;
    console.log(`  ✓ Created document (ID: ${doc.id})`);

    console.log(`  ✂️  Chunking text...`);
    const rawChunks = chunkText(fullText, 1500, 200);
    console.log(`  ✓ Created ${rawChunks.length} chunks`);

    const chunkRecords = rawChunks.map((content, idx) => ({
      document_id: doc.id,
      chunk_index: idx,
      content,
      tokens: estimateTokens(content),
    }));

    const { data: insertedChunks, error: chunksError } = await supabase
      .from("knowledge_chunks")
      .insert(chunkRecords)
      .select("id, chunk_index, content");

    if (chunksError) throw chunksError;
    console.log(`  ✓ Inserted ${insertedChunks.length} chunks`);

    console.log(`  🧠 Generating embeddings...`);
    const batchSize = 50;
    let embeddedCount = 0;

    for (let i = 0; i < insertedChunks.length; i += batchSize) {
      const batch = insertedChunks.slice(i, i + batchSize);
      const texts = batch.map((c) => c.content);
      
      const vectors = await embed(texts);

      const embeddingRows = batch.map((c, idx) => ({
        chunk_id: c.id,
        embedding: vectors[idx],
      }));

      const { error: embError } = await supabase
        .from("knowledge_embeddings")
        .insert(embeddingRows);

      if (embError) throw embError;
      
      embeddedCount += batch.length;
      console.log(`  ✓ Embedded ${embeddedCount}/${insertedChunks.length} chunks`);
    }

    const totalTokens = chunkRecords.reduce((sum, c) => sum + c.tokens, 0);
    await updateIngestionJob(jobId, "COMPLETED", {
      files: 1,
      pages: pageCount,
      chunks: insertedChunks.length,
      tokens: totalTokens,
    });

    console.log(`  ✅ Done: ${src.name}`);
  } catch (error) {
    console.error(`  ❌ Error:`, error);
    await updateIngestionJob(
      jobId,
      "FAILED",
      undefined,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

async function main() {
  console.log("📚 Knowledge Base Ingestion");
  console.log("===========================\n");

  if (!process.env.SUPABASE_URL) {
    throw new Error("SUPABASE_URL environment variable is required");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is required");
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }

  console.log(`Sources to ingest: ${SOURCES.length}\n`);

  for (const src of SOURCES) {
    try {
      await ingestSource(src);
    } catch (error) {
      console.error(`Failed to ingest ${src.name}:`, error);
    }
  }

  console.log("\n✅ Ingestion complete!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
