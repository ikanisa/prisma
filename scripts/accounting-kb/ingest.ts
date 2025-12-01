#!/usr/bin/env node
/**
 * Knowledge Ingestion Script
 * Ingests accounting/tax PDFs into Supabase with embeddings
 * 
 * Usage:
 *   node scripts/accounting-kb/ingest.ts
 * 
 * Environment variables required:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OPENAI_API_KEY
 */

import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import pdfParse from "pdf-parse";
import OpenAI from "openai";

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
};

const SOURCES: SourceConfig[] = [
  {
    name: "IFRS Foundation - IAS 21",
    type: "IAS",
    authority_level: "PRIMARY",
    jurisdiction_code: "GLOBAL",
    url: "https://www.ifrs.org/ias21.pdf", // placeholder
  },
  {
    name: "IFRS Foundation - IFRS 15",
    type: "IFRS",
    authority_level: "PRIMARY",
    jurisdiction_code: "GLOBAL",
    url: "https://www.ifrs.org/ifrs15.pdf", // placeholder
  },
  {
    name: "Rwanda Income Tax Act 2023",
    type: "TAX_LAW",
    authority_level: "PRIMARY",
    jurisdiction_code: "RW",
    url: "https://www.rra.gov.rw/income-tax-act-2023.pdf", // placeholder
  },
];

async function ensureJurisdiction(code: string): Promise<string> {
  const { data, error } = await supabase
    .from("jurisdictions")
    .select("id")
    .eq("code", code)
    .maybeSingle();

  if (error) throw error;

  if (data) return data.id;

  const nameMap: Record<string, string> = {
    GLOBAL: "Global",
    RW: "Rwanda",
    EU: "European Union",
    US: "United States",
    UK: "United Kingdom",
    KE: "Kenya",
    UG: "Uganda",
    TZ: "Tanzania",
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
    model: "text-embedding-3-large",
    input: texts,
  });

  return res.data.map((d) => d.embedding as number[]);
}

async function ingestSource(src: SourceConfig) {
  console.log(`Ingesting: ${src.name}`);
  const sourceId = await ensureSource(src);

  const localPath = path.join("/tmp", `${src.name.replace(/\W+/g, "_")}.pdf`);
  
  try {
    await fs.access(localPath);
  } catch {
    console.log(`  ⚠️  Skipping ${src.name} - file not found at ${localPath}`);
    console.log(`      Download manually from: ${src.url}`);
    return;
  }

  const pdfBuffer = await fs.readFile(localPath);
  const parsed = await pdfParse(pdfBuffer);
  const fullText = parsed.text;

  const { data: doc, error: docError } = await supabase
    .from("knowledge_documents")
    .insert({
      source_id: sourceId,
      title: src.name,
      metadata: { url: src.url, local_path: localPath },
    })
    .select("*")
    .single();

  if (docError) throw docError;

  const rawChunks = chunkText(fullText, 1500, 200);

  const chunkRecords = rawChunks.map((content, idx) => ({
    document_id: doc.id,
    chunk_index: idx,
    content,
    tokens: Math.floor(content.length / 4),
  }));

  const { data: insertedChunks, error: chunksError } = await supabase
    .from("knowledge_chunks")
    .insert(chunkRecords)
    .select("id, chunk_index, content");

  if (chunksError) throw chunksError;

  const batchSize = 50;
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
    
    console.log(`  ✓ Embedded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(insertedChunks.length / batchSize)}`);
  }

  console.log(`  ✓ Completed: ${src.name} (${rawChunks.length} chunks)`);
}

async function main() {
  console.log("🚀 Starting accounting knowledge base ingestion\n");
  
  for (const src of SOURCES) {
    try {
      await ingestSource(src);
    } catch (err) {
      console.error(`  ❌ Failed to ingest ${src.name}:`, err);
    }
  }
  
  console.log("\n✅ Ingestion complete");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
