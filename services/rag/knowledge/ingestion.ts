import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { GoogleDrivePlaceholder, type DriveSource } from './drive';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured for ingestion.');
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const drivePlaceholder = new GoogleDrivePlaceholder(supabase);

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

/**
 * Inserts a learning_run row and emits a knowledge_event with placeholder ingestion payload. When
 * Drive integration is ready this will orchestrate the full ingestion job. For now it records the
 * intent so the UI and evaluation flows can be wired up.
 */
export async function scheduleLearningRun(request: LearningRunRequest): Promise<LearningRun> {
  const { data: run, error } = await supabase
    .from('learning_runs')
    .insert({
      org_id: request.orgId,
      agent_kind: request.agentKind,
      mode: request.mode,
      status: 'queued',
      stats: { messages: ['Placeholder run awaiting Google Drive integration'] },
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
      initiatedBy: request.initiatedBy,
      corpusId: request.corpusId,
      sourceId: request.sourceId,
      placeholder: true,
      note: 'Drive integration pending; no documents ingested yet.',
    },
  });

  return run;
}

/**
 * Lists documents available for ingestion via the placeholder Drive connector so the UI can display
 * what would be processed. Replaced later with real Drive change feeds.
 */
export async function previewDriveDocuments(source: DriveSource) {
  return drivePlaceholder.listDocuments(source);
}

export function getDriveConnectorMetadata() {
  return drivePlaceholder.getConnectorMetadata();
}
