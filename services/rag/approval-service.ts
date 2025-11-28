import type { SupabaseClient } from '@supabase/supabase-js';

export type AgentActionStatus = 'PENDING' | 'SUCCESS' | 'ERROR' | 'BLOCKED';

export type ApprovalAction =
  | 'JOURNAL_POST'
  | 'PERIOD_LOCK'
  | 'HANDOFF_SEND'
  | 'ARCHIVE_BUILD'
  | 'CLIENT_SEND'
  | 'AGENT_TOOL';

export type ApprovalDecision = 'APPROVED' | 'CHANGES_REQUESTED';

export interface ApprovalEvidence {
  id: string;
  title: string;
  documentUrl?: string;
  standard?: string;
  control?: string;
}

export interface ApprovalItem {
  id: string;
  orgSlug: string;
  action: ApprovalAction;
  actionLabel: string;
  entity: string;
  description: string;
  submittedBy: string;
  submittedAt: string;
  standards: string[];
  control: string;
  evidence: ApprovalEvidence[];
  status: 'PENDING' | ApprovalDecision;
  decisionComment?: string;
  decidedBy?: string;
  decidedAt?: string;
  reviewerName?: string;
}

export const APPROVAL_ACTION_LABELS: Record<ApprovalAction, string> = {
  JOURNAL_POST: 'Journal posting approval',
  PERIOD_LOCK: 'Period lock request',
  HANDOFF_SEND: 'Engagement handoff',
  ARCHIVE_BUILD: 'Archive build',
  CLIENT_SEND: 'Client deliverable send',
  AGENT_TOOL: 'Agent tool execution',
};

export function normalizeApprovalAction(kind: string): ApprovalAction {
  const upper = String(kind ?? '').trim().toUpperCase();
  switch (upper) {
    case 'JOURNAL_POST':
    case 'PERIOD_LOCK':
    case 'HANDOFF_SEND':
    case 'ARCHIVE_BUILD':
    case 'CLIENT_SEND':
      return upper as ApprovalAction;
    default:
      return 'AGENT_TOOL';
  }
}

export function reshapeApprovalRow(row: Record<string, any>, orgSlug: string): ApprovalItem {
  const action = normalizeApprovalAction(row.kind ?? 'AGENT_TOOL');
  const context = (row.context_json ?? {}) as Record<string, unknown>;

  const evidenceRefs = Array.isArray(context.evidenceRefs)
    ? (context.evidenceRefs as ApprovalEvidence[])
    : [];

  const standards = Array.isArray(context.standardsRefs)
    ? (context.standardsRefs as string[])
    : [];

  const statusValue = typeof row.status === 'string' ? row.status : 'PENDING';
  const status = (statusValue as ApprovalItem['status']) ?? 'PENDING';

  return {
    id: String(row.id),
    orgSlug,
    action,
    actionLabel: APPROVAL_ACTION_LABELS[action] ?? action,
    entity:
      typeof context.toolKey === 'string'
        ? (context.toolKey as string)
        : typeof context.entity === 'string'
        ? (context.entity as string)
        : action,
    description:
      typeof context.description === 'string'
        ? (context.description as string)
        : `Approval request for ${APPROVAL_ACTION_LABELS[action].toLowerCase()}.`,
    submittedBy:
      typeof row.requested_by_user_id === 'string'
        ? (row.requested_by_user_id as string)
        : 'unknown',
    submittedAt:
      typeof row.requested_at === 'string'
        ? (row.requested_at as string)
        : new Date().toISOString(),
    standards,
    control: typeof context.control === 'string' ? (context.control as string) : 'Manual approval queue',
    evidence: evidenceRefs,
    status,
    decisionComment: typeof row.decision_comment === 'string' ? (row.decision_comment as string) : undefined,
    decidedBy: typeof row.approved_by_user_id === 'string' ? (row.approved_by_user_id as string) : undefined,
    decidedAt: typeof row.decision_at === 'string' ? (row.decision_at as string) : undefined,
    reviewerName: undefined,
  };
}

export async function insertAgentAction({
  supabase,
  orgId,
  sessionId,
  runId,
  userId,
  toolKey,
  input,
  status,
  sensitive,
}: {
  supabase: Pick<SupabaseClient, 'from'>;
  orgId: string;
  sessionId: string;
  runId: string;
  userId: string;
  toolKey: string;
  input: Record<string, unknown>;
  status: AgentActionStatus;
  sensitive: boolean;
}): Promise<string> {
  const { data, error } = await supabase
    .from('agent_actions')
    .insert({
      org_id: orgId,
      session_id: sessionId,
      run_id: runId,
      action_type: 'TOOL',
      tool_key: toolKey,
      input_json: input,
      status,
      requested_by_user_id: userId,
      sensitive,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw error ?? new Error('agent_action_insert_failed');
  }

  return data.id as string;
}

export async function createAgentActionApproval({
  supabase,
  orgId,
  orgSlug,
  sessionId,
  runId,
  actionId,
  userId,
  toolKey,
  input,
  standards,
}: {
  supabase: Pick<SupabaseClient, 'from'>;
  orgId: string;
  orgSlug: string;
  sessionId: string;
  runId: string;
  actionId: string;
  userId: string;
  toolKey: string;
  input: Record<string, unknown>;
  standards?: string[];
}): Promise<string> {
  const context = {
    sessionId,
    runId,
    actionId,
    toolKey,
    input,
    standardsRefs: standards ?? [],
    orgSlug,
  };

  const { data, error } = await supabase
    .from('approval_queue')
    .insert({
      org_id: orgId,
      kind: 'AGENT_ACTION',
      status: 'PENDING',
      requested_by_user_id: userId,
      context_json: context,
      session_id: sessionId,
      action_id: actionId,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw error ?? new Error('approval_queue_insert_failed');
  }

  await supabase
    .from('agent_sessions')
    .update({ status: 'WAITING_APPROVAL' })
    .eq('id', sessionId);

  return data.id as string;
}
