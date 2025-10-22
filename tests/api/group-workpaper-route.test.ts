import { beforeEach, describe, expect, it, vi } from 'vitest';

const getServiceSupabaseClientMock = vi.fn();
const ensureEvidenceDocumentMock = vi.fn();
const upsertAuditModuleRecordMock = vi.fn();
const logAuditActivityMock = vi.fn();

const ORG_ID = '50000000-0000-0000-0000-000000000001';
const ENGAGEMENT_ID = '50000000-0000-0000-0000-000000000002';
const COMPONENT_ID = '50000000-0000-0000-0000-000000000003';
const INSTRUCTION_ID = '50000000-0000-0000-0000-000000000004';
const USER_ID = '50000000-0000-0000-0000-000000000005';

vi.mock('@/lib/supabase-server', () => ({
  getServiceSupabaseClient: () => getServiceSupabaseClientMock(),
}));

vi.mock('@/lib/audit/evidence', () => ({
  ensureEvidenceDocument: (...args: unknown[]) => ensureEvidenceDocumentMock(...args),
}));

vi.mock('@/lib/audit/module-records', () => ({
  upsertAuditModuleRecord: (...args: unknown[]) => upsertAuditModuleRecordMock(...args),
}));

vi.mock('@/lib/audit/activity-log', () => ({
  logAuditActivity: (...args: unknown[]) => logAuditActivityMock(...args),
}));

import { POST } from '../../apps/web/app/api/group/workpaper/route';

function createSupabase(rateAllowed = true) {
  const insertedRow = {
    id: '60000000-0000-0000-0000-000000000006',
    org_id: ORG_ID,
    engagement_id: ENGAGEMENT_ID,
    component_id: COMPONENT_ID,
    instruction_id: INSTRUCTION_ID,
    document_id: '60000000-0000-0000-0000-000000000007',
    title: 'Trial balance tie-out',
    uploaded_by_user_id: USER_ID,
    notes: 'Signed copy attached.',
  };

  const insertMaybeSingle = vi.fn().mockResolvedValue({ data: insertedRow, error: null });
  const insertSelect = vi.fn(() => ({ maybeSingle: insertMaybeSingle }));
  const insertMock = vi.fn(() => ({ select: insertSelect }));

  const fromMock = vi.fn((table: string) => {
    if (table === 'group_workpapers') {
      return { insert: insertMock };
    }
    throw new Error(`Unexpected table ${table}`);
  });

  const rpc = vi.fn().mockResolvedValue({ data: [{ allowed: rateAllowed, request_count: 1 }], error: null });
  const supabase = { from: fromMock, rpc } as Record<string, unknown>;

  return {
    supabase,
    spies: { insertMock, insertSelect, insertMaybeSingle, rpc },
    insertedRow,
  };
}

describe('POST /api/group/workpaper', () => {
  beforeEach(() => {
    getServiceSupabaseClientMock.mockReset();
    ensureEvidenceDocumentMock.mockReset();
    upsertAuditModuleRecordMock.mockReset();
    logAuditActivityMock.mockReset();
  });

  it('registers a workpaper, updates module register, and returns signed URL', async () => {
    const { supabase, insertedRow } = createSupabase();
    const evidenceResult = { documentId: insertedRow.document_id, signedUrl: 'https://signed.example.com/workpaper' };
    ensureEvidenceDocumentMock.mockResolvedValue(evidenceResult);
    getServiceSupabaseClientMock.mockReturnValue(supabase);

    const response = await POST(
      new Request('https://example.com/api/group/workpaper', {
        method: 'POST',
        body: JSON.stringify({
          orgId: ORG_ID,
          engagementId: ENGAGEMENT_ID,
          componentId: COMPONENT_ID,
          instructionId: INSTRUCTION_ID,
          documentBucket: 'group-workpapers',
          documentPath: 'group/component/workpapers/memo.pdf',
          documentName: 'memo.pdf',
          note: 'Signed copy attached.',
          userId: USER_ID,
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ workpaper: insertedRow, signedUrl: evidenceResult.signedUrl });

    expect(ensureEvidenceDocumentMock).toHaveBeenCalledWith({
      client: supabase,
      orgId: ORG_ID,
      engagementId: ENGAGEMENT_ID,
      userId: USER_ID,
      bucket: 'group-workpapers',
      objectPath: 'group/component/workpapers/memo.pdf',
      documentName: 'memo.pdf',
    });

    expect(upsertAuditModuleRecordMock).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        orgId: ORG_ID,
        engagementId: ENGAGEMENT_ID,
        moduleCode: 'GRP1',
        recordRef: COMPONENT_ID,
        metadata: {
          lastWorkpaperId: insertedRow.id,
          documentId: insertedRow.document_id,
          signedUrl: evidenceResult.signedUrl,
          note: 'Signed copy attached.',
        },
        updatedByUserId: USER_ID,
      }),
    );

    expect(logAuditActivityMock).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        orgId: ORG_ID,
        userId: USER_ID,
        action: 'GRP_WORKPAPER_RECEIVED',
        entityType: 'AUDIT_GROUP',
        entityId: insertedRow.id,
        metadata: expect.objectContaining({
          componentId: COMPONENT_ID,
          instructionId: INSTRUCTION_ID,
          documentId: insertedRow.document_id,
          note: 'Signed copy attached.',
        }),
      }),
    );
  });

  it('returns 429 when rate limit exceeded', async () => {
    const { supabase } = createSupabase(false);
    ensureEvidenceDocumentMock.mockResolvedValue({ documentId: 'doc', signedUrl: 'url' });
    getServiceSupabaseClientMock.mockReturnValue(supabase);

    const response = await POST(
      new Request('https://example.com/api/group/workpaper', {
        method: 'POST',
        body: JSON.stringify({
          orgId: ORG_ID,
          engagementId: ENGAGEMENT_ID,
          componentId: COMPONENT_ID,
          documentBucket: 'group-workpapers',
          documentPath: 'path',
          documentName: 'memo.pdf',
          userId: USER_ID,
        }),
      }),
    );

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body).toEqual({ error: 'rate_limit_exceeded', retryAfterSeconds: 60 });
  });
});
