import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizations } from '@/hooks/use-organizations';
import {
  fetchDriveConnectorMetadata,
  previewKnowledgeSource,
  scheduleLearningRunRequest,
  fetchWebSources,
  scheduleWebHarvest,
  type AgentKind,
  type LearningMode,
  type WebSourceRow,
} from '@/lib/knowledge';
import { useToast } from '@/hooks/use-toast';
import { authorizedFetch } from '@/lib/api';

export function useKnowledgeCorpora() {
  const { currentOrg } = useOrganizations();

  return useQuery({
    queryKey: ['knowledge_corpora', currentOrg?.id],
    enabled: Boolean(currentOrg?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_corpora')
        .select(`
          id,
          org_id,
          name,
          domain,
          jurisdiction,
          retention,
          is_default,
          created_at,
          knowledge_sources:
            knowledge_sources(id, provider, source_uri, last_sync_at, created_at)
        `)
        .eq('org_id', currentOrg!.id)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }
      return data ?? [];
    },
  });
}

export function useLearningRuns() {
  const { currentOrg } = useOrganizations();

  return useQuery({
    queryKey: ['learning_runs', currentOrg?.id],
    enabled: Boolean(currentOrg?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_runs')
        .select('id, org_id, agent_kind, mode, status, stats, started_at, finished_at')
        .eq('org_id', currentOrg!.id)
        .order('started_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }
      return data ?? [];
    },
  });
}

export function useDriveConnectorMetadata() {
  return useQuery({
    queryKey: ['drive_connector_metadata'],
    queryFn: fetchDriveConnectorMetadata,
  });
}

export function usePreviewKnowledgeSource() {
  return useMutation({
    mutationFn: previewKnowledgeSource,
  });
}

export function useWebSources() {
  return useQuery({
    queryKey: ['web_sources'],
    queryFn: fetchWebSources,
  });
}

interface ScheduleParams {
  sourceId: string;
  agentKind: AgentKind;
  mode: LearningMode;
}

export function useScheduleLearningRun() {
  const { currentOrg } = useOrganizations();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const orgSlug = useMemo(() => currentOrg?.slug, [currentOrg?.slug]);

  return useMutation({
    mutationFn: async (params: ScheduleParams) => {
      if (!orgSlug) {
        throw new Error('Organization not selected');
      }
      return scheduleLearningRunRequest({ ...params, orgSlug });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['learning_runs', currentOrg?.id] });
      toast({ title: 'Learning run queued', description: 'The agent will process the selected source shortly.' });
    },
    onError: (error: any) => {
      toast({ title: 'Unable to queue run', description: error.message ?? 'Unknown error', variant: 'destructive' });
    },
  });
}

interface WebHarvestParams {
  webSourceId: string;
  agentKind: AgentKind;
}

export function useScheduleWebHarvest() {
  const { currentOrg } = useOrganizations();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const orgSlug = useMemo(() => currentOrg?.slug, [currentOrg?.slug]);

  return useMutation({
    mutationFn: async (params: WebHarvestParams) => {
      if (!orgSlug) {
        throw new Error('Organization not selected');
      }
      return scheduleWebHarvest({ ...params, orgSlug });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['learning_runs', currentOrg?.id] });
      toast({ title: 'Web harvest queued', description: 'The agent will summarise the web resource soon.' });
    },
    onError: (error: any) => {
      toast({ title: 'Unable to queue web harvest', description: error.message ?? 'Unknown error', variant: 'destructive' });
    },
  });
}

interface CreateCorpusParams {
  name: string;
  domain: string;
  jurisdictions: string[];
  retention?: string | null;
  isDefault?: boolean;
}

export function useCreateCorpus() {
  const { currentOrg } = useOrganizations();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: CreateCorpusParams) => {
      if (!currentOrg?.slug) {
        throw new Error('Organization not selected');
      }

      const response = await authorizedFetch('/v1/knowledge/corpora', {
        method: 'POST',
        body: JSON.stringify({
          orgSlug: currentOrg.slug,
          name: params.name,
          domain: params.domain,
          jurisdictions: params.jurisdictions,
          retention: params.retention ?? null,
          isDefault: params.isDefault ?? false,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to create corpus');
      }
      return payload.corpus;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['knowledge_corpora', currentOrg?.id] });
      toast({ title: 'Corpus created', description: 'The new knowledge corpus is ready for ingestion.' });
    },
    onError: (error: any) => {
      toast({ title: 'Unable to create corpus', description: error.message ?? 'Unknown error', variant: 'destructive' });
    },
  });
}

interface CreateKnowledgeSourceParams {
  corpusId: string;
  provider: string;
  sourceUri: string;
}

export function useCreateKnowledgeSource() {
  const { currentOrg } = useOrganizations();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: CreateKnowledgeSourceParams) => {
      if (!currentOrg?.slug) {
        throw new Error('Organization not selected');
      }

      const response = await authorizedFetch('/v1/knowledge/sources', {
        method: 'POST',
        body: JSON.stringify({
          orgSlug: currentOrg.slug,
          corpusId: params.corpusId,
          provider: params.provider,
          sourceUri: params.sourceUri,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to create knowledge source');
      }
      return payload.source;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['knowledge_corpora', currentOrg?.id] });
      toast({ title: 'Knowledge source linked', description: 'The corpus now references the selected web resource.' });
    },
    onError: (error: any) => {
      toast({ title: 'Unable to create knowledge source', description: error.message ?? 'Unknown error', variant: 'destructive' });
    },
  });
}
