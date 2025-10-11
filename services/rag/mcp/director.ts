import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../supabase/src/integrations/supabase/types';
import type {
  DirectorAgent,
  DirectorAgentOptions,
  OrchestrationSessionInput,
  OrchestrationSessionRecord,
  OrchestrationTaskInput,
  OrchestrationTaskRecord,
} from './types';
import { initialiseMcpInfrastructure } from './bootstrap';

type SupabaseDb = SupabaseClient<Database>;

type OrchestrationStatus = Database['public']['Enums']['agent_orchestration_status'];
type TaskStatus = Database['public']['Enums']['agent_task_status'];

type SessionRow = Database['public']['Tables']['agent_orchestration_sessions']['Row'];
type TaskRow = Database['public']['Tables']['agent_orchestration_tasks']['Row'];

async function resolveManifestId(
  supabase: SupabaseDb,
  agentKey?: string,
): Promise<string | null> {
  if (!agentKey) return null;
  const { data, error } = await supabase
    .from('agent_manifests')
    .select('id')
    .eq('agent_key', agentKey)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

function mapSessionRow(row: SessionRow): OrchestrationSessionRecord {
  return {
    id: row.id,
    orgId: row.org_id,
    objective: row.objective,
    status: row.status,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTaskRow(row: TaskRow): OrchestrationTaskRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    agentManifestId: row.agent_manifest_id,
    title: row.title,
    status: row.status,
    input: (row.input as Record<string, unknown>) ?? {},
    output: (row.output as Record<string, unknown> | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    dependsOn: row.depends_on ?? [],
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

async function insertTasks(
  supabase: SupabaseDb,
  sessionId: string,
  tasks: OrchestrationTaskInput[],
): Promise<OrchestrationTaskRecord[]> {
  const manifestCache = new Map<string, string | null>();

  const payload = await Promise.all(
    tasks.map(async (task) => {
      let manifestId: string | null = null;
      if (task.agentKey) {
        if (manifestCache.has(task.agentKey)) {
          manifestId = manifestCache.get(task.agentKey) ?? null;
        } else {
          manifestId = await resolveManifestId(supabase, task.agentKey);
          manifestCache.set(task.agentKey, manifestId);
        }
      }

      return {
        session_id: sessionId,
        agent_manifest_id: manifestId,
        title: task.title,
        input: task.input ?? {},
        depends_on: task.dependsOn ?? [],
        metadata: task.metadata ?? {},
      };
    }),
  );

  if (payload.length === 0) return [];

  const { data, error } = await supabase
    .from('agent_orchestration_tasks')
    .insert(payload)
    .select('*');

  if (error) throw error;
  return (data ?? []).map(mapTaskRow);
}

export function createDirectorAgent(options: DirectorAgentOptions): DirectorAgent {
  const { supabase, logError, logInfo } = options;

  return {
    initialiseManifests: () => initialiseMcpInfrastructure(options),

    async createSession(input: OrchestrationSessionInput): Promise<OrchestrationSessionRecord> {
      try {
        const directorManifestId = await resolveManifestId(supabase, input.directorAgentKey ?? 'director.core');
        const safetyManifestId = await resolveManifestId(supabase, input.safetyAgentKey ?? 'safety.core');

        const { data, error } = await supabase
          .from('agent_orchestration_sessions')
          .insert({
            org_id: input.orgId,
            created_by_user_id: input.createdByUserId,
            objective: input.objective,
            metadata: input.metadata ?? {},
            director_agent_id: directorManifestId,
            safety_agent_id: safetyManifestId,
            status: 'PENDING' as OrchestrationStatus,
          })
          .select('*')
          .single();

        if (error || !data) {
          throw error ?? new Error('session_insert_failed');
        }

        const mapped = mapSessionRow(data);
        logInfo?.('mcp.session_created', { sessionId: mapped.id, orgId: mapped.orgId });
        return mapped;
      } catch (error) {
        logError('mcp.session_create_failed', error, { orgId: input.orgId });
        throw error;
      }
    },

    async createTasks(sessionId: string, tasks: OrchestrationTaskInput[]): Promise<OrchestrationTaskRecord[]> {
      try {
        const inserted = await insertTasks(supabase, sessionId, tasks);
        if (inserted.length) {
          logInfo?.('mcp.tasks_created', { sessionId, count: inserted.length });
        }
        return inserted;
      } catch (error) {
        logError('mcp.tasks_create_failed', error, { sessionId, taskCount: tasks.length });
        throw error;
      }
    },

    async updateTaskStatus(params) {
      try {
        const updatePayload: Partial<TaskRow> = {
          status: params.status,
        };
        if (params.metadata !== undefined) {
          updatePayload.metadata = params.metadata;
        }
        if (params.output !== undefined) {
          updatePayload.output = params.output;
        }
        if (params.status === 'IN_PROGRESS') {
          updatePayload.started_at = new Date().toISOString();
        }
        if (['COMPLETED', 'FAILED', 'AWAITING_APPROVAL'].includes(params.status)) {
          updatePayload.completed_at = new Date().toISOString();
        }

        const { data, error } = await supabase
          .from('agent_orchestration_tasks')
          .update(updatePayload)
          .eq('id', params.taskId)
          .select('*')
          .maybeSingle();

        if (error) throw error;
        return data ? mapTaskRow(data) : null;
      } catch (error) {
        logError('mcp.task_update_failed', error, { taskId: params.taskId, status: params.status });
        throw error;
      }
    },

    async getSessionBoard(sessionId: string) {
      try {
        const [{ data: session, error: sessionError }, { data: tasks, error: taskError }] = await Promise.all([
          supabase
            .from('agent_orchestration_sessions')
            .select('*')
            .eq('id', sessionId)
            .maybeSingle(),
          supabase
            .from('agent_orchestration_tasks')
            .select('*')
            .eq('session_id', sessionId),
        ]);

        if (sessionError) throw sessionError;
        if (taskError) throw taskError;

        return {
          session: session ? mapSessionRow(session) : null,
          tasks: (tasks ?? []).map(mapTaskRow),
        };
      } catch (error) {
        logError('mcp.session_fetch_failed', error, { sessionId });
        throw error;
      }
    },
  } satisfies DirectorAgent;
}
