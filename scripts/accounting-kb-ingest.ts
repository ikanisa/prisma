#!/usr/bin/env node
/**
 * Accounting Knowledge Base Ingestion Script
 * 
 * Ingests accounting/tax PDFs into Supabase with embeddings for RAG.
 * Follows the pipeline defined in config/accounting-knowledge-pipeline.yaml
 * 
 * Usage:
 *   pnpm tsx scripts/accounting-kb-ingest.ts
 * 
 * Environment variables required:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OPENAI_API_KEY
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
    url: "https://www.ifrs.org/ias21.pdf", // placeholder - update with real URL
    description: "The Effects of Changes in Foreign Exchange Rates",
  },
  {
    name: "IFRS Foundation - IFRS 15",
    type: "IFRS",
    authority_level: "PRIMARY",
    jurisdiction_code: "GLOBAL",
    url: "https://www.ifrs.org/ifrs15.pdf", // placeholder
    description: "Revenue from Contracts with Customers",
  },
  {
    name: "Rwanda Income Tax Act 2023",
    type: "TAX_LAW",
    authority_level: "PRIMARY",
    jurisdiction_code: "RW",
    url: "https://www.rra.gov.rw/fileadmin/user_upload/rra.gov.rw/Publications/Law_Governing_Income_Tax.pdf",
    description: "Rwanda Income Tax Law",
  },
  // Add more sources here...
];

/**
 * Ensure jurisdiction exists in database
 */
async function ensureJurisdiction(code: string): Promise<string> {
  const { data, error } = await supabase
    .from("jurisdictions")
    .select("id")
    .eq("code", code)
    .maybeSingle();

  if (error) throw error;

  if (data) return data.id;

  // Map code to proper name
  const nameMap: Record<string, string> = {
    GLOBAL: "Global/International",
    RW: "Rwanda",
    US: "United States",
    EU: "European Union",
    GB: "United Kingdom",
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

/**
 * Ensure knowledge source exists in database
 */
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

/**
 * Split text into overlapping chunks
 */
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

/**
 * Generate embeddings for text chunks
 */
async function embed(texts: string[]): Promise<number[][]> {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-large", // 1536 dimensions
    input: texts,
  });

  return res.data.map((d) => d.embedding as number[]);
}

/**
 * Download PDF from URL (placeholder - implement with proper HTTP client)
 */
async function downloadPDF(url: string, outputPath: string): Promise<void> {
  // TODO: Implement actual download using fetch or axios
  console.log(`[TODO] Download ${url} to ${outputPath}`);
  // For now, expect PDFs to be manually placed in /tmp
}

/**
 * Extract code from document title (e.g., "IAS 21" from "IFRS Foundation - IAS 21")
 */
function extractCode(title: string): string | null {
  const patterns = [
    /\b(IAS|IFRS|ISA)\s+\d+[A-Z]?\b/i,
    /\b(RW|US|EU)-[A-Z]+-\d{4}\b/i,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) return match[0].toUpperCase();
  }

  return null;
}

/**
 * Ingest a single knowledge source
 */
async function ingestSource(src: SourceConfig): Promise<void> {
  console.log(`\n=== Ingesting: ${src.name} ===`);
  
  try {
    const sourceId = await ensureSource(src);
    console.log(`✓ Source ID: ${sourceId}`);

    // 1) Download PDF
    const localPath = path.join("/tmp", `${src.name.replace(/\W+/g, "_")}.pdf`);
    await downloadPDF(src.url, localPath);

    // 2) Parse PDF
    const pdfBuffer = await fs.readFile(localPath);
    const parsed = await pdfParse(pdfBuffer);
    const fullText = parsed.text;
    console.log(`✓ Parsed PDF: ${parsed.numpages} pages, ${fullText.length} chars`);

    // 3) Insert document record
    const code = extractCode(src.name);
    const { data: doc, error: docError } = await supabase
      .from("knowledge_documents")
      .insert({
        source_id: sourceId,
        title: src.name,
        code,
        status: "ACTIVE",
        metadata: { 
          url: src.url, 
          local_path: localPath,
          page_count: parsed.numpages,
        },
      })
      .select("*")
      .single();

    if (docError) throw docError;
    console.log(`✓ Document ID: ${doc.id}, Code: ${code}`);

    // 4) Chunk text
    const rawChunks = chunkText(fullText, 1500, 200);
    console.log(`✓ Created ${rawChunks.length} chunks`);

    // 5) Insert chunks
    const chunkRecords = rawChunks.map((content, idx) => ({
      document_id: doc.id,
      chunk_index: idx,
      content,
      tokens: Math.ceil(content.length / 4), // rough estimate: 1 token ≈ 4 chars
    }));

    const { data: insertedChunks, error: chunksError } = await supabase
      .from("knowledge_chunks")
      .insert(chunkRecords)
      .select("id, chunk_index, content");

    if (chunksError) throw chunksError;
    console.log(`✓ Inserted ${insertedChunks.length} chunk records`);

    // 6) Embed in batches
    const batchSize = 50;
    for (let i = 0; i < insertedChunks.length; i += batchSize) {
      const batch = insertedChunks.slice(i, i + batchSize);
      const texts = batch.map((c) => c.content);
      
      console.log(`  Embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(insertedChunks.length / batchSize)}...`);
      const vectors = await embed(texts);

      const embeddingRows = batch.map((c, idx) => ({
        chunk_id: c.id,
        embedding: vectors[idx],
      }));

      const { error: embError } = await supabase
        .from("knowledge_embeddings")
        .insert(embeddingRows);

      if (embError) throw embError;
    }

    console.log(`✓ Done: ${src.name}`);
  } catch (err) {
    console.error(`✗ Failed to ingest ${src.name}:`, err);
    throw err;
  }
}

/**
 * Main entry point
 */
async function main() {
  console.log("Accounting Knowledge Base Ingestion");
  console.log("====================================\n");

  for (const src of SOURCES) {
    await ingestSource(src);
  }

  console.log("\n✓ All sources ingested successfully!");
}

// Run if called directly
if (require.main === module) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
