import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export interface KnowledgeSourceRecord {
  id: string;
  organizationId: string | null;
  name: string;
  description: string;
  sourceType: string;
  syncStatus: string;
  documentCount: number;
  chunkCount: number;
  totalTokens: number;
  lastSyncedAt: string | null;
  createdAt: string;
}

type KnowledgeSourceRow = Database['public']['Tables']['knowledge_sources']['Row'];

const friendlyId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 11);
};

const mapKnowledgeSourceRow = (row: KnowledgeSourceRow): KnowledgeSourceRecord => ({
  id: row?.id ?? friendlyId(),
  organizationId: (row as any)?.organization_id ?? null,
  name: row?.name ?? '',
  description: row?.description ?? '',
  sourceType: row?.source_type ?? 'document',
  syncStatus: row?.sync_status ?? 'pending',
  documentCount: (row as any)?.document_count ?? 0,
  chunkCount: (row as any)?.chunk_count ?? 0,
  totalTokens: (row as any)?.total_tokens ?? 0,
  lastSyncedAt: (row as any)?.last_synced_at ?? null,
  createdAt: row?.created_at ?? new Date().toISOString(),
});

const MOCK_KNOWLEDGE_SOURCES: KnowledgeSourceRecord[] = [
  {
    id: '1',
    organizationId: 'mock-org',
    name: 'Tax Regulations 2024',
    description: 'Comprehensive tax regulations and updates for 2024',
    sourceType: 'document',
    syncStatus: 'synced',
    documentCount: 45,
    chunkCount: 1250,
    totalTokens: 156000,
    lastSyncedAt: '2024-11-28T10:30:00Z',
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    id: '2',
    organizationId: 'mock-org',
    name: 'Company Policies',
    description: 'Internal company policies and procedures',
    sourceType: 'document',
    syncStatus: 'synced',
    documentCount: 23,
    chunkCount: 680,
    totalTokens: 89000,
    lastSyncedAt: '2024-11-27T15:00:00Z',
    createdAt: '2024-02-01T00:00:00Z',
  },
  {
    id: '3',
    organizationId: 'mock-org',
    name: 'Client Database',
    description: 'Client information and history',
    sourceType: 'database',
    syncStatus: 'syncing',
    documentCount: 1200,
    chunkCount: 3400,
    totalTokens: 420000,
    lastSyncedAt: '2024-11-28T12:00:00Z',
    createdAt: '2024-02-10T00:00:00Z',
  },
  {
    id: '4',
    organizationId: 'mock-org',
    name: 'Industry News Feed',
    description: 'Real-time industry news and updates',
    sourceType: 'website',
    syncStatus: 'pending',
    documentCount: 0,
    chunkCount: 0,
    totalTokens: 0,
    lastSyncedAt: null,
    createdAt: '2024-11-28T00:00:00Z',
  },
];

export async function getKnowledgeSources(orgId?: string | null): Promise<KnowledgeSourceRecord[]> {
  if (!isSupabaseConfigured) {
    return MOCK_KNOWLEDGE_SOURCES;
  }

  if (!orgId) {
    throw new Error('Organization is required to fetch knowledge sources.');
  }

  const { data, error } = await supabase
    .from('knowledge_sources')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapKnowledgeSourceRow);
}

export { MOCK_KNOWLEDGE_SOURCES };
