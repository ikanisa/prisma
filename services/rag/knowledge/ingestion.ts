import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  ensureConnectorRecord,
  getDriveConnectorMetadata as fetchConnectorMetadata,
  previewDriveDocuments as listDriveDocuments,
  queueBackfillJobs,
  listChanges,
  downloadDriveFile,
  isSupportedDriveMime,
  isManifestFile,
  parseManifestBuffer,
  getChangeMimeType,
  type DriveSource,
  type DriveChangeQueueRow,
  type ManifestEntry,
} from './drive.js';
import { getSupabaseServiceRoleKey } from '@prisma-glow/lib/secrets';

let cachedSupabase: SupabaseClient | null = null;

async function getSupabase(): Promise<SupabaseClient> {
  if (cachedSupabase) {
    return cachedSupabase;
  }

  const url = process.env.SUPABASE_URL ?? '';
  if (!url) {
    throw new Error('SUPABASE_URL must be configured for ingestion.');
  }

  const serviceRoleKey = await getSupabaseServiceRoleKey();
  cachedSupabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return cachedSupabase;
}

export interface LearningRunRequest {
  orgId: string;
  agentKind: 'AUDIT' | 'FINANCE' | 'TAX';
  mode: 'INITIAL' | 'CONTINUOUS';
  corpusId: string;
  sourceId: string;
  initiatedBy: string;
}

export interface LearningRun {
  id: string;
  status: string;
}

export async function scheduleLearningRun(request: LearningRunRequest): Promise<LearningRun> {
  const supabase = await getSupabase();

  const connectorId = await ensureConnectorRecord(supabase, request.orgId, request.sourceId);
  const queued = await queueBackfillJobs(supabase, request.orgId, connectorId);

  const { data: run, error } = await supabase
    .from('learning_runs')
    .insert({
      org_id: request.orgId,
      agent_kind: request.agentKind,
      mode: request.mode,
      status: 'queued',
      stats: {
        queuedDocuments: queued,
        connectorId,
        initiatedBy: request.initiatedBy,
      },
    })
    .select('id, status')
    .single();

  if (error || !run) {
    throw error ?? new Error('Unable to create learning run');
  }

  await supabase.from('knowledge_events').insert({
    org_id: request.orgId,
    run_id: run.id,
    type: 'INGEST',
    payload: {
      corpusId: request.corpusId,
      sourceId: request.sourceId,
      connectorId,
      queued,
      initiatedBy: request.initiatedBy,
    },
  });

  return run;
}

export async function previewDriveDocuments(source: DriveSource) {
  const supabase = await getSupabase();
  await ensureConnectorRecord(supabase, source.orgId, source.id);
  return listDriveDocuments(source);
}

export async function getDriveConnectorMetadata() {
  return fetchConnectorMetadata();
}

export async function processDriveChanges(options: {
  orgId: string;
  connectorId: string;
  pageToken?: string;
}) {
  const supabase = await getSupabase();

  const { data: connector, error } = await supabase
    .from('gdrive_connectors')
    .select('start_page_token, cursor_page_token')
    .eq('id', options.connectorId)
    .eq('org_id', options.orgId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!connector) {
    throw new Error('connector_not_found');
  }

  const pageToken = options.pageToken ?? connector.cursor_page_token ?? connector.start_page_token;
  if (!pageToken) {
    throw new Error('missing_page_token');
  }

  const result = await listChanges(supabase, options.orgId, options.connectorId, pageToken);

  const updates: Record<string, string | null> = {
    cursor_page_token: result.nextPageToken ?? pageToken,
    last_sync_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (result.newStartToken) {
    updates.start_page_token = result.newStartToken;
    updates.cursor_page_token = result.newStartToken;
  }

  await supabase
    .from('gdrive_connectors')
    .update(updates)
    .eq('id', options.connectorId)
    .eq('org_id', options.orgId);

  return result;
}

export async function getConnectorIdForOrg(orgId: string, sourceId?: string | null): Promise<string | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('gdrive_connectors')
    .select('id')
    .eq('org_id', orgId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data?.id) {
    return data.id;
  }

  if (!sourceId) {
    return null;
  }

  return ensureConnectorRecord(supabase, orgId, sourceId);
}

export async function triggerDriveBackfill(options: {
  orgId: string;
  sourceId?: string | null;
}) {
  const supabase = await getSupabase();
  const connectorId = await ensureConnectorRecord(supabase, options.orgId, options.sourceId ?? null);
  const queued = await queueBackfillJobs(supabase, options.orgId, connectorId);
  return { connectorId, queued };
}

export { downloadDriveFile, isSupportedDriveMime, isManifestFile, parseManifestBuffer, getChangeMimeType };
export type { DriveChangeQueueRow, ManifestEntry };
