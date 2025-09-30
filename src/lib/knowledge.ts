import { authorizedFetch } from '@/lib/api';

export type AgentKind = 'AUDIT' | 'FINANCE' | 'TAX';
export type LearningMode = 'INITIAL' | 'CONTINUOUS';

export interface DriveConnectorMetadata {
  folderId: string;
  sharedDriveId?: string;
  serviceAccountEmail: string;
}

export interface DriveRecentError {
  fileId: string | null;
  error: string | null;
  processedAt: string | null;
}

export interface DriveConnectorStatus {
  config: DriveConnectorMetadata;
  connector: {
    id: string;
    folderId: string | null;
    serviceAccountEmail: string | null;
    sharedDriveId?: string | null;
    startPageToken?: string | null;
    cursorPageToken?: string | null;
    lastSyncAt?: string | null;
    lastBackfillAt?: string | null;
    lastError?: string | null;
    watchChannelId?: string | null;
    watchExpiresAt?: string | null;
    updatedAt?: string | null;
    createdAt?: string | null;
  } | null;
  queue: {
    pending: number;
    failed24h: number;
    recentErrors: DriveRecentError[];
  };
  metadata: {
    total: number;
    blocked: number;
  };
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

export async function fetchDriveConnectorMetadata(orgSlug: string): Promise<DriveConnectorMetadata> {
  const response = await authorizedFetch(
    `/v1/knowledge/drive/metadata?orgSlug=${encodeURIComponent(orgSlug)}`,
  );
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to load connector metadata');
  }
  return payload.connector as DriveConnectorMetadata;
}

export async function fetchDriveConnectorStatus(orgSlug: string): Promise<DriveConnectorStatus> {
  const response = await authorizedFetch(
    `/v1/knowledge/drive/status?orgSlug=${encodeURIComponent(orgSlug)}`,
  );
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to load connector status');
  }
  return payload as DriveConnectorStatus;
}

export interface LearningJob {
  id: string;
  org_id: string;
  kind: string;
  status: string;
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  policy_version_id: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
}

export interface AgentPolicyVersion {
  id: string;
  version: number;
  status: string;
  summary: string | null;
  diff: Record<string, unknown> | null;
  approved_by: string | null;
  approved_at: string | null;
  rolled_back_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LearningMetric {
  id: string;
  window: string;
  metric: string;
  value: number;
  dims: Record<string, unknown> | null;
  computed_at: string;
}

export async function fetchLearningJobs(orgSlug: string, status?: string): Promise<LearningJob[]> {
  const params = new URLSearchParams({ orgSlug });
  if (status) params.set('status', status);
  const response = await authorizedFetch(`/api/learning/jobs?${params.toString()}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to load learning jobs');
  }
  return payload.jobs as LearningJob[];
}

export async function approveLearningJob(orgSlug: string, jobId: string, note?: string) {
  const response = await authorizedFetch('/api/learning/approve', {
    method: 'POST',
    body: JSON.stringify({ orgSlug, jobId, note }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to approve job');
  }
  return payload;
}

export async function fetchLearningPolicies(orgSlug: string): Promise<AgentPolicyVersion[]> {
  const response = await authorizedFetch(`/api/learning/policies?orgSlug=${encodeURIComponent(orgSlug)}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to load policy versions');
  }
  return payload.policies as AgentPolicyVersion[];
}

export async function fetchLearningMetrics(orgSlug: string, metric?: string, limit?: number): Promise<LearningMetric[]> {
  const params = new URLSearchParams({ orgSlug });
  if (metric) params.set('metric', metric);
  if (limit) params.set('limit', String(limit));
  const response = await authorizedFetch(`/api/learning/metrics?${params.toString()}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to load learning metrics');
  }
  return payload.metrics as LearningMetric[];
}

export async function rollbackLearningPolicy(orgSlug: string, policyVersionId: string, note?: string) {
  const response = await authorizedFetch('/api/learning/rollback', {
    method: 'POST',
    body: JSON.stringify({ orgSlug, policyVersionId, note }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to rollback policy');
  }
  return payload;
}

export async function previewKnowledgeSource(params: {
  sourceId: string;
  orgSlug: string;
}): Promise<DrivePreviewResponse> {
  const response = await authorizedFetch(
    `/v1/knowledge/sources/${params.sourceId}/preview?orgSlug=${encodeURIComponent(params.orgSlug)}`,
  );
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

export async function fetchWebSources(orgSlug: string): Promise<WebSourceRow[]> {
  const response = await authorizedFetch(
    `/v1/knowledge/web-sources?orgSlug=${encodeURIComponent(orgSlug)}`,
  );
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
