import { describe, expect, it, vi } from 'vitest';
import {
  APPROVAL_ACTION_LABELS,
  createAgentActionApproval,
  insertAgentAction,
  normalizeApprovalAction,
  reshapeApprovalRow,
} from '../services/rag/approval-service';

describe('approval-service helpers', () => {
  it('normalizes approval actions and defaults to agent tool', () => {
    expect(normalizeApprovalAction('PERIOD_LOCK')).toBe('PERIOD_LOCK');
    expect(normalizeApprovalAction('unknown-kind')).toBe('AGENT_TOOL');
  });

  it('reshapes approval rows into API-friendly payloads', () => {
    const row = {
      id: 'approval-1',
      kind: 'HANDOFF_SEND',
      status: 'PENDING',
      requested_at: '2025-01-01T12:00:00Z',
      requested_by_user_id: 'user-123',
      context_json: {
        toolKey: 'docs.sign_url',
        description: 'Send final deliverable to client',
        standardsRefs: ['ISA 230'],
        evidenceRefs: [{ id: 'ev-1', title: 'Workpaper extract' }],
      },
    } as Record<string, any>;

    const shaped = reshapeApprovalRow(row, 'demo');

    expect(shaped.id).toBe('approval-1');
    expect(shaped.orgSlug).toBe('demo');
    expect(shaped.action).toBe('HANDOFF_SEND');
    expect(shaped.actionLabel).toBe(APPROVAL_ACTION_LABELS.HANDOFF_SEND);
    expect(shaped.entity).toBe('docs.sign_url');
    expect(shaped.description).toContain('Send final deliverable');
    expect(shaped.standards).toEqual(['ISA 230']);
    expect(shaped.evidence).toHaveLength(1);
    expect(shaped.status).toBe('PENDING');
  });

  it('inserts agent actions via Supabase', async () => {
    const actionSingle = vi.fn().mockResolvedValue({ data: { id: 'action-123' }, error: null });
    const actionSelect = vi.fn().mockReturnValue({ single: actionSingle });
    const insertAction = vi.fn().mockReturnValue({ select: actionSelect });

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'agent_actions') {
          return { insert: insertAction } as any;
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const id = await insertAgentAction({
      supabase: supabase as any,
      orgId: 'org-1',
      sessionId: 'session-1',
      runId: 'run-1',
      userId: 'user-1',
      toolKey: 'rag.search',
      input: { query: 'test' },
      status: 'PENDING',
      sensitive: false,
    });

    expect(id).toBe('action-123');
    expect(supabase.from).toHaveBeenCalledWith('agent_actions');
    expect(insertAction).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: 'org-1',
        session_id: 'session-1',
        tool_key: 'rag.search',
        status: 'PENDING',
      }),
    );
    expect(actionSelect).toHaveBeenCalledWith('id');
  });

  it('creates approval queue entries for sensitive actions', async () => {
    const approvalSingle = vi.fn().mockResolvedValue({ data: { id: 'approval-456' }, error: null });
    const approvalSelect = vi.fn().mockReturnValue({ single: approvalSingle });
    const insertApproval = vi.fn().mockReturnValue({ select: approvalSelect });

    const sessionEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateSession = vi.fn().mockReturnValue({ eq: sessionEq });

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'approval_queue') {
          return { insert: insertApproval } as any;
        }
        if (table === 'agent_sessions') {
          return { update: updateSession } as any;
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const approvalId = await createAgentActionApproval({
      supabase: supabase as any,
      orgId: 'org-1',
      orgSlug: 'demo',
      sessionId: 'session-1',
      runId: 'run-1',
      actionId: 'action-1',
      userId: 'user-1',
      toolKey: 'docs.sign_url',
      input: { documentId: 'doc-1' },
      standards: ['ISA 230'],
    });

    expect(approvalId).toBe('approval-456');
    expect(supabase.from).toHaveBeenCalledWith('approval_queue');
    expect(insertApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: 'org-1',
        kind: 'AGENT_ACTION',
        context_json: expect.objectContaining({ toolKey: 'docs.sign_url', orgSlug: 'demo' }),
      }),
    );
    expect(updateSession).toHaveBeenCalledWith({ status: 'WAITING_APPROVAL' });
    expect(sessionEq).toHaveBeenCalledWith('id', 'session-1');
  });
});
