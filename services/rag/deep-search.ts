/**
 * Deep Search Service
 * Implements the Deep Search layer for authoritative source retrieval
 *
 * The Deep Search layer is triggered when:
 * - Standard is updated
 * - Jurisdiction is missing
 * - Conflicts exist
 * - Recent tax changes occur
 * - Metadata says "last updated > 30 days"
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceRoleKey } from '@prisma-glow/lib/secrets';
import type {
  DeepSearchRequest,
  DeepSearchResponse,
  DeepSearchResult,
  DeepSearchSource,
  KnowledgeSearchResult,
  KnowledgeVerificationLevel,
} from './types/curated-knowledge-base.js';
import { createWebSearchTool, extractWebSearchResults } from './web-search-utils.js';

let cachedSupabase: SupabaseClient | null = null;

async function getSupabase(): Promise<SupabaseClient> {
  if (cachedSupabase) {
    return cachedSupabase;
  }

  const url = process.env.SUPABASE_URL ?? '';
  if (!url) {
    throw new Error('SUPABASE_URL must be configured for deep search.');
  }

  const serviceRoleKey = await getSupabaseServiceRoleKey();
  cachedSupabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return cachedSupabase;
}

/**
 * Authoritative domains for Deep Search
 * Organized by verification level and source type
 */
export const AUTHORITATIVE_DOMAINS = {
  primary: {
    ifrs: ['ifrs.org', 'iasb.org'],
    iaasb: ['iaasb.org', 'ifac.org'],
    oecd: ['oecd.org'],
    taxAuthorities: {
      RW: ['rra.gov.rw'],
      MT: ['cfr.gov.mt', 'mfsa.mt'],
      US: ['irs.gov'],
      UK: ['gov.uk/hmrc'],
      EU: ['ec.europa.eu/taxation_customs'],
    },
  },
  secondary: {
    acca: ['accaglobal.com'],
    cpa: ['cpacanada.ca', 'aicpa.org'],
    bigFour: ['pwc.com', 'kpmg.com', 'ey.com', 'deloitte.com'],
  },
} as const;

/**
 * Get authoritative domains for a given jurisdiction and domain
 */
export function getAuthoritativeDomains(
  jurisdictions: string[] = ['INTL'],
  domains: string[] = [],
  includeSecondary = false,
): string[] {
  const authDomains: string[] = [];

  // Always include IFRS/IAASB for accounting/audit
  if (domains.length === 0 || domains.includes('financial_reporting') || domains.includes('audit')) {
    authDomains.push(...AUTHORITATIVE_DOMAINS.primary.ifrs);
    authDomains.push(...AUTHORITATIVE_DOMAINS.primary.iaasb);
  }

  // Include OECD for tax
  if (domains.length === 0 || domains.includes('tax')) {
    authDomains.push(...AUTHORITATIVE_DOMAINS.primary.oecd);
  }

  // Add jurisdiction-specific tax authorities
  for (const jurisdiction of jurisdictions) {
    const taxAuth =
      AUTHORITATIVE_DOMAINS.primary.taxAuthorities[
        jurisdiction as keyof typeof AUTHORITATIVE_DOMAINS.primary.taxAuthorities
      ];
    if (taxAuth) {
      authDomains.push(...taxAuth);
    }
  }

  // Include secondary sources if requested
  if (includeSecondary) {
    authDomains.push(...AUTHORITATIVE_DOMAINS.secondary.acca);
    authDomains.push(...AUTHORITATIVE_DOMAINS.secondary.cpa);
    authDomains.push(...AUTHORITATIVE_DOMAINS.secondary.bigFour);
  }

  // Ensure max 20 domains (OpenAI limit)
  return [...new Set(authDomains)].slice(0, 20);
}

/**
 * Get Deep Search sources from database
 */
