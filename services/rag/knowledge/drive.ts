import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildClientFromEnv,
  type DriveFileSummary,
  type GoogleDriveClient,
  type GoogleDriveConfig,
} from './google-drive-client';

const GOOGLE_EXPORT_TARGETS: Record<string, { mimeType: string; extension: string }> = {
  'application/vnd.google-apps.document': { mimeType: 'application/pdf', extension: '.pdf' },
  'application/vnd.google-apps.presentation': { mimeType: 'application/pdf', extension: '.pdf' },
  'application/vnd.google-apps.spreadsheet': { mimeType: 'text/csv', extension: '.csv' },
};

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'text/html': '.html',
  'application/json': '.json',
  'application/zip': '.zip',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
};

export type DriveChangeType = 'ADD' | 'UPDATE' | 'DELETE';

const MANIFEST_FILENAMES = new Set([
  'manifest.jsonl',
  'manifest.json',
  'manifest.csv',
]);

const MANIFEST_DIRECTORY_HINTS = ['manifest', 'manifests'];

const TRUE_LITERALS = new Set(['true', '1', 'yes', 'y']);
const FALSE_LITERALS = new Set(['false', '0', 'no', 'n']);

export interface ManifestEntry {
  fileId: string;
  metadata: Record<string, unknown>;
  allowlistedDomain: boolean;
}

export interface DriveChangeQueueRow {
  id: string;
  org_id: string;
  connector_id: string;
  file_id: string;
  file_name: string | null;
  mime_type: string | null;
  change_type: DriveChangeType;
  raw_payload: Record<string, unknown> | null;
}

export interface DriveSource {
  id: string;
  corpusId: string;
  sourceUri: string;
  orgId: string;
}

export interface DriveConnectorMetadata {
  folderId: string;
  sharedDriveId?: string;
  serviceAccountEmail: string;
}

export interface DriveFilePreview extends DriveFileSummary {}

let cachedClient: GoogleDriveClient | null = null;
let cachedConfig: GoogleDriveConfig | null = null;

export function __setDriveClientForTesting(options: {
  client: GoogleDriveClient | null;
  config?: GoogleDriveConfig | null;
}) {
  cachedClient = options.client;
  cachedConfig = options.config ?? null;
}

function getClient(): GoogleDriveClient {
  if (!cachedClient) {
    cachedClient = buildClientFromEnv();
    cachedConfig = cachedClient.getConfiguration();
  }
  return cachedClient;
}

function getConfig(): GoogleDriveConfig {
  if (!cachedConfig) {
    getClient();
  }
  return cachedConfig!;
}

export async function ensureConnectorRecord(
  supabase: SupabaseClient,
  orgId: string,
  knowledgeSourceId?: string | null,
): Promise<string> {
  const config = getConfig();
  const existing = await supabase
    .from('gdrive_connectors')
    .select('id')
    .eq('org_id', orgId)
    .eq('folder_id', config.folderId)
    .maybeSingle();

  if (existing.error) {
    throw existing.error;
  }

  if (existing.data?.id) {
    return existing.data.id;
  }

  const inserted = await supabase
    .from('gdrive_connectors')
    .insert({
      org_id: orgId,
      knowledge_source_id: knowledgeSourceId ?? null,
      service_account_email: config.serviceAccount.clientEmail,
      shared_drive_id: config.sharedDriveId ?? null,
      folder_id: config.folderId,
      start_page_token: null,
    })
    .select('id')
    .single();

  if (inserted.error || !inserted.data) {
    throw inserted.error ?? new Error('Unable to create Google Drive connector record');
  }

  return inserted.data.id;
}

export function getDriveConnectorMetadata(): DriveConnectorMetadata {
  const config = getConfig();
  return {
    folderId: config.folderId,
    sharedDriveId: config.sharedDriveId,
    serviceAccountEmail: config.serviceAccount.clientEmail,
  };
}

export async function previewDriveDocuments(_source: DriveSource): Promise<DriveFilePreview[]> {
  const client = getClient();
  const files: DriveFilePreview[] = [];
  let pageToken: string | undefined;

  do {
    const page = await client.listFolder({ pageToken });
    files.push(
      ...page.files.map((file) => ({
        ...file,
      })),
    );
    pageToken = page.nextPageToken;
  } while (pageToken);

  return files;
}

