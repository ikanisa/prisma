/**
 * Curated Knowledge Base (CKB) Service
 * Manages the structured knowledge library with standards, definitions,
 * worked examples, and metadata for AI agent retrieval.
 *
 * The CKB follows a hierarchical structure:
 * - Central: IFRS/IAS/ISA/tax laws
 * - Domain-specific: insurance, real estate, restaurants
 * - Company-specific: internal policies
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceRoleKey } from '@prisma-glow/lib/secrets';
import type {
  CuratedKnowledgeEntry,
  CreateKnowledgeEntryRequest,
  KnowledgeSearchRequest,
  KnowledgeSearchResult,
  KnowledgeStandardType,
  KnowledgeVerificationLevel,
  KnowledgeSourcePriority,
  ReasoningStep,
  AgentReasoningTrace,
  CreateReasoningTraceRequest,
  Citation,
  GuardrailAction,
} from './types/curated-knowledge-base.js';
import { embed_chunks } from './vector.js';

let cachedSupabase: SupabaseClient | null = null;

async function getSupabase(): Promise<SupabaseClient> {
  if (cachedSupabase) {
    return cachedSupabase;
  }

  const url = process.env.SUPABASE_URL ?? '';
  if (!url) {
    throw new Error('SUPABASE_URL must be configured for CKB.');
  }

  const serviceRoleKey = await getSupabaseServiceRoleKey();
  cachedSupabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return cachedSupabase;
}

/**
 * Create a slug from title
 */
function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 255);
}

/**
 * Create a new knowledge entry
 */
