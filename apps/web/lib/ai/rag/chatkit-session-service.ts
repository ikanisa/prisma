import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types/supabase.js';

const TABLE = 'chatkit_sessions';

type SupabaseDb = SupabaseClient<Database>;

type ChatkitSessionRow = Database['public']['Tables']['chatkit_sessions']['Row'];
type ChatkitTranscriptRow = Database['public']['Tables']['chatkit_session_transcripts']['Row'];

type CreateParams = {
  supabase: SupabaseDb;
  agentSessionId: string;
  chatkitSessionId: string;
  metadata?: Record<string, unknown>;
};

type UpdateStatusParams = {
  supabase: SupabaseDb;
  chatkitSessionId: string;
  status: 'ACTIVE' | 'CANCELLED' | 'COMPLETED';
  metadata?: Record<string, unknown>;
};

export async function upsertChatkitSession(params: CreateParams): Promise<ChatkitSessionRow> {
  const { supabase, agentSessionId, chatkitSessionId, metadata } = params;
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(
      {
        agent_session_id: agentSessionId,
        chatkit_session_id: chatkitSessionId,
        metadata: metadata ?? {},
        status: 'ACTIVE',
      },
      { onConflict: 'agent_session_id' },
    )
    .select('*')
    .single();

  if (error || !data) {
    throw error ?? new Error('chatkit_session_upsert_failed');
  }
  return data;
}

export async function updateChatkitSessionStatus(params: UpdateStatusParams): Promise<ChatkitSessionRow | null> {
  const { supabase, chatkitSessionId, status, metadata } = params;
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status, ...(metadata ? { metadata } : {}) })
    .eq('chatkit_session_id', chatkitSessionId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data ?? null;
}

export async function fetchChatkitSession(
  supabase: SupabaseDb,
  chatkitSessionId: string,
): Promise<ChatkitSessionRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('chatkit_session_id', chatkitSessionId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function resumeChatkitSession(params: CreateParams): Promise<ChatkitSessionRow> {
  return upsertChatkitSession({ ...params, metadata: { ...(params.metadata ?? {}), resumedAt: new Date().toISOString() } });
}

export async function cancelChatkitSession(params: { supabase: SupabaseDb; chatkitSessionId: string }): Promise<ChatkitSessionRow | null> {
  return updateChatkitSessionStatus({
    supabase: params.supabase,
    chatkitSessionId: params.chatkitSessionId,
    status: 'CANCELLED',
    metadata: { cancelledAt: new Date().toISOString() },
  });
}

export interface ChatkitTranscriptInput {
  supabase: SupabaseDb;
  chatkitSessionId: string;
  role: 'user' | 'assistant';
  transcript: string;
  metadata?: Record<string, unknown>;
}

export async function recordChatkitTranscript(input: ChatkitTranscriptInput): Promise<ChatkitTranscriptRow> {
  const payload = {
    chatkit_session_id: input.chatkitSessionId,
    role: input.role,
    transcript: input.transcript,
    metadata: input.metadata ?? {},
  };

  const { data, error } = await input.supabase
    .from('chatkit_session_transcripts')
    .insert(payload)
    .select('*')
    .single();

  if (error || !data) {
    throw error ?? new Error('chatkit_transcript_insert_failed');
  }
  return data;
}

export async function listChatkitTranscripts(
  supabase: SupabaseDb,
  chatkitSessionId: string,
  limit = 100,
): Promise<ChatkitTranscriptRow[]> {
  const { data, error } = await supabase
    .from('chatkit_session_transcripts')
    .select('*')
    .eq('chatkit_session_id', chatkitSessionId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }
  return data ?? [];
}
