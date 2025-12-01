/**
 * Knowledge Web Sources - Database Helpers
 * 
 * Type-safe helpers for querying the knowledge_web_sources table.
 * Use these functions in your DeepSearch, crawler, and admin components.
 * 
 * @module knowledge-web-sources
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export type AuthorityLevel = 'PRIMARY' | 'SECONDARY' | 'INTERNAL';
export type SourceStatus = 'ACTIVE' | 'INACTIVE';

export interface KnowledgeWebSource {
  id: string;
  name: string;
  url: string;
  domain: string;
  category: string;
  jurisdiction_code: string;
  authority_level: AuthorityLevel;
  status: SourceStatus;
  priority: number;
  tags: string[];
  notes: string | null;
  last_crawled_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SourceFilters {
  category?: string;
  jurisdiction?: string;
  status?: SourceStatus;
  domain?: string;
  authority_level?: AuthorityLevel;
  priority?: number;
  tags?: string[];
}

export interface CreateSourceInput {
  name: string;
  url: string;
  domain: string;
  category: string;
  jurisdiction_code?: string;
  authority_level?: AuthorityLevel;
  priority?: number;
  tags?: string[];
  notes?: string;
}

export interface UpdateSourceInput {
  name?: string;
  url?: string;
  domain?: string;
  category?: string;
  jurisdiction_code?: string;
  authority_level?: AuthorityLevel;
  status?: SourceStatus;
  priority?: number;
  tags?: string[];
  notes?: string;
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Get all active sources, optionally filtered.
 * Returns sources ordered by priority (ascending) and name.
 */
export async function getActiveSources(
  supabase: ReturnType<typeof createClient>,
  filters?: SourceFilters
): Promise<KnowledgeWebSource[]> {
  let query = supabase
    .from('knowledge_web_sources')
    .select('*')
    .eq('status', 'ACTIVE')
    .order('priority', { ascending: true })
    .order('name', { ascending: true });

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }
  if (filters?.jurisdiction) {
    query = query.eq('jurisdiction_code', filters.jurisdiction);
  }
  if (filters?.domain) {
    query = query.eq('domain', filters.domain);
  }
  if (filters?.authority_level) {
    query = query.eq('authority_level', filters.authority_level);
  }
  if (filters?.priority !== undefined) {
    query = query.lte('priority', filters.priority);
  }
  if (filters?.tags && filters.tags.length > 0) {
    query = query.contains('tags', filters.tags);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch sources: ${error.message}`);
  }

  return data || [];
}

/**
 * Get unique domains from active sources.
 * Useful for building crawler whitelists.
 */
export async function getActiveDomains(
  supabase: ReturnType<typeof createClient>,
  filters?: Pick<SourceFilters, 'category' | 'jurisdiction' | 'authority_level'>
): Promise<string[]> {
  const sources = await getActiveSources(supabase, filters);
  const domains = [...new Set(sources.map(s => s.domain))];
  return domains.sort();
}

/**
 * Get primary sources only (official standards bodies).
 * These are the most authoritative sources (authority_level = PRIMARY).
 */
export async function getPrimarySources(
  supabase: ReturnType<typeof createClient>,
  filters?: Omit<SourceFilters, 'authority_level'>
): Promise<KnowledgeWebSource[]> {
  return getActiveSources(supabase, {
    ...filters,
    authority_level: 'PRIMARY'
  });
}

/**
 * Get sources by category (e.g., 'IFRS', 'TAX', 'ISA').
 */
export async function getSourcesByCategory(
  supabase: ReturnType<typeof createClient>,
  category: string,
  activeOnly = true
): Promise<KnowledgeWebSource[]> {
  let query = supabase
    .from('knowledge_web_sources')
    .select('*')
    .eq('category', category)
    .order('priority', { ascending: true });

  if (activeOnly) {
    query = query.eq('status', 'ACTIVE');
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch category sources: ${error.message}`);
  }

  return data || [];
}

/**
 * Get sources by jurisdiction (e.g., 'GLOBAL', 'RW', 'MT').
 */
export async function getSourcesByJurisdiction(
  supabase: ReturnType<typeof createClient>,
  jurisdiction: string,
  activeOnly = true
): Promise<KnowledgeWebSource[]> {
  let query = supabase
    .from('knowledge_web_sources')
    .select('*')
    .eq('jurisdiction_code', jurisdiction)
    .order('priority', { ascending: true });

  if (activeOnly) {
    query = query.eq('status', 'ACTIVE');
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch jurisdiction sources: ${error.message}`);
  }

  return data || [];
}

/**
 * Search sources by tags.
 * Returns sources that contain ANY of the provided tags.
 */
export async function searchByTags(
  supabase: ReturnType<typeof createClient>,
  tags: string[],
  activeOnly = true
): Promise<KnowledgeWebSource[]> {
  let query = supabase
    .from('knowledge_web_sources')
    .select('*')
    .contains('tags', tags)
    .order('priority', { ascending: true });

  if (activeOnly) {
    query = query.eq('status', 'ACTIVE');
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to search by tags: ${error.message}`);
  }

  return data || [];
}

/**
 * Get sources that need crawling.
 * Returns sources that have never been crawled or haven't been crawled in X days.
 */