export async function queueBackfillJobs(
  supabase: SupabaseClient,
  orgId: string,
  connectorId: string,
): Promise<number> {
  const client = getClient();
  let queued = 0;
  let pageToken: string | undefined;

  do {
    const page = await client.listFolder({ pageToken });
    if (!page.files.length) {
      pageToken = page.nextPageToken;
      continue;
    }

    const payload = page.files.map((file) => ({
      org_id: orgId,
      connector_id: connectorId,
      file_id: file.id,
      file_name: file.name,
      mime_type: file.mimeType,
      change_type: 'ADD' as const,
      raw_payload: {
        modifiedTime: file.modifiedTime,
        parents: file.parents,
        md5Checksum: file.md5Checksum,
        size: file.size,
        version: file.version,
      },
    }));

    const { error } = await supabase.from('gdrive_change_queue').insert(payload);
    if (error) {
      throw error;
    }

    queued += payload.length;
    pageToken = page.nextPageToken;
  } while (pageToken);

  const startToken = await client.getStartPageToken().catch((error) => {
    console.warn(
      JSON.stringify({
        level: 'warn',
        msg: 'gdrive.start_page_token_failed',
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return null;
  });

  if (startToken) {
    await supabase
      .from('gdrive_connectors')
      .update({
        start_page_token: startToken,
        last_backfill_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectorId);
  } else {
    await supabase
      .from('gdrive_connectors')
      .update({
        last_backfill_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectorId);
  }

  return queued;
}

export async function listChanges(
  supabase: SupabaseClient,
  orgId: string,
  connectorId: string,
  pageToken: string,
): Promise<{ queued: number; nextPageToken?: string; newStartToken?: string }> {
  const client = getClient();
  const result = await client.listChanges(pageToken);

  if (!result.changes.length) {
    return {
      queued: 0,
      nextPageToken: result.nextPageToken,
      newStartToken: result.newStartPageToken,
    };
  }

  const rows = result.changes.map((change) => ({
    org_id: orgId,
    connector_id: connectorId,
    file_id: change.fileId ?? 'unknown',
    file_name: change.file?.name ?? null,
    mime_type: change.file?.mimeType ?? null,
    change_type: (change.removed ? 'DELETE' : 'UPDATE') as 'DELETE' | 'UPDATE',
    raw_payload: change,
  }));

  const { error } = await supabase.from('gdrive_change_queue').insert(rows);
  if (error) {
    throw error;
  }

  return {
    queued: rows.length,
    nextPageToken: result.nextPageToken,
    newStartToken: result.newStartPageToken,
  };
}

function resolveChangeMimeType(change: DriveChangeQueueRow): string | null {
  if (change.mime_type) {
    return change.mime_type;
  }

  const raw = change.raw_payload;
  if (raw && typeof raw === 'object') {
    const file = (raw as Record<string, any>).file;
    if (file && typeof file === 'object' && typeof file.mimeType === 'string') {
      return file.mimeType;
    }
  }

  return null;
}

export function isSupportedDriveMime(change: DriveChangeQueueRow): boolean {
  const mimeType = resolveChangeMimeType(change);
  if (!mimeType) return false;
  if (mimeType in GOOGLE_EXPORT_TARGETS) return true;
  return mimeType in ALLOWED_MIME_TYPES;
}

function matchesManifestName(name: string | null): boolean {
  if (!name) return false;
  const lower = name.trim().toLowerCase();
  if (MANIFEST_FILENAMES.has(lower)) return true;
  for (const hint of MANIFEST_DIRECTORY_HINTS) {
    if (lower.includes(`${hint}/manifest.`) || lower.startsWith(`${hint}-manifest`)) {
      return true;
    }
  }
  return false;
}

export function isManifestFile(change: DriveChangeQueueRow): boolean {
  if (matchesManifestName(change.file_name ?? null)) {
    return true;
  }
  const raw = change.raw_payload;
  if (!raw || typeof raw !== 'object') {
    return false;
  }
  const file = (raw as Record<string, any>).file;
  if (file && typeof file === 'object') {
    const fileName = typeof file.name === 'string' ? file.name : null;
    if (matchesManifestName(fileName)) {
      return true;
    }
  }
  return false;
}

function parseBoolean(value: unknown, defaultValue: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    if (TRUE_LITERALS.has(lower)) return true;
    if (FALSE_LITERALS.has(lower)) return false;
  }
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return defaultValue;
}

function normaliseManifestEntry(entry: Record<string, unknown>): ManifestEntry | null {
  const fileIdRaw = entry.file_id ?? entry.fileId ?? entry.id;
  if (typeof fileIdRaw !== 'string' || fileIdRaw.trim().length === 0) {
    return null;
  }

  const allowlisted = parseBoolean(entry.allowlisted_domain, true);
  const cleaned: Record<string, unknown> = { ...entry };
  cleaned.file_id = fileIdRaw;
  cleaned.allowlisted_domain = allowlisted;

  return {
    fileId: fileIdRaw,
    metadata: cleaned,
    allowlistedDomain: allowlisted,
  };
}

export function parseManifestBuffer(buffer: Buffer, mimeType: string): ManifestEntry[] {
  const text = buffer.toString('utf-8');
  const entries: ManifestEntry[] = [];
  const trimmedMime = mimeType.toLowerCase();

  if (trimmedMime.includes('json')) {
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const value = line.trim();
      if (!value || value.startsWith('#')) continue;
      try {
        const payload = JSON.parse(value) as Record<string, unknown>;
        const normalised = normaliseManifestEntry(payload);
        if (normalised) {
          entries.push(normalised);
        }
      } catch (error) {
        console.warn(
          JSON.stringify({
            level: 'warn',
            msg: 'gdrive.manifest_parse_error',
            error: error instanceof Error ? error.message : String(error),
            line: value,
          }),
        );
      }
    }
    return entries;
  }

  if (trimmedMime.includes('csv')) {
    const rows = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (!rows.length) {
      return entries;
    }
    const header = rows[0].split(',').map((col) => col.trim());
    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i];
      if (row.startsWith('#')) continue;
      const values = row.split(',');
      const record: Record<string, unknown> = {};
      for (let j = 0; j < header.length; j += 1) {
        const key = header[j];
        if (!key) continue;
        record[key] = values[j]?.trim();
      }
      const normalised = normaliseManifestEntry(record);
      if (normalised) {
        entries.push(normalised);
      }
    }
    return entries;
  }

  console.warn(
    JSON.stringify({
      level: 'warn',
      msg: 'gdrive.manifest_unknown_mime',
      mimeType,
    }),
  );
  return entries;
}

export async function downloadDriveFile(change: DriveChangeQueueRow) {
  const client = getClient();
  const mimeType = resolveChangeMimeType(change);
  if (!mimeType) {
    throw new Error('unknown_mime_type');
  }

  const exportTarget = GOOGLE_EXPORT_TARGETS[mimeType];
  if (exportTarget) {
    const exported = await client.exportGoogleDoc(change.file_id, exportTarget.mimeType);
    return {
      buffer: exported.content,
      mimeType: exportTarget.mimeType,
      extension: exportTarget.extension,
      fileName: deriveFileName(change.file_name, exportTarget.extension, change.file_id),
    };
  }

  const allowedExtension = ALLOWED_MIME_TYPES[mimeType];
  if (!allowedExtension) {
    throw new Error('unsupported_mime_type');
  }

  const binary = await client.downloadFileBinary(change.file_id, mimeType);
  return {
    buffer: binary.content,
    mimeType: binary.mimeType || mimeType,
    extension: allowedExtension,
    fileName: deriveFileName(change.file_name, allowedExtension, change.file_id),
  };
}

function deriveFileName(name: string | null, extension: string, fallbackId: string): string {
  if (name) {
    const trimmed = name.trim();
    if (trimmed.length > 0) {
      const lower = trimmed.toLowerCase();
      if (lower.endsWith(extension.toLowerCase())) {
        return trimmed;
      }
      return `${trimmed}${extension}`;
    }
  }
  return `${fallbackId}${extension}`;
}

export function getChangeMimeType(change: DriveChangeQueueRow): string | null {
  return resolveChangeMimeType(change);
}
