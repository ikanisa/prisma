#!/usr/bin/env node
/**
 * Accounting Knowledge Base Ingestion Script
 * 
 * Ingests IFRS/IAS/ISA/GAAP/Tax Law PDFs into Supabase with embeddings.
 * 
 * Usage:
 *   pnpm tsx scripts/knowledge/ingest-accounting.ts
 * 
 * Environment variables:
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (not anon key)
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

interface SourceConfig {
  name: string;
  type: "IFRS" | "IAS" | "ISA" | "GAAP" | "TAX_LAW" | "ACCA" | "CPA" | "OECD" | "INTERNAL" | "OTHER";
  authority_level: "PRIMARY" | "SECONDARY" | "INTERNAL";
  jurisdiction_code: string;
  url: string;
  description?: string;
}

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
    url: "https://www.rra.gov.rw/fileadmin/user_upload/Income_Tax_Act_2023.pdf",
    description: "Rwanda domestic income tax law",
  },
  // Add more sources as needed
];

async function ensureJurisdiction(code: string): Promise<string> {
  const { data, error } = await supabase
    .from("jurisdictions")
    .select("id")
    .eq("code", code)
    .maybeSingle();

  if (error) throw error;

  if (data) return data.id;

  // Map code to human-readable name
  const nameMap: Record<string, string> = {
    GLOBAL: "Global / International",
    RW: "Rwanda",
    US: "United States",
    EU: "European Union",
    UK: "United Kingdom",
  };

  const { data: inserted, error: insertError } = await supabase
    .from("jurisdictions")
    .insert({ code, name: nameMap[code] || code })
    .select("id")
    .single();

  if (insertError) throw insertError;
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

async function embed(texts: string[]): Promise<number[][]> {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small", // 1536 dimensions
    input: texts,
  });

  return res.data.map((d) => d.embedding);
}

async function ingestSource(src: SourceConfig) {
  console.log(`\n📥 Ingesting: ${src.name}`);
  const sourceId = await ensureSource(src);

  // 1) Download PDF (simplified - use proper HTTP client in production)
  const localPath = path.join("/tmp", `${src.name.replace(/\W+/g, "_")}.pdf`);
  console.log(`  ↓ Downloading to ${localPath}`);

  // TODO: Implement actual download from src.url
  // For now, assume file exists or skip if not found
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await fs.readFile(localPath);
  } catch {
    console.warn(`  ⚠️  File not found: ${localPath}. Skipping.`);
    return;
  }

  // 2) Parse PDF
  console.log(`  📄 Parsing PDF...`);
  const parsed = await pdfParse(pdfBuffer);
  const fullText = parsed.text;

  if (!fullText || fullText.trim().length === 0) {
    console.warn(`  ⚠️  No text extracted. Skipping.`);
    return;
  }

  // 3) Insert document
  const { data: doc, error: docError } = await supabase
    .from("knowledge_documents")
    .insert({
      source_id: sourceId,
      title: src.name,
      code: extractCode(src.name),
      metadata: { url: src.url, local_path: localPath, pages: parsed.numpages },
    })
    .select("*")
    .single();

  if (docError) throw docError;

  console.log(`  ✅ Document created: ${doc.id}`);

  // 4) Chunk
  console.log(`  🔪 Chunking text...`);
  const rawChunks = chunkText(fullText, 1500, 200);
  console.log(`  📦 Created ${rawChunks.length} chunks`);

  // 5) Insert chunks
  const chunkRecords = rawChunks.map((content, idx) => ({
    document_id: doc.id,
    chunk_index: idx,
    content,
    tokens: Math.ceil(content.length / 4), // rough estimate
  }));

  const { data: insertedChunks, error: chunksError } = await supabase
    .from("knowledge_chunks")
    .insert(chunkRecords)
    .select("id, chunk_index, content");

  if (chunksError) throw chunksError;

  console.log(`  ✅ Inserted ${insertedChunks.length} chunks`);

  // 6) Embed in batches
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
    console.log(`    ⏳ Embedded ${embeddedCount}/${insertedChunks.length}`);
  }

  console.log(`  ✅ Done: ${src.name}`);
}

function extractCode(name: string): string | null {
  // Extract standard code from title (e.g., "IAS 21" from "IFRS Foundation - IAS 21")
  const match = name.match(/(IFRS|IAS|ISA)\s*\d+/i);
  return match ? match[0] : null;
}

async function main() {
  console.log("🚀 Starting Accounting Knowledge Base Ingestion\n");

  for (const src of SOURCES) {
    try {
      await ingestSource(src);
    } catch (err) {
      console.error(`❌ Error ingesting ${src.name}:`, err);
      // Continue with next source
    }
  }

  console.log("\n✅ Ingestion complete!");
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
