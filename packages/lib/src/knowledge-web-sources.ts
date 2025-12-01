/**
 * Knowledge Web Sources - Database Helpers
 * 
 * Type-safe helpers for querying the knowledge_web_sources table.
 * Use these functions in your DeepSearch, crawler, and admin components.
 * 
 * @module knowledge-web-sources
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export type AuthorityLevel = 'PRIMARY' | 'SECONDARY' | 'INTERNAL';
export type SourceStatus = 'ACTIVE' | 'INACTIVE';

// Database schema type for Supabase client
export interface Database {
  public: {
    Tables: {
      knowledge_web_sources: {
        Row: KnowledgeWebSource;
        Insert: Omit<KnowledgeWebSource, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<KnowledgeWebSource, 'id' | 'created_at'>> & {
          updated_at?: string;
        };
      };
    };
  };
}

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
  last_crawled_at?: string;
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Get all active sources, optionally filtered.
 * Returns sources ordered by priority (ascending) and name.
 */
export async function getActiveSources(
  supabase: any,
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
  supabase: any,
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
  supabase: any,
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
  supabase: any,
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
  supabase: any,
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
  supabase: any,
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
  supabase: any,
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
  supabase: any,
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
  supabase: any,
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
  supabase: any,
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
  supabase: any,
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
  supabase: any,
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
  supabase: any,
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
  supabase: any,
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
  supabase: any,
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
  data?.forEach((row: any) => {
    counts[row.category] = (counts[row.category] || 0) + 1;
  });

  return counts;
}

/**
 * Get source count by jurisdiction.
 */
export async function getSourceCountByJurisdiction(
  supabase: any,
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
  data?.forEach((row: any) => {
    counts[row.jurisdiction_code] = (counts[row.jurisdiction_code] || 0) + 1;
  });

  return counts;
}

/**
 * Get crawl statistics.
 */
export async function getCrawlStats(
  supabase: any
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

  const active = data?.filter((s: any) => s.status === 'ACTIVE') || [];
  const neverCrawled = active.filter((s: any) => !s.last_crawled_at).length;
  const recentlyCrawled = active.filter(
    (s: any) => s.last_crawled_at && new Date(s.last_crawled_at) > sevenDaysAgo
  ).length;
  const stale = active.filter(
    (s: any) => s.last_crawled_at && new Date(s.last_crawled_at) < thirtyDaysAgo
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
// ENHANCEMENT HELPERS (Added 2025-12-01)
// ============================================================================

/**
 * Validate a URL format and check if it already exists in database.
 * @param supabase - Supabase client
 * @param url - URL to validate
 * @returns Validation result with errors if any
 */
export async function validateSourceUrl(
  supabase: any,
  url: string
): Promise<{ valid: boolean; errors: string[]; duplicate?: boolean }> {
  const errors: string[] = [];
  
  // Check URL format
  try {
    new URL(url);
  } catch {
    errors.push('Invalid URL format');
  }
  
  // Check for duplicate
  const { data } = await supabase
    .from('knowledge_web_sources')
    .select('id')
    .eq('url', url)
    .limit(1);
  
  const duplicate = data && data.length > 0;
  if (duplicate) {
    errors.push('URL already exists in database');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    duplicate
  };
}

/**
 * Export sources to JSON format for backup or transfer.
 * @param supabase - Supabase client
 * @param filters - Optional filters to export specific sources
 * @returns JSON string of sources
 */
export async function exportSourcesToJSON(
  supabase: any,
  filters?: SourceFilters
): Promise<string> {
  const sources = await getActiveSources(supabase, filters);
  return JSON.stringify(sources, null, 2);
}

/**
 * Import sources from JSON array.
 * @param supabase - Supabase client
 * @param sourcesJSON - JSON string with array of sources
 * @returns Count of imported sources
 */
export async function importSourcesFromJSON(
  supabase: any,
  sourcesJSON: string
): Promise<{ imported: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;
  
  try {
    const sources = JSON.parse(sourcesJSON);
    
    if (!Array.isArray(sources)) {
      errors.push('JSON must contain an array of sources');
      return { imported: 0, errors };
    }
    
    for (const source of sources) {
      try {
        await createSource(supabase, source);
        imported++;
      } catch (error: any) {
        errors.push(`Failed to import ${source.name}: ${error.message}`);
      }
    }
  } catch (error: any) {
    errors.push(`JSON parse error: ${error.message}`);
  }
  
  return { imported, errors };
}

/**
 * Check URL reachability (basic health check).
 * Note: This is a simple check. For production, use a proper health check service.
 * @param url - URL to check
 * @returns Whether URL is reachable
 */
export async function checkSourceHealth(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Bulk activate/deactivate sources by filter.
 * @param supabase - Supabase client
 * @param filters - Filters to match sources
 * @param status - New status to set
 * @returns Count of updated sources
 */
export async function bulkUpdateStatus(
  supabase: any,
  filters: SourceFilters,
  status: SourceStatus
): Promise<number> {
  let query = supabase
    .from('knowledge_web_sources')
    .update({ status, updated_at: new Date().toISOString() });
  
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.jurisdiction) query = query.eq('jurisdiction_code', filters.jurisdiction);
  if (filters.domain) query = query.eq('domain', filters.domain);
  if (filters.authority_level) query = query.eq('authority_level', filters.authority_level);
  
  const { data, error } = await query.select('id');
  
  if (error) {
    throw new Error(`Failed to bulk update status: ${error.message}`);
  }
  
  return data?.length || 0;
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
