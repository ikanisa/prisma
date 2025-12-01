/**
 * Knowledge Ingestion Script
 * Ingests accounting/tax PDFs and documents into Supabase with embeddings
 * 
 * Usage:
 *   tsx scripts/knowledge/ingest.ts
 * 
 * Requirements:
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 *   - OPENAI_API_KEY env var
 *   - pnpm install pdf-parse (or similar PDF library)
 */

import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface SourceConfig {
  name: string;
  type: string;
  authority_level: string;
  jurisdiction_code: string;
  url: string;
  code?: string;
  description?: string;
}

const SOURCES: SourceConfig[] = [
  {
    name: "IFRS Foundation - IAS 21 Foreign Exchange",
    type: "IAS",
    authority_level: "PRIMARY",
    jurisdiction_code: "GLOBAL",
    url: "https://www.ifrs.org/issued-standards/list-of-standards/ias-21/",
    code: "IAS 21",
    description: "The Effects of Changes in Foreign Exchange Rates",
  },
  {
    name: "IFRS Foundation - IFRS 15 Revenue",
    type: "IFRS",
    authority_level: "PRIMARY",
    jurisdiction_code: "GLOBAL",
    url: "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15/",
    code: "IFRS 15",
    description: "Revenue from Contracts with Customers",
  },
  {
    name: "IFRS Foundation - IFRS 16 Leases",
    type: "IFRS",
    authority_level: "PRIMARY",
    jurisdiction_code: "GLOBAL",
    url: "https://www.ifrs.org/issued-standards/list-of-standards/ifrs-16/",
    code: "IFRS 16",
    description: "Leases",
  },
  {
    name: "IFRS Foundation - IAS 12 Income Taxes",
    type: "IAS",
    authority_level: "PRIMARY",
    jurisdiction_code: "GLOBAL",
    url: "https://www.ifrs.org/issued-standards/list-of-standards/ias-12/",
    code: "IAS 12",
    description: "Income Taxes",
  },
];

const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;
const EMBEDDING_MODEL = "text-embedding-3-small";
const BATCH_SIZE = 50;

async function ensureJurisdiction(code: string): Promise<string> {
  const { data, error } = await supabase
    .from("jurisdictions")
    .select("id")
    .eq("code", code)
    .maybeSingle();

  if (error) throw error;

  if (data) return data.id;

  const nameMap: Record<string, string> = {
    GLOBAL: "Global / International",
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

  if (data) {
    console.log(`  ✓ Source exists: ${src.name}`);
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
  console.log(`  ✓ Created source: ${src.name}`);
  return inserted.id;
}

function chunkText(text: string, maxChars = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(text.length, start + maxChars);
    const chunk = text.slice(start, end).trim();
    
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    
    if (end === text.length) break;
    start = end - overlap;
  }

  return chunks;
}

async function embed(texts: string[]): Promise<number[][]> {
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
    encoding_format: "float",
  });

  return res.data.map((d) => d.embedding);
}

