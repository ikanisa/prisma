import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildEvidenceManifest, ensureEvidenceDocument } from '../../apps/web/lib/audit/evidence';
import { getSignedUrlTTL } from '@prisma-glow/lib/security/signed-url-policy';

describe('buildEvidenceManifest', () => {
  it('produces a manifest with stable fields', () => {
    const manifest = buildEvidenceManifest({
      moduleCode: 'CTRL1',
      recordRef: 'control-123',
      sampling: {
        planId: 'plan-001',
        size: 25,
        source: 'deterministic-fixture',
      },
      metadata: {
        result: 'PASS',
        exceptions: 0,
      },
    });

    expect(manifest.moduleCode).toBe('CTRL1');
    expect(manifest.recordRef).toBe('control-123');
    expect(manifest.sampling?.planId).toBe('plan-001');
    expect(manifest.metadata?.result).toBe('PASS');
    expect(manifest.generatedAt).toMatch(/T/);
  });
});

describe('ensureEvidenceDocument', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('re-uses an existing document record and returns a signed URL', async () => {
    const lookupMaybeSingle = vi.fn().mockResolvedValue({ data: { id: 'doc-1' }, error: null });
    const eqFileMock = vi.fn().mockReturnValue({ maybeSingle: lookupMaybeSingle });
    const eqOrgMock = vi.fn().mockReturnValue({ eq: eqFileMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqOrgMock });

    const createSignedUrlMock = vi
      .fn()
      .mockResolvedValue({ data: { signedUrl: 'https://signed.example.com/doc-1' }, error: null });

    const fromMock = vi.fn((table: string) => {
      if (table !== 'documents') throw new Error('unexpected table access');
      return { select: selectMock, insert: vi.fn() };
    });

    const client = {
      from: fromMock,
      storage: { from: vi.fn(() => ({ createSignedUrl: createSignedUrlMock })) },
    } as any;

    const result = await ensureEvidenceDocument({
      client,
      orgId: 'org-1',
      engagementId: 'eng-1',
      userId: 'user-1',
      bucket: 'evidence',
      objectPath: 'group/component-1/memo.pdf',
      documentName: 'memo.pdf',
    });

    expect(result).toEqual({ documentId: 'doc-1', signedUrl: 'https://signed.example.com/doc-1' });
    expect(createSignedUrlMock).toHaveBeenCalledWith('group/component-1/memo.pdf', getSignedUrlTTL('evidence'));
  });

  it('creates a new document record when none exists', async () => {
    const lookupMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eqFileMock = vi.fn().mockReturnValue({ maybeSingle: lookupMaybeSingle });
    const eqOrgMock = vi.fn().mockReturnValue({ eq: eqFileMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqOrgMock });

    const insertMaybeSingle = vi.fn().mockResolvedValue({ data: { id: 'doc-2' }, error: null });
    const insertSelectMock = vi.fn().mockReturnValue({ maybeSingle: insertMaybeSingle });
    const insertMock = vi.fn().mockReturnValue({ select: insertSelectMock });

    const createSignedUrlMock = vi
      .fn()
      .mockResolvedValue({ data: { signedUrl: 'https://signed.example.com/doc-2' }, error: null });

    const fromMock = vi.fn((table: string) => {
      if (table !== 'documents') throw new Error('unexpected table access');
      return { select: selectMock, insert: insertMock };
    });

    const storageFromMock = vi.fn(() => ({ createSignedUrl: createSignedUrlMock }));

    const client = {
      from: fromMock,
      storage: { from: storageFromMock },
    } as any;

    const result = await ensureEvidenceDocument({
      client,
      orgId: 'org-1',
      engagementId: 'eng-1',
      userId: 'user-1',
      bucket: 'evidence',
      objectPath: 'group/component-1/memo.pdf',
      documentName: 'memo.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: 'org-1',
        engagement_id: 'eng-1',
        name: 'memo.pdf',
        file_path: 'group/component-1/memo.pdf',
        file_type: 'application/pdf',
        file_size: 1024,
        uploaded_by: 'user-1',
      }),
    );

    expect(result).toEqual({ documentId: 'doc-2', signedUrl: 'https://signed.example.com/doc-2' });
    expect(storageFromMock).toHaveBeenCalledWith('evidence');
  });

  it('throws when a signed URL cannot be generated', async () => {
    const lookupMaybeSingle = vi.fn().mockResolvedValue({ data: { id: 'doc-3' }, error: null });
    const eqFileMock = vi.fn().mockReturnValue({ maybeSingle: lookupMaybeSingle });
    const eqOrgMock = vi.fn().mockReturnValue({ eq: eqFileMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqOrgMock });

    const fromMock = vi.fn((table: string) => {
      if (table !== 'documents') throw new Error('unexpected table access');
      return { select: selectMock, insert: vi.fn() };
    });

    const createSignedUrlMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });

    const client = {
      from: fromMock,
      storage: { from: vi.fn(() => ({ createSignedUrl: createSignedUrlMock })) },
    } as any;

    await expect(
      ensureEvidenceDocument({
        client,
        orgId: 'org-1',
        engagementId: 'eng-1',
        userId: 'user-1',
        bucket: 'evidence',
        objectPath: 'group/component-1/memo.pdf',
        documentName: 'memo.pdf',
      }),
    ).rejects.toThrow('boom');
  });
});

describe('buildEvidenceManifest sanitization', () => {
  it('redacts PII-like metadata entries', () => {
    const manifest = buildEvidenceManifest({
      moduleCode: 'CTRL1',
      recordRef: 'ref-1',
      metadata: {
        reviewerEmail: 'auditor@example.com',
        notes: 'contains SSN 123-45-6789',
      },
    });

    expect(manifest.metadata?.reviewerEmail).toBe('[REDACTED]');
    expect(manifest.metadata?.notes).toBe('[REDACTED]');
  });
});
