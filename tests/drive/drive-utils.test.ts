import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  isSupportedDriveMime,
  downloadDriveFile,
  isManifestFile,
  parseManifestBuffer,
  __setDriveClientForTesting,
  type DriveChangeQueueRow,
} from '../../services/rag/knowledge/drive';

const baseChange: DriveChangeQueueRow = {
  id: 'change-1',
  org_id: 'org-123',
  connector_id: 'connector-1',
  file_id: 'file-1',
  file_name: 'Document',
  mime_type: null,
  change_type: 'UPDATE',
  raw_payload: null,
};

describe('Google Drive helpers', () => {
  beforeEach(() => {
    const mockClient = {
      exportGoogleDoc: vi.fn(async () => ({
        content: Buffer.from('exported'),
        mimeType: 'application/pdf',
      })),
      downloadFileBinary: vi.fn(async () => ({
        content: Buffer.from('binary'),
        mimeType: 'application/pdf',
      })),
      listFolder: vi.fn(),
      listChanges: vi.fn(),
    };

    __setDriveClientForTesting({
      client: mockClient as any,
      config: {
        folderId: 'folder-1',
        sharedDriveId: undefined,
        serviceAccount: {
          clientEmail: 'svc@example.com',
          privateKey: '-----BEGIN PRIVATE KEY-----\nFAKE\n-----END PRIVATE KEY-----\n',
        },
      },
    });
  });

  afterEach(() => {
    __setDriveClientForTesting({ client: null, config: null });
  });

  it('recognises supported mime types including Google Docs export types', () => {
    const changeGoogleDoc: DriveChangeQueueRow = {
      ...baseChange,
      mime_type: 'application/vnd.google-apps.document',
    };
    const changePdf: DriveChangeQueueRow = {
      ...baseChange,
      mime_type: 'application/pdf',
    };
    const changeUnknown: DriveChangeQueueRow = {
      ...baseChange,
      mime_type: 'application/octet-stream',
    };

    expect(isSupportedDriveMime(changeGoogleDoc)).toBe(true);
    expect(isSupportedDriveMime(changePdf)).toBe(true);
    expect(isSupportedDriveMime(changeUnknown)).toBe(false);
  });

  it('exports Google Docs using the export endpoint', async () => {
    const change: DriveChangeQueueRow = {
      ...baseChange,
      mime_type: 'application/vnd.google-apps.document',
    };

    const result = await downloadDriveFile(change);
    expect(result.mimeType).toBe('application/pdf');
    expect(result.fileName.endsWith('.pdf')).toBe(true);
  });

  it('downloads binary file types directly', async () => {
    const change: DriveChangeQueueRow = {
      ...baseChange,
      mime_type: 'application/pdf',
    };

    const result = await downloadDriveFile(change);
    expect(result.mimeType).toBe('application/pdf');
    expect(result.fileName.endsWith('.pdf')).toBe(true);
  });

  it('detects manifest files via name and payload', () => {
    const manifestByName: DriveChangeQueueRow = {
      ...baseChange,
      file_name: 'manifest.jsonl',
    };
    expect(isManifestFile(manifestByName)).toBe(true);

    const manifestByPayload: DriveChangeQueueRow = {
      ...baseChange,
      file_name: 'data.json',
      raw_payload: {
        file: {
          name: 'manifests/manifest.csv',
        },
      },
    } as any;
    expect(isManifestFile(manifestByPayload)).toBe(true);

    const nonManifest: DriveChangeQueueRow = {
      ...baseChange,
      file_name: 'case-law.pdf',
    };
    expect(isManifestFile(nonManifest)).toBe(false);
  });

  it('parses JSONL manifests into entries', () => {
    const buffer = Buffer.from('{"file_id":"file-123","allowlisted_domain":"false","juris_code":"MA"}\n');
    const entries = parseManifestBuffer(buffer, 'application/json');
    expect(entries).toHaveLength(1);
    expect(entries[0].fileId).toBe('file-123');
    expect(entries[0].allowlistedDomain).toBe(false);
    expect(entries[0].metadata.juris_code).toBe('MA');
  });

  it('parses CSV manifests into entries', () => {
    const csv = 'file_id,allowlisted_domain,source_type\nfile-1,true,statute\n';
    const entries = parseManifestBuffer(Buffer.from(csv), 'text/csv');
    expect(entries).toHaveLength(1);
    expect(entries[0].fileId).toBe('file-1');
    expect(entries[0].allowlistedDomain).toBe(true);
    expect(entries[0].metadata.source_type).toBe('statute');
  });
});