export async function getDeepSearchSources(options?: {
  jurisdictions?: string[];
  domains?: string[];
  sourceTypes?: string[];
  includeSecondary?: boolean;
}): Promise<DeepSearchSource[]> {
  const supabase = await getSupabase();

  let query = supabase.from('deep_search_sources').select('*').eq('is_active', true);

  if (options?.jurisdictions?.length) {
    query = query.overlaps('jurisdictions', options.jurisdictions);
  }

  if (options?.domains?.length) {
    query = query.overlaps('domains', options.domains);
  }

  if (options?.sourceTypes?.length) {
    query = query.in('source_type', options.sourceTypes);
  }

  if (!options?.includeSecondary) {
    query = query.eq('verification_level', 'primary');
  }

  const { data, error } = await query.order('trust_score', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    sourceType: row.source_type,
    baseUrl: row.base_url,
    apiEndpoint: row.api_endpoint,
    requiresAuth: row.requires_auth,
    authConfig: row.auth_config,
    verificationLevel: row.verification_level,
    sourcePriority: row.source_priority,
    trustScore: parseFloat(row.trust_score),
    jurisdictions: row.jurisdictions ?? [],
    domains: row.domains ?? [],
    syncEnabled: row.sync_enabled,
    syncFrequencyHours: row.sync_frequency_hours,
    lastSyncedAt: row.last_synced_at,
    nextSyncAt: row.next_sync_at,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Check if Deep Search should be triggered based on guardrails
 */
export async function shouldTriggerDeepSearch(options: {
  orgId: string;
  domain: string;
  sourcesFound: number;
  maxSourceAgeDays?: number;
  hasJurisdictionMatch?: boolean;
}): Promise<boolean> {
  const supabase = await getSupabase();

  const { data, error } = await supabase.rpc('should_trigger_deep_search', {
    p_org_id: options.orgId,
    p_domain: options.domain,
    p_sources_found: options.sourcesFound,
    p_max_source_age_days: options.maxSourceAgeDays ?? null,
    p_has_jurisdiction_match: options.hasJurisdictionMatch ?? true,
  });

  if (error) {
    // Default to triggering Deep Search on error
    return true;
  }

  return data === true;
}

/**
 * Perform Deep Search across authoritative sources
 */
export async function performDeepSearch(request: DeepSearchRequest): Promise<DeepSearchResponse> {
  const startTime = Date.now();
  const results: DeepSearchResult[] = [];
  const sourcesQueried: string[] = [];

  // Get configured sources
  const sources = await getDeepSearchSources({
    jurisdictions: request.jurisdictions,
    domains: request.domains,
    sourceTypes: request.sourceTypes,
    includeSecondary: request.includeSecondary,
  });

  // Get authoritative domains for web search
  const allowedDomains = getAuthoritativeDomains(
    request.jurisdictions,
    request.domains,
    request.includeSecondary,
  );

  // Create web search tool with domain restrictions
  const webSearchTool = createWebSearchTool({
    allowedDomains,
  });

  // Track source metrics
  let primarySourceCount = 0;
  let secondarySourceCount = 0;
  let cacheHits = 0;

  // Check cache first
  const supabase = await getSupabase();
  const cacheKey = JSON.stringify({
    query: request.query,
    jurisdictions: request.jurisdictions,
    domains: request.domains,
  });

  const { data: cachedResults } = await supabase
    .from('web_fetch_cache')
    .select('*')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (cachedResults?.response_body) {
    try {
      const cached = JSON.parse(cachedResults.response_body);
      if (Array.isArray(cached.results)) {
        for (const result of cached.results) {
          results.push({
            ...result,
            isFromCache: true,
            cachedAt: cachedResults.created_at,
          });
          cacheHits++;
        }
      }
    } catch {
      // Cache parse failed, continue with fresh search
    }
  }

  // If no cache hits, perform live search
  if (results.length === 0) {
    try {
      // Use OpenAI web search if available
      // Dynamic import wrapped in try-catch for graceful error handling
      let openaiModule;
      try {
        openaiModule = await import('./openai-chat-completions.js');
      } catch (importError) {
        console.warn('OpenAI module not available for Deep Search:', importError);
        // Return empty results if module is not available
        return {
          results: [],
          totalResults: 0,
          sourcesQueried: [],
          hasAuthoritativeSources: false,
          requiresUpdate: true,
          meta: {
            queryTime: Date.now() - startTime,
            cacheHitRate: 0,
            primarySourceCount: 0,
            secondarySourceCount: 0,
          },
        };
      }

      const response = await openaiModule.createChatCompletion({
        model: process.env.OPENAI_DOMAIN_MODEL ?? 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert in accounting standards, auditing, and tax law. 
Search for authoritative information on the following query.
Always cite specific clause references (e.g., "IAS 21.28-37", "IFRS 15.9").
Prioritize primary sources (IFRS Foundation, IAASB, tax authorities) over secondary sources.`,
          },
          {
            role: 'user',
            content: request.query,
          },
        ],
        tools: [webSearchTool],
      });

      const extracted = extractWebSearchResults(response as unknown as Record<string, unknown>);

      // Process search results
      if (extracted.sources?.length) {
        for (const source of extracted.sources) {
          const sourceUrl = source.url ?? '';
          const verificationLevel = determineVerificationLevel(sourceUrl);

          if (verificationLevel === 'primary') {
            primarySourceCount++;
          } else {
            secondarySourceCount++;
          }

          // Find matching source from database
          const matchingSource = sources.find((s) => sourceUrl.includes(s.baseUrl ?? ''));

          results.push({
            sourceId: matchingSource?.id ?? 'web-search',
            sourceName: source.title ?? matchingSource?.name ?? 'Web Search',
            sourceType: matchingSource?.sourceType ?? 'regulatory_pdf',
            verificationLevel,
            content: extracted.answer,
            url: sourceUrl,
            citations: extractCitations(extracted.answer),
            relevanceScore: 0.8, // Default score for web search results
            isFromCache: false,
          });

          sourcesQueried.push(sourceUrl);
        }
      }

      // Cache the results
      if (results.length > 0) {
        await supabase.from('web_fetch_cache').upsert({
          cache_key: cacheKey,
          url: request.query,
          response_body: JSON.stringify({ results }),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        });
      }
    } catch (error) {
      // Log error but continue with partial results
      console.error('Deep Search web query failed:', error);
    }
  }

  // Sort results by verification level and relevance
  results.sort((a, b) => {
    const levelOrder = { primary: 0, secondary: 1, tertiary: 2 };
    const levelDiff = levelOrder[a.verificationLevel] - levelOrder[b.verificationLevel];
    if (levelDiff !== 0) return levelDiff;
    return b.relevanceScore - a.relevanceScore;
  });

  // Limit results
  const limitedResults = results.slice(0, request.maxResults ?? 10);

  return {
    results: limitedResults,
    totalResults: results.length,
    sourcesQueried,
    hasAuthoritativeSources: primarySourceCount > 0,
    requiresUpdate: primarySourceCount === 0 && secondarySourceCount > 0,
    meta: {
      queryTime: Date.now() - startTime,
      cacheHitRate: results.length > 0 ? cacheHits / results.length : 0,
      primarySourceCount,
      secondarySourceCount,
    },
  };
}

/**
 * Determine verification level based on URL
 */
function determineVerificationLevel(url: string): KnowledgeVerificationLevel {
  const lowerUrl = url.toLowerCase();

  // Primary sources
  for (const domains of Object.values(AUTHORITATIVE_DOMAINS.primary)) {
    if (Array.isArray(domains)) {
      if (domains.some((d) => lowerUrl.includes(d))) {
        return 'primary';
      }
    } else if (typeof domains === 'object') {
      for (const jurisdictionDomains of Object.values(domains)) {
        if (jurisdictionDomains.some((d) => lowerUrl.includes(d))) {
          return 'primary';
        }
      }
    }
  }

  // Secondary sources
  for (const domains of Object.values(AUTHORITATIVE_DOMAINS.secondary)) {
    if (domains.some((d) => lowerUrl.includes(d))) {
      return 'secondary';
    }
  }

  return 'tertiary';
}

/**
 * Extract citations from text (e.g., "IAS 21.28-37", "IFRS 15.9")
 */
function extractCitations(text: string): string[] {
  const citations: string[] = [];

  // Match patterns like:
  // - IAS 21.28-37
  // - IFRS 15.9
  // - ISA 540.12
  // - Section 14(a)
  const patterns = [
    /\b(IAS|IFRS|ISA|IFRIC)\s+\d+(?:\.\d+(?:-\d+)?)?/gi,
    /\bSection\s+\d+(?:\([a-z]\))?/gi,
    /\bArticle\s+\d+(?:\.\d+)?/gi,
    /\bParagraph\s+\d+(?:\.\d+)?/gi,
  ];

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      citations.push(match[0]);
    }
  }

  return [...new Set(citations)];
}

/**
 * Merge Deep Search results with CKB results
 * Prioritizes primary sources and deduplicates
 */
export function mergeWithCKBResults(
  ckbResults: KnowledgeSearchResult[],
  deepSearchResults: DeepSearchResult[],
): KnowledgeSearchResult[] {
  const merged: KnowledgeSearchResult[] = [...ckbResults];

  for (const dsResult of deepSearchResults) {
    // Check if already exists in CKB results
    const exists = merged.some(
      (r) => r.sourceUrl === dsResult.url || r.title.toLowerCase() === dsResult.sourceName.toLowerCase(),
    );

    if (!exists) {
      // Convert Deep Search result to CKB format
      merged.push({
        knowledgeId: dsResult.sourceId,
        title: dsResult.sourceName,
        fullText: dsResult.content,
        standardType: 'REGULATORY', // Default for web search results
        verificationLevel: dsResult.verificationLevel,
        sourcePriority: dsResult.verificationLevel === 'primary' ? 'authoritative' : 'interpretive',
        jurisdiction: [],
        tags: dsResult.citations,
        sourceUrl: dsResult.url,
        similarityScore: dsResult.relevanceScore,
        isOutdated: false,
      });
    }
  }

  // Sort by verification level then similarity
  merged.sort((a, b) => {
    const levelOrder = { primary: 0, secondary: 1, tertiary: 2 };
    const levelDiff = levelOrder[a.verificationLevel] - levelOrder[b.verificationLevel];
    if (levelDiff !== 0) return levelDiff;
    return b.similarityScore - a.similarityScore;
  });

  return merged;
}

/**
 * Log Deep Search execution for audit
 */
export async function logDeepSearchExecution(options: {
  orgId: string;
  agentId: string;
  query: string;
  results: DeepSearchResult[];
  triggeredBy: string;
}): Promise<void> {
  const supabase = await getSupabase();

  await supabase.from('knowledge_events').insert({
    org_id: options.orgId,
    type: 'DEEP_SEARCH',
    payload: {
      agentId: options.agentId,
      query: options.query,
      resultCount: options.results.length,
      sources: options.results.map((r) => ({
        sourceId: r.sourceId,
        sourceName: r.sourceName,
        verificationLevel: r.verificationLevel,
      })),
      triggeredBy: options.triggeredBy,
    },
  });
}
