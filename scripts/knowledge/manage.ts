/**
 * Knowledge Base Management CLI
 * Utilities for managing the accounting knowledge base
 * 
 * Usage:
 *   tsx scripts/knowledge/manage.ts list-sources
 *   tsx scripts/knowledge/manage.ts stats
 *   tsx scripts/knowledge/manage.ts cleanup --older-than 730
 *   tsx scripts/knowledge/manage.ts refresh-embeddings --document-id <id>
 */

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { Command } from "commander";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const program = new Command();

program
  .name("manage")
  .description("Accounting Knowledge Base Management CLI")
  .version("1.0.0");

program
  .command("list-sources")
  .description("List all knowledge sources")
  .option("-t, --type <type>", "Filter by type (IFRS, IAS, etc.)")
  .option("-j, --jurisdiction <code>", "Filter by jurisdiction code")
  .action(async (options) => {
    let query = supabase
      .from("knowledge_sources")
      .select(
        `
        *,
        jurisdiction:jurisdictions(code, name),
        documents:knowledge_documents(count)
      `
      )
      .order("type", { ascending: true })
      .order("name", { ascending: true });

    if (options.type) {
      query = query.eq("type", options.type);
    }

    if (options.jurisdiction) {
      const { data: jur } = await supabase
        .from("jurisdictions")
        .select("id")
        .eq("code", options.jurisdiction)
        .single();

      if (jur) {
        query = query.eq("jurisdiction_id", jur.id);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error:", error);
      process.exit(1);
    }

    console.log("\n📚 Knowledge Sources\n");
    data?.forEach((source) => {
      console.log(`${source.type.padEnd(12)} ${source.name}`);
      console.log(`${"".padEnd(12)} Authority: ${source.authority_level}`);
      console.log(
        `${"".padEnd(12)} Jurisdiction: ${source.jurisdiction?.code || "N/A"}`
      );
      console.log(`${"".padEnd(12)} URL: ${source.url || "N/A"}`);
      console.log();
    });
  });

program
  .command("stats")
  .description("Show knowledge base statistics")
  .action(async () => {
    console.log("\n📊 Knowledge Base Statistics\n");

    // Sources by type
    const { data: sourceStats } = await supabase
      .from("knowledge_sources")
      .select("type");

    const typeCount: Record<string, number> = {};
    sourceStats?.forEach((s) => {
      typeCount[s.type] = (typeCount[s.type] || 0) + 1;
    });

    console.log("Sources by Type:");
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`  ${type.padEnd(12)} ${count}`);
    });

    // Documents
    const { count: docCount } = await supabase
      .from("knowledge_documents")
      .select("*", { count: "exact", head: true });

    console.log(`\nTotal Documents: ${docCount}`);

    // Chunks
    const { count: chunkCount } = await supabase
      .from("knowledge_chunks")
      .select("*", { count: "exact", head: true });

    console.log(`Total Chunks: ${chunkCount}`);

    // Embeddings
    const { count: embCount } = await supabase
      .from("knowledge_embeddings")
      .select("*", { count: "exact", head: true });

    console.log(`Total Embeddings: ${embCount}`);

    // Ingestion jobs
    const { data: jobStats } = await supabase
      .from("ingestion_jobs")
      .select("status");

    const jobCount: Record<string, number> = {};
    jobStats?.forEach((j) => {
      jobCount[j.status] = (jobCount[j.status] || 0) + 1;
    });

    console.log("\nIngestion Jobs:");
    Object.entries(jobCount).forEach(([status, count]) => {
      console.log(`  ${status.padEnd(12)} ${count}`);
    });

    // Recent queries
    const { count: queryCount } = await supabase
      .from("agent_queries_log")
      .select("*", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    console.log(`\nQueries (last 7 days): ${queryCount}`);

    console.log();
  });

program
  .command("cleanup")
  .description("Clean up old or deprecated documents")
  .option("--older-than <days>", "Delete documents older than N days", "730")
  .option("--dry-run", "Show what would be deleted without deleting")
  .action(async (options) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(options.olderThan));

    console.log(
      `\n🧹 Cleaning up documents deprecated before ${cutoffDate.toISOString().split("T")[0]}\n`
    );

    const { data: toDelete } = await supabase
      .from("knowledge_documents")
      .select("id, title, effective_to")
      .eq("status", "DEPRECATED")
      .lt("effective_to", cutoffDate.toISOString());

    if (!toDelete || toDelete.length === 0) {
      console.log("No documents to clean up.");
      return;
    }

    console.log(`Found ${toDelete.length} documents to delete:`);
    toDelete.forEach((doc) => {
      console.log(`  - ${doc.title} (deprecated: ${doc.effective_to})`);
    });

    if (options.dryRun) {
      console.log("\n[DRY RUN] No changes made.");
      return;
    }

    const { error } = await supabase
      .from("knowledge_documents")
      .delete()
      .in(
        "id",
        toDelete.map((d) => d.id)
      );

    if (error) {
      console.error("Error during cleanup:", error);
      process.exit(1);
    }

    console.log(`\n✅ Deleted ${toDelete.length} documents (cascades to chunks and embeddings).`);
  });

