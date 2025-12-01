/**
 * Knowledge Console Server Actions
 * Real-time data from Supabase knowledge tables
 */

'use server';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type KnowledgeStats = {
  totalSources: number;
  activeSources: number;
  totalPages: number;
  totalChunks: number;
  embeddedChunks: number;
  lastSync: string | null;
  categories: { category: string; count: number }[];
  jurisdictions: { jurisdiction: string; count: number }[];
};

export type WebSource = {
  id: string;
  name: string;
  base_url: string;
  category: string;
  jurisdiction_code: string;
  status: string;
  page_count: number;
  chunk_count: number;
  last_sync_at: string | null;
  created_at: string;
  tags: string[];
};

export type SourceDetail = WebSource & {
  pages: {
    id: string;
    url: string;
    title: string | null;
    status: string;
    chunk_count: number;
    last_scraped_at: string | null;
  }[];
  sync_history: {
    synced_at: string;
    pages_added: number;
    pages_updated: number;
    status: string;
  }[];
};

export type SearchQuery = {
  query: string;
  category: string | null;
  jurisdiction: string | null;
  timestamp: string;
  result_count: number;
  avg_similarity: number;
};

export async function getKnowledgeStats(): Promise<KnowledgeStats> {
  const [sources, pages, chunks, categories, jurisdictions] = await Promise.all([
    supabase.from('knowledge_web_sources').select('status', { count: 'exact' }),
    supabase.from('knowledge_web_pages').select('id', { count: 'exact' }),
    supabase.from('knowledge_chunks').select('embedding', { count: 'exact' }),
    supabase
      .from('knowledge_chunks')
      .select('category')
      .then((r) => {
        const counts = (r.data || []).reduce((acc, { category }) => {
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        return Object.entries(counts).map(([category, count]) => ({ category, count }));
      }),
    supabase
      .from('knowledge_chunks')
      .select('jurisdiction_code')
      .then((r) => {
        const counts = (r.data || []).reduce((acc, { jurisdiction_code }) => {
          acc[jurisdiction_code] = (acc[jurisdiction_code] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        return Object.entries(counts).map(([jurisdiction, count]) => ({
          jurisdiction,
          count,
        }));
      }),
  ]);

  const activeSources = sources.data?.filter((s) => s.status === 'ACTIVE').length || 0;
  const embeddedChunks = chunks.data?.filter((c) => c.embedding !== null).length || 0;

  const lastSyncResult = await supabase
    .from('knowledge_web_sources')
    .select('last_sync_at')
    .order('last_sync_at', { ascending: false })
    .limit(1)
    .single();

  return {
    totalSources: sources.count || 0,
    activeSources,
    totalPages: pages.count || 0,
    totalChunks: chunks.count || 0,
    embeddedChunks,
    lastSync: lastSyncResult.data?.last_sync_at || null,
    categories: categories.sort((a, b) => b.count - a.count),
    jurisdictions: jurisdictions.sort((a, b) => b.count - a.count),
  };
}

export async function getWebSources(
  page = 1,
  perPage = 20,
  filters?: { category?: string; jurisdiction?: string; status?: string }
): Promise<{ sources: WebSource[]; total: number }> {
  let query = supabase
    .from('knowledge_web_sources')
    .select(
      `
      id,
      name,
      base_url,
      category,
      jurisdiction_code,
      status,
      tags,
      created_at,
      last_sync_at,
      pages:knowledge_web_pages(count),
      chunks:knowledge_chunks(count)
    `,
      { count: 'exact' }
    );

  if (filters?.category) query = query.eq('category', filters.category);
  if (filters?.jurisdiction) query = query.eq('jurisdiction_code', filters.jurisdiction);
  if (filters?.status) query = query.eq('status', filters.status);

  const { data, error, count } = await query
    .order('last_sync_at', { ascending: false, nullsFirst: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (error) throw error;

  const sources: WebSource[] = (data || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    base_url: s.base_url,
    category: s.category,
    jurisdiction_code: s.jurisdiction_code,
    status: s.status,
    tags: s.tags || [],
    created_at: s.created_at,
    last_sync_at: s.last_sync_at,
    page_count: s.pages?.[0]?.count || 0,
    chunk_count: s.chunks?.[0]?.count || 0,
  }));

  return { sources, total: count || 0 };
}

export async function getSourceDetail(sourceId: string): Promise<SourceDetail | null> {
  const { data: source, error } = await supabase
    .from('knowledge_web_sources')
    .select(
      `
      *,
      pages:knowledge_web_pages(
        id,
        url,
        title,
        status,
        last_scraped_at,
        chunks:knowledge_chunks(count)
      )
    `
    )
    .eq('id', sourceId)
    .single();

  if (error || !source) return null;

  const pages = (source.pages || []).map((p: any) => ({
    id: p.id,
    url: p.url,
    title: p.title,
    status: p.status,
    chunk_count: p.chunks?.[0]?.count || 0,
    last_scraped_at: p.last_scraped_at,
  }));

  return {
    id: source.id,
    name: source.name,
    base_url: source.base_url,
    category: source.category,
    jurisdiction_code: source.jurisdiction_code,
    status: source.status,
    tags: source.tags || [],
    created_at: source.created_at,
    last_sync_at: source.last_sync_at,
    page_count: pages.length,
    chunk_count: pages.reduce((sum: number, p: { chunk_count: number }) => sum + p.chunk_count, 0),
    pages,
    sync_history: [], // TODO: implement sync_log table
  };
}

export async function triggerSourceSync(sourceId: string): Promise<{ success: boolean }> {
  // TODO: Trigger background job via Supabase Edge Function or queue
  // For now, just update last_sync_at
  const { error } = await supabase
    .from('knowledge_web_sources')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('id', sourceId);

  return { success: !error };
}

export async function updateSourceStatus(
  sourceId: string,
  status: 'ACTIVE' | 'INACTIVE'
): Promise<{ success: boolean }> {
  const { error } = await supabase
    .from('knowledge_web_sources')
    .update({ status })
    .eq('id', sourceId);

  return { success: !error };
}

export async function testDeepSearch(
  query: string,
  category: string | null,
  jurisdiction: string | null
) {
  // Import deepSearch from src/lib
  const { deepSearch } = await import('../../../../../src/lib/deepSearch');

  const results = await deepSearch({
    query,
    category,
    jurisdictionCode: jurisdiction,
    matchCount: 10,
  });

  return results;
}
