import { useQuery } from '@tanstack/react-query';
import { getKnowledgeSources, type KnowledgeSourceRecord } from '@/services/knowledge-sources.service';
import { isSupabaseConfigured } from '@/integrations/supabase/client';

export function useKnowledgeSources(orgId?: string | null) {
  const enabled = isSupabaseConfigured ? Boolean(orgId) : true;

  return useQuery<KnowledgeSourceRecord[]>({
    queryKey: ['knowledge-sources', orgId ?? 'all'],
    queryFn: () => getKnowledgeSources(orgId),
    enabled,
  });
}

export type { KnowledgeSourceRecord } from '@/services/knowledge-sources.service';