program
  .command("refresh-embeddings")
  .description("Regenerate embeddings for a document")
  .requiredOption("-d, --document-id <id>", "Document ID")
  .action(async (options) => {
    console.log(`\n🔄 Refreshing embeddings for document ${options.documentId}\n`);

    // Get all chunks for document
    const { data: chunks, error: chunkError } = await supabase
      .from("knowledge_chunks")
      .select("id, content")
      .eq("document_id", options.documentId);

    if (chunkError) {
      console.error("Error fetching chunks:", chunkError);
      process.exit(1);
    }

    if (!chunks || chunks.length === 0) {
      console.log("No chunks found for this document.");
      return;
    }

    console.log(`Found ${chunks.length} chunks to re-embed...`);

    // Delete existing embeddings
    await supabase
      .from("knowledge_embeddings")
      .delete()
      .in(
        "chunk_id",
        chunks.map((c) => c.id)
      );

    // Generate new embeddings in batches
    const batchSize = 50;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map((c) => c.content);

      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: texts,
        encoding_format: "float",
      });

      const embeddings = batch.map((c, idx) => ({
        chunk_id: c.id,
        embedding: JSON.stringify(response.data[idx].embedding),
        model: "text-embedding-3-small",
      }));

      const { error: embError } = await supabase
        .from("knowledge_embeddings")
        .insert(embeddings);

      if (embError) {
        console.error("Error inserting embeddings:", embError);
        process.exit(1);
      }

      console.log(
        `  → Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`
      );
    }

    console.log(`\n✅ Refreshed ${chunks.length} embeddings.`);
  });

program
  .command("check-freshness")
  .description("Check document freshness and flag stale content")
  .option("--threshold <days>", "Freshness threshold in days", "180")
  .action(async (options) => {
    const threshold = parseInt(options.threshold);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - threshold);

    console.log(`\n🕐 Checking document freshness (threshold: ${threshold} days)\n`);

    const { data: documents } = await supabase
      .from("knowledge_documents")
      .select(
        `
        id,
        title,
        code,
        updated_at,
        source:knowledge_sources(type, name)
      `
      )
      .eq("status", "ACTIVE")
      .order("updated_at", { ascending: true });

    if (!documents || documents.length === 0) {
      console.log("No active documents found.");
      return;
    }

    const stale: any[] = [];
    const fresh: any[] = [];

    documents.forEach((doc) => {
      const daysOld = Math.floor(
        (Date.now() - new Date(doc.updated_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysOld > threshold) {
        stale.push({ ...doc, daysOld });
      } else {
        fresh.push({ ...doc, daysOld });
      }
    });

    if (stale.length > 0) {
      console.log(`⚠️  Stale Documents (${stale.length}):\n`);
      stale.forEach((doc) => {
        console.log(`  ${doc.code || "N/A"} - ${doc.title}`);
        console.log(`    Last updated: ${doc.daysOld} days ago`);
        console.log(`    Type: ${doc.source.type}`);
        console.log();
      });
    }

    console.log(`✅ Fresh Documents: ${fresh.length}`);
    console.log(`⚠️  Stale Documents: ${stale.length}`);

    if (stale.length > 0) {
      console.log(
        `\n💡 Recommendation: Re-ingest stale documents or verify they are still current.`
      );
    }
  });

program
  .command("export-sources")
  .description("Export sources to JSON for backup")
  .option("-o, --output <file>", "Output file", "knowledge-sources-backup.json")
  .action(async (options) => {
    console.log(`\n📦 Exporting sources to ${options.output}...\n`);

    const { data: sources, error } = await supabase
      .from("knowledge_sources")
      .select(
        `
        *,
        jurisdiction:jurisdictions(code, name),
        documents:knowledge_documents(
          *,
          chunks:knowledge_chunks(count)
        )
      `
      );

    if (error) {
      console.error("Error:", error);
      process.exit(1);
    }

    const fs = await import("node:fs/promises");
    await fs.writeFile(options.output, JSON.stringify(sources, null, 2));

    console.log(`✅ Exported ${sources?.length} sources to ${options.output}`);
  });

program.parse(process.argv);
