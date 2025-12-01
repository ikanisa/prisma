/**
 * DeepSearch Agent Implementation
 * Retrieval agent for accounting and tax knowledge
 * 
 * Usage:
 *   import { DeepSearchAgent } from './agents/deepsearch-agent';
 *   const agent = new DeepSearchAgent({ supabase, openai, config });
 *   const results = await agent.search({ query, jurisdiction, types });
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import yaml from "yaml";
import fs from "node:fs/promises";

interface AgentConfig {
  name: string;
  version: string;
  role: string;
  tools: any[];
  policies: any;
  output_contract: any;
  performance: any;
}

interface SearchOptions {
  query: string;
  jurisdiction?: string;
  types?: string[];
  authorityLevels?: string[];
  topK?: number;
  minSimilarity?: number;
}

interface SearchResult {
  chunk_id: string;
  document_id: string;
  document_code: string;
  document_title: string;
  source_name: string;
  source_type: string;
  authority_level: string;
  jurisdiction_code: string;
  section_path: string;
  heading: string;
  content: string;
  similarity: number;
}

interface AgentResponse {
  answer: string;
  reasoning: string;
  sources: Array<{
    code: string;
    title: string;
    section: string;
    url?: string;
    similarity: number;
  }>;
  confidence: number;
  audit_trail: {
    chunk_ids: string[];
    query_timestamp: string;
    latency_ms: number;
  };
}

export class DeepSearchAgent {
  private supabase: SupabaseClient;
  private openai: OpenAI;
  private config: AgentConfig;

  constructor(options: {
    supabase: SupabaseClient;
    openai: OpenAI;
    config?: AgentConfig;
  }) {
    this.supabase = options.supabase;
    this.openai = options.openai;
    this.config = options.config || this.getDefaultConfig();
  }

  static async fromConfigFile(
    supabase: SupabaseClient,
    openai: OpenAI,
    configPath: string
  ): Promise<DeepSearchAgent> {
    const configText = await fs.readFile(configPath, "utf-8");
    const config = yaml.parse(configText).agent;
    return new DeepSearchAgent({ supabase, openai, config });
  }

  private getDefaultConfig(): AgentConfig {
    return {
      name: "DeepSearch",
      version: "1.0.0",
      role: "Retrieve, verify, and rank authoritative accounting and tax knowledge",
      tools: [],
      policies: {
        retrieval: {
          authority_order: ["PRIMARY", "INTERNAL", "SECONDARY"],
          min_relevance_score: 0.75,
          max_chunks: 6,
        },
      },
      output_contract: {},
      performance: {
        max_response_time_seconds: 5,
      },
    };
  }

  async search(options: SearchOptions): Promise<AgentResponse> {
    const startTime = Date.now();

    // Generate embedding for query
    const embedding = await this.generateEmbedding(options.query);

    // Get jurisdiction ID if specified
    let jurisdictionId: string | null = null;
    if (options.jurisdiction) {
      jurisdictionId = await this.getJurisdictionId(options.jurisdiction);
    }

    // Perform semantic search
    const results = await this.semanticSearch(
      embedding,
      options.minSimilarity || this.config.policies.retrieval.min_relevance_score,
      options.topK || this.config.policies.retrieval.max_chunks,
      jurisdictionId,
      options.types,
      options.authorityLevels
    );

    // Apply retrieval rules
    const rankedResults = this.applyRetrievalRules(results);

    // Generate answer with LLM
    const answer = await this.generateAnswer(options.query, rankedResults);

    const latencyMs = Date.now() - startTime;

    // Log query
    await this.logQuery(options.query, rankedResults, latencyMs);

    return {
      answer: answer.text,
      reasoning: answer.reasoning,
      sources: rankedResults.map((r) => ({
        code: r.document_code,
        title: r.document_title,
        section: r.section_path,
        url: undefined, // TODO: Add URL from source
        similarity: r.similarity,
      })),
      confidence: this.calculateConfidence(rankedResults),
      audit_trail: {
        chunk_ids: rankedResults.map((r) => r.chunk_id),
        query_timestamp: new Date().toISOString(),
        latency_ms: latencyMs,
      },
    };
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    });

    return response.data[0].embedding;
  }

  private async getJurisdictionId(code: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from("jurisdictions")
      .select("id")
      .eq("code", code)
      .maybeSingle();

    if (error) throw error;
    return data?.id || null;
  }

  private async semanticSearch(
    embedding: number[],
    threshold: number,
    count: number,
    jurisdictionId: string | null,
    types: string[] | undefined,
    authorityLevels: string[] | undefined
  ): Promise<SearchResult[]> {
    const { data, error } = await this.supabase.rpc("search_knowledge_semantic", {
      query_embedding: JSON.stringify(embedding),
      match_threshold: threshold,
      match_count: count,
      filter_jurisdiction_id: jurisdictionId,
      filter_types: types || null,
      filter_authority_levels: authorityLevels || null,
    });

    if (error) throw error;
    return data || [];
  }

  private applyRetrievalRules(results: SearchResult[]): SearchResult[] {
    // Sort by authority level first, then similarity
    const authorityOrder = this.config.policies.retrieval.authority_order;

    return results.sort((a, b) => {
      const aAuthorityIndex = authorityOrder.indexOf(a.authority_level);
      const bAuthorityIndex = authorityOrder.indexOf(b.authority_level);

      if (aAuthorityIndex !== bAuthorityIndex) {
        return aAuthorityIndex - bAuthorityIndex;
      }

      return b.similarity - a.similarity;
    });
  }

  private async generateAnswer(
    query: string,
    results: SearchResult[]
  ): Promise<{ text: string; reasoning: string }> {
    if (results.length === 0) {
      return {
        text: "I couldn't find relevant information in my knowledge base. Could you provide more details or rephrase your question?",
        reasoning: "No results found above similarity threshold.",
      };
    }

    const context = results
      .map(
        (r, idx) =>
          `[${idx + 1}] ${r.document_code} ${r.section_path || ""}\n${r.content}`
      )
      .join("\n\n");

    const systemPrompt = `You are DeepSearch, an expert accounting and tax knowledge retrieval agent. 
Your role is to provide accurate, citation-backed answers based on authoritative sources like IFRS, IAS, ISA, and tax laws.

CRITICAL RULES:
- Only use information from the provided context
- Always cite sources using format: (${results[0].document_code}${results[0].section_path ? " " + results[0].section_path : ""})
- State jurisdiction assumptions clearly
- Flag any uncertainty or low confidence
- Prefer primary sources over secondary commentary
- If context doesn't fully answer the question, say so`;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Question: ${query}\n\nContext from knowledge base:\n${context}\n\nProvide a clear, citation-backed answer.`,
        },
      ],
      temperature: 0.1,
    });

    return {
      text: completion.choices[0].message.content || "",
      reasoning: `Based on ${results.length} relevant sources with average similarity ${(results.reduce((sum, r) => sum + r.similarity, 0) / results.length * 100).toFixed(1)}%`,
    };
  }

  private calculateConfidence(results: SearchResult[]): number {
    if (results.length === 0) return 0;

    // Confidence based on:
    // - Average similarity score (50%)
    // - Number of primary sources (30%)
    // - Total number of results (20%)

    const avgSimilarity =
      results.reduce((sum, r) => sum + r.similarity, 0) / results.length;

    const primaryCount = results.filter(
      (r) => r.authority_level === "PRIMARY"
    ).length;
    const primaryRatio = primaryCount / results.length;

    const resultCountScore = Math.min(results.length / 5, 1);

    const confidence =
      avgSimilarity * 0.5 + primaryRatio * 0.3 + resultCountScore * 0.2;

    return Math.round(confidence * 100) / 100;
  }

  private async logQuery(
    query: string,
    results: SearchResult[],
    latencyMs: number
  ): Promise<void> {
    await this.supabase.from("agent_queries_log").insert({
      agent_name: this.config.name,
      query_text: query,
      top_chunk_ids: results.slice(0, 6).map((r) => r.chunk_id),
      latency_ms: latencyMs,
      metadata: {
        result_count: results.length,
        avg_similarity:
          results.reduce((sum, r) => sum + r.similarity, 0) / results.length,
        primary_count: results.filter((r) => r.authority_level === "PRIMARY")
          .length,
      },
    });
  }

  async checkFreshness(documentId: string): Promise<{
    is_fresh: boolean;
    days_old: number;
    recommendation: string;
  }> {
    const { data, error } = await this.supabase
      .from("knowledge_documents")
      .select("created_at, updated_at")
      .eq("id", documentId)
      .single();

    if (error) throw error;

    const daysOld = Math.floor(
      (Date.now() - new Date(data.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    const freshnessThreshold = 180; // 180 days from config

    return {
      is_fresh: daysOld < freshnessThreshold,
      days_old: daysOld,
      recommendation:
        daysOld > freshnessThreshold
          ? "Consider checking external sources for updates"
          : "Document is current",
    };
  }
}