export async function getSourcesNeedingCrawl(
  supabase: ReturnType<typeof createClient>,
  daysSinceLastCrawl = 7,
  limit = 50
): Promise<KnowledgeWebSource[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastCrawl);

  const { data, error } = await supabase
    .from('knowledge_web_sources')
    .select('*')
    .eq('status', 'ACTIVE')
    .or(`last_crawled_at.is.null,last_crawled_at.lt.${cutoffDate.toISOString()}`)
    .order('priority', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch sources needing crawl: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a single source by ID.
 */
export async function getSourceById(
  supabase: ReturnType<typeof createClient>,
  id: string
): Promise<KnowledgeWebSource | null> {
  const { data, error } = await supabase
    .from('knowledge_web_sources')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch source: ${error.message}`);
  }

  return data;
}

// ============================================================================
// MUTATION HELPERS
// ============================================================================

/**
 * Create a new knowledge web source.
 */
export async function createSource(
  supabase: ReturnType<typeof createClient>,
  input: CreateSourceInput
): Promise<KnowledgeWebSource> {
  const { data, error } = await supabase
    .from('knowledge_web_sources')
    .insert([
      {
        ...input,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create source: ${error.message}`);
  }

  return data;
}

/**
 * Update an existing source.
 */
export async function updateSource(
  supabase: ReturnType<typeof createClient>,
  id: string,
  input: UpdateSourceInput
): Promise<KnowledgeWebSource> {
  const { data, error } = await supabase
    .from('knowledge_web_sources')
    .update({
      ...input,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update source: ${error.message}`);
  }

  return data;
}

/**
 * Toggle source status (ACTIVE <-> INACTIVE).
 */
export async function toggleSourceStatus(
  supabase: ReturnType<typeof createClient>,
  id: string
): Promise<KnowledgeWebSource> {
  const source = await getSourceById(supabase, id);
  if (!source) {
    throw new Error(`Source not found: ${id}`);
  }

  const newStatus: SourceStatus = source.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

  return updateSource(supabase, id, { status: newStatus });
}

/**
 * Mark a source as crawled (update last_crawled_at timestamp).
 */
export async function markSourceCrawled(
  supabase: ReturnType<typeof createClient>,
  id: string
): Promise<KnowledgeWebSource> {
  return updateSource(supabase, id, {
    last_crawled_at: new Date().toISOString()
  });
}

/**
 * Delete a source (soft delete by setting status = INACTIVE is recommended).
 */
export async function deleteSource(
  supabase: ReturnType<typeof createClient>,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('knowledge_web_sources')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete source: ${error.message}`);
  }
}

/**
 * Bulk update sources (e.g., deactivate all from a domain).
 */
export async function bulkUpdateSources(
  supabase: ReturnType<typeof createClient>,
  filters: SourceFilters,
  update: UpdateSourceInput
): Promise<number> {
  let query = supabase
    .from('knowledge_web_sources')
    .update({
      ...update,
      updated_at: new Date().toISOString()
    });

  if (filters.category) {
    query = query.eq('category', filters.category);
  }
  if (filters.jurisdiction) {
    query = query.eq('jurisdiction_code', filters.jurisdiction);
  }
  if (filters.domain) {
    query = query.eq('domain', filters.domain);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query.select();

  if (error) {
    throw new Error(`Failed to bulk update sources: ${error.message}`);
  }

  return data?.length || 0;
}

// ============================================================================
// ANALYTICS HELPERS
// ============================================================================

/**
 * Get source count by category.
 */
export async function getSourceCountByCategory(
  supabase: ReturnType<typeof createClient>,
  activeOnly = true
): Promise<Record<string, number>> {
  let query = supabase
    .from('knowledge_web_sources')
    .select('category');

  if (activeOnly) {
    query = query.eq('status', 'ACTIVE');
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch category counts: ${error.message}`);
  }

  const counts: Record<string, number> = {};
  data?.forEach(row => {
    counts[row.category] = (counts[row.category] || 0) + 1;
  });

  return counts;
}

/**
 * Get source count by jurisdiction.
 */
export async function getSourceCountByJurisdiction(
  supabase: ReturnType<typeof createClient>,
  activeOnly = true
): Promise<Record<string, number>> {
  let query = supabase
    .from('knowledge_web_sources')
    .select('jurisdiction_code');

  if (activeOnly) {
    query = query.eq('status', 'ACTIVE');
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch jurisdiction counts: ${error.message}`);
  }

  const counts: Record<string, number> = {};
  data?.forEach(row => {
    counts[row.jurisdiction_code] = (counts[row.jurisdiction_code] || 0) + 1;
  });

  return counts;
}

/**
 * Get crawl statistics.
 */
export async function getCrawlStats(
  supabase: ReturnType<typeof createClient>
): Promise<{
  total: number;
  active: number;
  neverCrawled: number;
  recentlyCrawled: number; // within 7 days
  stale: number; // not crawled in 30 days
}> {
  const { data, error } = await supabase
    .from('knowledge_web_sources')
    .select('status, last_crawled_at');

  if (error) {
    throw new Error(`Failed to fetch crawl stats: ${error.message}`);
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const active = data?.filter(s => s.status === 'ACTIVE') || [];
  const neverCrawled = active.filter(s => !s.last_crawled_at).length;
  const recentlyCrawled = active.filter(
    s => s.last_crawled_at && new Date(s.last_crawled_at) > sevenDaysAgo
  ).length;
  const stale = active.filter(
    s => s.last_crawled_at && new Date(s.last_crawled_at) < thirtyDaysAgo
  ).length;

  return {
    total: data?.length || 0,
    active: active.length,
    neverCrawled,
    recentlyCrawled,
    stale
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const KnowledgeWebSources = {
  // Query helpers
  getActiveSources,
  getActiveDomains,
  getPrimarySources,
  getSourcesByCategory,
  getSourcesByJurisdiction,
  searchByTags,
  getSourcesNeedingCrawl,
  getSourceById,

  // Mutation helpers
  createSource,
  updateSource,
  toggleSourceStatus,
  markSourceCrawled,
  deleteSource,
  bulkUpdateSources,

  // Analytics helpers
  getSourceCountByCategory,
  getSourceCountByJurisdiction,
  getCrawlStats
};

export default KnowledgeWebSources;
