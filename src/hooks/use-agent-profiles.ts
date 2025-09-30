import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizations } from '@/hooks/use-organizations';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface AgentProfile {
  id: string;
  org_id: string;
  kind: 'AUDIT' | 'FINANCE' | 'TAX';
  certifications: string[];
  jurisdictions: string[];
  reading_lists: Array<{ title: string; url: string }>;
  style: Record<string, unknown>;
  created_at: string;
}

export function useAgentProfiles() {
  const { currentOrg } = useOrganizations();

  return useQuery({
    queryKey: ['agent_profiles', currentOrg?.id],
    enabled: Boolean(currentOrg?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_profiles')
        .select('id, org_id, kind, certifications, jurisdictions, reading_lists, style, created_at')
        .eq('org_id', currentOrg!.id)
        .order('created_at', { ascending: true });
      if (error) {
        throw new Error(error.message);
      }
      return (data ?? []).map<AgentProfile>((row) => {
        const readingLists = Array.isArray(row.reading_lists)
          ? (row.reading_lists as unknown[]).filter((entry): entry is { title: string; url: string } => {
              if (!entry || typeof entry !== 'object') return false;
              const candidate = entry as Record<string, unknown>;
              return typeof candidate.title === 'string' && typeof candidate.url === 'string';
            })
          : [];
        const style =
          row.style && typeof row.style === 'object' && !Array.isArray(row.style)
            ? (row.style as Record<string, unknown>)
            : {};
        const certifications = Array.isArray(row.certifications)
          ? (row.certifications as unknown[]).filter((value): value is string => typeof value === 'string')
          : [];
        const jurisdictions = Array.isArray(row.jurisdictions)
          ? row.jurisdictions.filter((value): value is string => typeof value === 'string')
          : [];
        const kind = (row.kind?.toUpperCase?.() ?? 'AUDIT') as AgentProfile['kind'];
        return {
          id: row.id,
          org_id: row.org_id,
          kind,
          certifications,
          jurisdictions,
          reading_lists: readingLists,
          style,
          created_at: row.created_at ?? new Date().toISOString(),
        };
      });
    },
  });
}

interface UpsertParams {
  id?: string;
  kind: 'AUDIT' | 'FINANCE' | 'TAX';
  certifications: string[];
  jurisdictions: string[];
  readingLists: Array<{ title: string; url: string }>;
  style: Record<string, unknown>;
}

export function useUpsertAgentProfile() {
  const { currentOrg } = useOrganizations();
  const client = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: UpsertParams) => {
      if (!currentOrg?.id) {
        throw new Error('Organization not selected');
      }
      const payload = {
        id: params.id,
        org_id: currentOrg.id,
        kind: params.kind,
        certifications: params.certifications,
        jurisdictions: params.jurisdictions,
        reading_lists: params.readingLists as Json,
        style: params.style as Json,
      };
      const { data, error } = await supabase.from('agent_profiles').upsert(payload, { onConflict: 'id' }).select();
      if (error) {
        throw new Error(error.message);
      }
      return data?.[0];
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['agent_profiles', currentOrg?.id] });
      toast({ title: 'Agent profile saved', description: 'Updates will take effect on the next assistant response.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Unable to save agent profile',
        description: error?.message ?? 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteAgentProfile() {
  const { currentOrg } = useOrganizations();
  const client = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('agent_profiles').delete().eq('id', id);
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['agent_profiles', currentOrg?.id] });
      toast({ title: 'Agent profile removed' });
    },
    onError: (error: any) => {
      toast({
        title: 'Unable to delete profile',
        description: error?.message ?? 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}