export async function createKnowledgeEntry(
  orgId: string,
  request: CreateKnowledgeEntryRequest,
): Promise<CuratedKnowledgeEntry> {
  const supabase = await getSupabase();

  // Generate slug if not provided
  const slug = request.slug ?? createSlug(request.title);

  // Generate embedding for semantic search
  const embeddings = await embed_chunks([request.fullText]);
  const embedding = embeddings[0];

  const { data, error } = await supabase
    .from('curated_knowledge_base')
    .insert({
      organization_id: orgId,
      title: request.title,
      slug,
      section_key: request.sectionKey,
      standard_type: request.standardType,
      verification_level: request.verificationLevel ?? 'secondary',
      source_priority: request.sourcePriority ?? 'interpretive',
      jurisdiction: request.jurisdiction ?? [],
      effective_date: request.effectiveDate,
      expiry_date: request.expiryDate,
      version: request.version,
      summary: request.summary,
      full_text: request.fullText,
      source_url: request.sourceUrl,
      embedding,
      tags: request.tags ?? [],
      domain: request.domain,
      metadata: request.metadata ?? {},
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapRowToEntry(data);
}

/**
 * Get a knowledge entry by ID
 */
export async function getKnowledgeEntry(
  orgId: string,
  entryId: string,
): Promise<CuratedKnowledgeEntry | null> {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from('curated_knowledge_base')
    .select('*')
    .eq('id', entryId)
    .or(`organization_id.is.null,organization_id.eq.${orgId}`)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapRowToEntry(data) : null;
}

/**
 * Search the curated knowledge base
 */
export async function searchKnowledgeBase(
  orgId: string,
  request: KnowledgeSearchRequest,
): Promise<KnowledgeSearchResult[]> {
  const supabase = await getSupabase();

  // Generate embedding for query
  const embeddings = await embed_chunks([request.query]);
  const queryEmbedding = embeddings[0];

  // Use the database function for optimized search
  const { data, error } = await supabase.rpc('search_curated_knowledge', {
    p_org_id: orgId,
    p_query_embedding: queryEmbedding,
    p_jurisdictions: request.jurisdictions ?? null,
    p_domains: request.domains ?? null,
    p_standard_types: request.standardTypes ?? null,
    p_limit: request.limit ?? 10,
    p_min_similarity: request.minSimilarity ?? 0.7,
  });

  if (error) {
    throw error;
  }

  return (data ?? []).map(
    (row: {
      knowledge_id: string;
      title: string;
      section_key: string | null;
      summary: string | null;
      full_text: string;
      standard_type: KnowledgeStandardType;
      verification_level: KnowledgeVerificationLevel;
      source_priority: KnowledgeSourcePriority;
      jurisdiction: string[];
      tags: string[];
      source_url: string | null;
      similarity_score: number;
      is_outdated: boolean;
    }) => ({
      knowledgeId: row.knowledge_id,
      title: row.title,
      sectionKey: row.section_key ?? undefined,
      summary: row.summary ?? undefined,
      fullText: row.full_text,
      standardType: row.standard_type,
      verificationLevel: row.verification_level,
      sourcePriority: row.source_priority,
      jurisdiction: row.jurisdiction ?? [],
      tags: row.tags ?? [],
      sourceUrl: row.source_url ?? undefined,
      similarityScore: parseFloat(String(row.similarity_score)),
      isOutdated: row.is_outdated,
    }),
  );
}

/**
 * Update usage statistics for knowledge entries
 */
export async function updateUsageStats(entryIds: string[]): Promise<void> {
  const supabase = await getSupabase();
  await supabase.rpc('update_ckb_usage', { p_knowledge_ids: entryIds });
}

/**
 * Mark an entry as outdated
 */
export async function markAsOutdated(
  orgId: string,
  entryId: string,
  supersededById?: string,
): Promise<void> {
  const supabase = await getSupabase();

  await supabase
    .from('curated_knowledge_base')
    .update({
      is_outdated: true,
      superseded_by: supersededById,
    })
    .eq('id', entryId)
    .or(`organization_id.is.null,organization_id.eq.${orgId}`);
}

/**
 * Log a reasoning trace for audit
 */
export async function logReasoningTrace(
  orgId: string,
  request: CreateReasoningTraceRequest,
): Promise<string> {
  const supabase = await getSupabase();

  const { data, error } = await supabase.rpc('log_reasoning_trace', {
    p_org_id: orgId,
    p_agent_id: request.agentId,
    p_query_text: request.queryText,
    p_reasoning_steps: request.reasoningSteps,
    p_sources_consulted: request.sourcesConsulted,
    p_final_answer: request.finalAnswer,
    p_citations: request.citations,
    p_confidence_score: request.confidenceScore,
    p_deep_search_triggered: request.deepSearchTriggered ?? false,
    p_guardrails_triggered: request.guardrailsTriggered ?? null,
    p_guardrail_actions: request.guardrailActions ?? null,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get reasoning traces for review
 */
export async function getReasoningTracesForReview(
  orgId: string,
  options?: { limit?: number; agentId?: string },
): Promise<AgentReasoningTrace[]> {
  const supabase = await getSupabase();

  let query = supabase
    .from('agent_reasoning_traces')
    .select('*')
    .eq('organization_id', orgId)
    .eq('requires_review', true)
    .is('reviewed_at', null)
    .order('created_at', { ascending: false });

  if (options?.agentId) {
    query = query.eq('agent_id', options.agentId);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapRowToTrace);
}

/**
 * Mark a reasoning trace as reviewed
 */
export async function reviewReasoningTrace(
  orgId: string,
  traceId: string,
  reviewedBy: string,
  notes?: string,
): Promise<void> {
  const supabase = await getSupabase();

  await supabase
    .from('agent_reasoning_traces')
    .update({
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      review_notes: notes,
      requires_review: false,
    })
    .eq('id', traceId)
    .eq('organization_id', orgId);
}

/**
 * Get knowledge entries by standard type
 */
export async function getEntriesByStandardType(
  orgId: string,
  standardType: KnowledgeStandardType,
  options?: { limit?: number; jurisdiction?: string[] },
): Promise<CuratedKnowledgeEntry[]> {
  const supabase = await getSupabase();

  let query = supabase
    .from('curated_knowledge_base')
    .select('*')
    .eq('standard_type', standardType)
    .eq('is_active', true)
    .or(`organization_id.is.null,organization_id.eq.${orgId}`)
    .order('verification_level', { ascending: true });

  if (options?.jurisdiction?.length) {
    query = query.overlaps('jurisdiction', options.jurisdiction);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapRowToEntry);
}

/**
 * Seed knowledge base with IFRS/IAS standards
 */
export async function seedIFRSStandards(orgId: string | null): Promise<number> {
  const supabase = await getSupabase();

  const standards = [
    // IFRS Standards
    { title: 'IFRS 1 - First-time Adoption of IFRS', sectionKey: 'IFRS 1', tags: ['IFRS', 'IFRS1'] },
    { title: 'IFRS 2 - Share-based Payment', sectionKey: 'IFRS 2', tags: ['IFRS', 'IFRS2'] },
    { title: 'IFRS 3 - Business Combinations', sectionKey: 'IFRS 3', tags: ['IFRS', 'IFRS3'] },
    { title: 'IFRS 9 - Financial Instruments', sectionKey: 'IFRS 9', tags: ['IFRS', 'IFRS9'] },
    { title: 'IFRS 10 - Consolidated Financial Statements', sectionKey: 'IFRS 10', tags: ['IFRS', 'IFRS10'] },
    { title: 'IFRS 15 - Revenue from Contracts with Customers', sectionKey: 'IFRS 15', tags: ['IFRS', 'IFRS15'] },
    { title: 'IFRS 16 - Leases', sectionKey: 'IFRS 16', tags: ['IFRS', 'IFRS16'] },
    { title: 'IFRS 17 - Insurance Contracts', sectionKey: 'IFRS 17', tags: ['IFRS', 'IFRS17'] },
    // IAS Standards
    { title: 'IAS 1 - Presentation of Financial Statements', sectionKey: 'IAS 1', tags: ['IAS', 'IAS1'] },
    { title: 'IAS 2 - Inventories', sectionKey: 'IAS 2', tags: ['IAS', 'IAS2'] },
    { title: 'IAS 7 - Statement of Cash Flows', sectionKey: 'IAS 7', tags: ['IAS', 'IAS7'] },
    { title: 'IAS 12 - Income Taxes', sectionKey: 'IAS 12', tags: ['IAS', 'IAS12'] },
    { title: 'IAS 16 - Property, Plant and Equipment', sectionKey: 'IAS 16', tags: ['IAS', 'IAS16'] },
    { title: 'IAS 21 - Effects of Changes in Foreign Exchange Rates', sectionKey: 'IAS 21', tags: ['IAS', 'IAS21'] },
    { title: 'IAS 36 - Impairment of Assets', sectionKey: 'IAS 36', tags: ['IAS', 'IAS36'] },
    { title: 'IAS 37 - Provisions, Contingent Liabilities and Contingent Assets', sectionKey: 'IAS 37', tags: ['IAS', 'IAS37'] },
    { title: 'IAS 38 - Intangible Assets', sectionKey: 'IAS 38', tags: ['IAS', 'IAS38'] },
  ];

  let count = 0;
  for (const standard of standards) {
    try {
      await supabase.from('curated_knowledge_base').upsert(
        {
          organization_id: orgId,
          title: standard.title,
          slug: createSlug(standard.title),
          section_key: standard.sectionKey,
          standard_type: standard.sectionKey.startsWith('IFRS') ? 'IFRS' : 'IAS',
          verification_level: 'primary',
          source_priority: 'authoritative',
          jurisdiction: ['INTL'],
          full_text: `${standard.title} - Placeholder content for ${standard.sectionKey}. Full standard text to be ingested from IFRS Foundation.`,
          source_url: 'https://www.ifrs.org/issued-standards/list-of-standards/',
          tags: standard.tags,
          domain: 'financial_reporting',
        },
        { onConflict: 'organization_id,slug' },
      );
      count++;
    } catch {
      // Skip duplicates
    }
  }

  return count;
}

/**
 * Get knowledge base statistics
 */
export async function getKnowledgeBaseStats(
  orgId: string,
): Promise<{
  totalEntries: number;
  byStandardType: Record<string, number>;
  byVerificationLevel: Record<string, number>;
  byDomain: Record<string, number>;
  outdatedCount: number;
  pendingReviewCount: number;
}> {
  const supabase = await getSupabase();

  // Get total and breakdowns
  const { data: entries } = await supabase
    .from('curated_knowledge_base')
    .select('id, standard_type, verification_level, domain, is_outdated')
    .or(`organization_id.is.null,organization_id.eq.${orgId}`)
    .eq('is_active', true);

  const entriesList = entries ?? [];

  // Get pending review count
  const { count: pendingReview } = await supabase
    .from('agent_reasoning_traces')
    .select('id', { count: 'exact' })
    .eq('organization_id', orgId)
    .eq('requires_review', true)
    .is('reviewed_at', null);

  // Calculate stats
  const byStandardType: Record<string, number> = {};
  const byVerificationLevel: Record<string, number> = {};
  const byDomain: Record<string, number> = {};
  let outdatedCount = 0;

  for (const entry of entriesList) {
    // By standard type
    const st = entry.standard_type ?? 'unknown';
    byStandardType[st] = (byStandardType[st] ?? 0) + 1;

    // By verification level
    const vl = entry.verification_level ?? 'unknown';
    byVerificationLevel[vl] = (byVerificationLevel[vl] ?? 0) + 1;

    // By domain
    const domain = entry.domain ?? 'unknown';
    byDomain[domain] = (byDomain[domain] ?? 0) + 1;

    // Outdated
    if (entry.is_outdated) {
      outdatedCount++;
    }
  }

  return {
    totalEntries: entriesList.length,
    byStandardType,
    byVerificationLevel,
    byDomain,
    outdatedCount,
    pendingReviewCount: pendingReview ?? 0,
  };
}

/**
 * Map database row to CuratedKnowledgeEntry
 */
function mapRowToEntry(row: Record<string, unknown>): CuratedKnowledgeEntry {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string | null,
    title: row.title as string,
    slug: row.slug as string,
    sectionKey: row.section_key as string | undefined,
    standardType: row.standard_type as KnowledgeStandardType,
    verificationLevel: row.verification_level as KnowledgeVerificationLevel,
    sourcePriority: row.source_priority as KnowledgeSourcePriority,
    jurisdiction: (row.jurisdiction as string[]) ?? [],
    effectiveDate: row.effective_date as string | undefined,
    expiryDate: row.expiry_date as string | undefined,
    version: row.version as string | undefined,
    summary: row.summary as string | undefined,
    fullText: row.full_text as string,
    sourceUrl: row.source_url as string | undefined,
    sourceDocumentId: row.source_document_id as string | undefined,
    tags: (row.tags as string[]) ?? [],
    domain: row.domain as string | undefined,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    usageCount: (row.usage_count as number) ?? 0,
    citationCount: (row.citation_count as number) ?? 0,
    lastCitedAt: row.last_cited_at as string | undefined,
    qualityScore: row.quality_score ? parseFloat(row.quality_score as string) : undefined,
    isActive: row.is_active as boolean,
    isOutdated: row.is_outdated as boolean,
    supersededBy: row.superseded_by as string | undefined,
    createdBy: row.created_by as string | undefined,
    reviewedBy: row.reviewed_by as string | undefined,
    reviewedAt: row.reviewed_at as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Map database row to AgentReasoningTrace
 */
function mapRowToTrace(row: Record<string, unknown>): AgentReasoningTrace {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    agentId: row.agent_id as string,
    executionId: row.execution_id as string | undefined,
    sessionId: row.session_id as string | undefined,
    userId: row.user_id as string | undefined,
    queryText: row.query_text as string,
    sourcesConsulted: (row.sources_consulted as string[]) ?? [],
    deepSearchTriggered: row.deep_search_triggered as boolean,
    deepSearchSources: (row.deep_search_sources as string[]) ?? [],
    guardrailsEvaluated: (row.guardrails_evaluated as string[]) ?? [],
    guardrailsTriggered: (row.guardrails_triggered as string[]) ?? [],
    guardrailActions: (row.guardrail_actions as GuardrailAction[]) ?? [],
    reasoningSteps: (row.reasoning_steps as ReasoningStep[]) ?? [],
    finalAnswer: row.final_answer as string | undefined,
    citations: (row.citations as Citation[]) ?? [],
    confidenceScore: row.confidence_score ? parseFloat(row.confidence_score as string) : undefined,
    retrievalLatencyMs: row.retrieval_latency_ms as number | undefined,
    reasoningLatencyMs: row.reasoning_latency_ms as number | undefined,
    totalLatencyMs: row.total_latency_ms as number | undefined,
    hasConflicts: row.has_conflicts as boolean,
    requiresReview: row.requires_review as boolean,
    reviewedBy: row.reviewed_by as string | undefined,
    reviewedAt: row.reviewed_at as string | undefined,
    reviewNotes: row.review_notes as string | undefined,
    createdAt: row.created_at as string,
  };
}
