import { authorizedFetch } from '@/lib/api';

export type AgentKind = 'AUDIT' | 'FINANCE' | 'TAX';
export type LearningMode = 'INITIAL' | 'CONTINUOUS';

export interface DriveConnectorMetadata {
  label: string;
  folderId: string;
  scopeNotes?: string;
}

export interface DrivePreviewResponse {
  documents: Array<{
    id: string;
    name: string;
    mimeType: string;
    modifiedTime: string;
    downloadUrl: string;
  }>;
  placeholder?: boolean;
}

export async function fetchDriveConnectorMetadata(): Promise<DriveConnectorMetadata> {
  const response = await authorizedFetch('/v1/knowledge/drive/metadata');
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to load connector metadata');
  }
  return payload.connector as DriveConnectorMetadata;
}

export async function previewKnowledgeSource(sourceId: string): Promise<DrivePreviewResponse> {
  const response = await authorizedFetch(`/v1/knowledge/sources/${sourceId}/preview`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Preview failed');
  }
  return payload as DrivePreviewResponse;
}

export interface ScheduleLearningRunParams {
  orgSlug: string;
  sourceId: string;
  agentKind: AgentKind;
  mode: LearningMode;
}

export async function scheduleLearningRunRequest(params: ScheduleLearningRunParams) {
  const response = await authorizedFetch('/v1/knowledge/runs', {
    method: 'POST',
    body: JSON.stringify({
      orgSlug: params.orgSlug,
      agentKind: params.agentKind,
      mode: params.mode,
      sourceId: params.sourceId,
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to queue learning run');
  }
  return payload.run as { id: string; status: string };
}

export interface WebSourceRow {
  id: string;
  title: string;
  url: string;
  domain: string | null;
  jurisdiction: string[];
  tags: string[];
}

export async function fetchWebSources(): Promise<WebSourceRow[]> {
  const response = await authorizedFetch('/v1/knowledge/web-sources');
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to fetch web sources');
  }
  return payload.sources as WebSourceRow[];
}

export async function scheduleWebHarvest(params: { orgSlug: string; webSourceId: string; agentKind: AgentKind }) {
  const response = await authorizedFetch('/v1/knowledge/web-harvest', {
    method: 'POST',
    body: JSON.stringify({
      orgSlug: params.orgSlug,
      agentKind: params.agentKind,
      webSourceId: params.webSourceId,
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to schedule web harvest');
  }
  return payload.run as { id: string; status: string };
}