async function downloadDocument(url: string, localPath: string): Promise<void> {
  console.log(`  → Downloading: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "PrismaGlow-KnowledgeIngestion/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, Buffer.from(buffer));
    
    console.log(`  ✓ Downloaded to: ${localPath}`);
  } catch (error) {
    console.error(`  ✗ Download failed: ${error}`);
    throw error;
  }
}

async function parseDocument(localPath: string): Promise<{ text: string; pages?: number }> {
  console.log(`  → Parsing document: ${localPath}`);
  
  const ext = path.extname(localPath).toLowerCase();
  
  if (ext === ".pdf") {
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const buffer = await fs.readFile(localPath);
      const parsed = await pdfParse(buffer);
      
      console.log(`  ✓ Parsed PDF: ${parsed.numpages} pages`);
      return { text: parsed.text, pages: parsed.numpages };
    } catch (error) {
      console.error(`  ✗ PDF parsing requires pdf-parse: pnpm add pdf-parse`);
      throw error;
    }
  } else if (ext === ".html" || ext === ".htm") {
    const html = await fs.readFile(localPath, "utf-8");
    const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    
    console.log(`  ✓ Parsed HTML: ${text.length} chars`);
    return { text };
  } else {
    const text = await fs.readFile(localPath, "utf-8");
    console.log(`  ✓ Parsed text: ${text.length} chars`);
    return { text };
  }
}

async function ingestSource(src: SourceConfig, jobId: string) {
  console.log(`\n📄 Ingesting: ${src.name}`);
  
  try {
    const sourceId = await ensureSource(src);

    const localPath = path.join(
      "/tmp",
      "knowledge",
      `${src.name.replace(/\W+/g, "_")}.pdf`
    );

    await downloadDocument(src.url, localPath);

    await supabase
      .from("ingestion_files")
      .insert({
        job_id: jobId,
        uri: src.url,
        status: "DOWNLOADING",
      });

    const { text, pages } = await parseDocument(localPath);

    await supabase
      .from("ingestion_files")
      .update({ status: "PARSING", page_count: pages })
      .eq("job_id", jobId)
      .eq("uri", src.url);

    const { data: doc, error: docError } = await supabase
      .from("knowledge_documents")
      .insert({
        source_id: sourceId,
        title: src.name,
        code: src.code,
        metadata: { url: src.url, local_path: localPath, pages },
      })
      .select("*")
      .single();

    if (docError) throw docError;
    console.log(`  ✓ Created document: ${doc.id}`);

    await supabase
      .from("ingestion_files")
      .update({ status: "CHUNKING" })
      .eq("job_id", jobId)
      .eq("uri", src.url);

    const rawChunks = chunkText(text, CHUNK_SIZE, CHUNK_OVERLAP);
    console.log(`  → Creating ${rawChunks.length} chunks...`);

    const chunkRecords = rawChunks.map((content, idx) => ({
      document_id: doc.id,
      chunk_index: idx,
      content,
      tokens: Math.ceil(content.length / 4),
    }));

    const { data: insertedChunks, error: chunksError } = await supabase
      .from("knowledge_chunks")
      .insert(chunkRecords)
      .select("id, chunk_index, content");

    if (chunksError) throw chunksError;
    console.log(`  ✓ Created ${insertedChunks.length} chunks`);

    await supabase
      .from("ingestion_files")
      .update({ status: "EMBEDDING" })
      .eq("job_id", jobId)
      .eq("uri", src.url);

    console.log(`  → Generating embeddings...`);
    for (let i = 0; i < insertedChunks.length; i += BATCH_SIZE) {
      const batch = insertedChunks.slice(i, i + BATCH_SIZE);
      const texts = batch.map((c) => c.content);
      const vectors = await embed(texts);

      const embeddingRows = batch.map((c, idx) => ({
        chunk_id: c.id,
        embedding: JSON.stringify(vectors[idx]),
        model: EMBEDDING_MODEL,
      }));

      const { error: embError } = await supabase
        .from("knowledge_embeddings")
        .insert(embeddingRows);

      if (embError) throw embError;
      
      console.log(`  → Embedded batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(insertedChunks.length / BATCH_SIZE)}`);
    }

    await supabase
      .from("ingestion_files")
      .update({ status: "COMPLETED" })
      .eq("job_id", jobId)
      .eq("uri", src.url);

    console.log(`✅ Completed: ${src.name}`);
    
    return {
      files: 1,
      chunks: insertedChunks.length,
      tokens: insertedChunks.reduce((sum, c) => sum + Math.ceil(c.content.length / 4), 0),
    };
  } catch (error) {
    console.error(`❌ Failed: ${src.name}`, error);
    
    await supabase
      .from("ingestion_files")
      .update({ 
        status: "FAILED",
        error_message: error instanceof Error ? error.message : String(error),
      })
      .eq("job_id", jobId)
      .eq("uri", src.url);
    
    throw error;
  }
}

async function main() {
  console.log("🚀 Starting Knowledge Ingestion Pipeline\n");

  const { data: job, error: jobError } = await supabase
    .from("ingestion_jobs")
    .insert({
      status: "RUNNING",
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (jobError) {
    console.error("Failed to create job:", jobError);
    process.exit(1);
  }

  console.log(`📋 Job ID: ${job.id}\n`);

  let totalFiles = 0;
  let totalChunks = 0;
  let totalTokens = 0;

  for (const src of SOURCES) {
    try {
      const stats = await ingestSource(src, job.id);
      totalFiles += stats.files;
      totalChunks += stats.chunks;
      totalTokens += stats.tokens;
    } catch (error) {
      console.error(`Continuing after error...`);
    }
  }

  const stats = {
    files: totalFiles,
    chunks: totalChunks,
    tokens: totalTokens,
  };

  await supabase
    .from("ingestion_jobs")
    .update({
      status: "COMPLETED",
      finished_at: new Date().toISOString(),
      stats,
    })
    .eq("id", job.id);

  console.log("\n✅ Ingestion Complete");
  console.log(`   Files: ${totalFiles}`);
  console.log(`   Chunks: ${totalChunks}`);
  console.log(`   Tokens: ${totalTokens}`);
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err);
  process.exit(1);
});
