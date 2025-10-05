import { drive, type drive_v3 } from '@googleapis/drive';
import { JWT } from 'google-auth-library';
import { getGoogleDriveSettings } from '../system-config';

export interface ServiceAccountCredentials {
  clientEmail: string;
  privateKey: string;
}

export interface GoogleDriveConfig {
  folderId: string;
  sharedDriveId?: string;
  serviceAccount: ServiceAccountCredentials;
}

export interface DriveFileSummary {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  parents?: string[];
  size?: string;
  md5Checksum?: string;
  driveId?: string;
  version?: string;
}

export class GoogleDriveClient {
  private constructor(
    private readonly api: drive_v3.Drive,
    private readonly config: GoogleDriveConfig,
    private readonly scopes: string[],
  ) {}

  static fromConfig(config: GoogleDriveConfig, scopes: string[]): GoogleDriveClient {
    const requestedScopes = scopes.length ? Array.from(new Set(scopes)) : ['https://www.googleapis.com/auth/drive.readonly'];
    const auth = new JWT({
      email: config.serviceAccount.clientEmail,
      key: config.serviceAccount.privateKey,
      scopes: requestedScopes,
    });

    const api = drive({ version: 'v3', auth });
    return new GoogleDriveClient(api, config, requestedScopes);
  }

  getConfiguration(): GoogleDriveConfig {
    return this.config;
  }

  getAuthorisedScopes(): string[] {
    return this.scopes;
  }

  async getStartPageToken(): Promise<string> {
    const { data } = await this.api.changes.getStartPageToken({
      supportsAllDrives: true,
      driveId: this.config.sharedDriveId,
      teamDriveId: this.config.sharedDriveId,
    });

    if (!data.startPageToken) {
      throw new Error('Google Drive did not return a start page token');
    }
    return data.startPageToken;
  }

  async listFolder(options: { pageToken?: string; pageSize?: number } = {}): Promise<{
    files: DriveFileSummary[];
    nextPageToken?: string;
  }> {
    const folderFilter = `'${this.config.folderId}' in parents`;
    const query = `${folderFilter} and trashed = false`;

    const { data } = await this.api.files.list({
      corpora: this.config.sharedDriveId ? 'drive' : undefined,
      driveId: this.config.sharedDriveId,
      includeItemsFromAllDrives: Boolean(this.config.sharedDriveId),
      supportsAllDrives: true,
      q: query,
      pageSize: options.pageSize ?? 100,
      pageToken: options.pageToken,
      fields:
        'nextPageToken, files(id, name, mimeType, modifiedTime, parents, size, md5Checksum, driveId, version)',
    });

    return {
      files: (data.files ?? []).map((file) => ({
        id: file.id!,
        name: file.name ?? 'unnamed',
        mimeType: file.mimeType ?? 'application/octet-stream',
        modifiedTime: file.modifiedTime ?? undefined,
        parents: file.parents ?? undefined,
        size: file.size ?? undefined,
        md5Checksum: file.md5Checksum ?? undefined,
        driveId: file.driveId ?? undefined,
        version: file.version ?? undefined,
      })),
      nextPageToken: data.nextPageToken ?? undefined,
    };
  }

  async listChanges(pageToken: string, options: { pageSize?: number } = {}): Promise<{
    changes: drive_v3.Schema$Change[];
    nextPageToken?: string;
    newStartPageToken?: string;
  }> {
    const { data } = await this.api.changes.list({
      pageToken,
      pageSize: options.pageSize ?? 100,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      driveId: this.config.sharedDriveId,
      teamDriveId: this.config.sharedDriveId,
      restrictToMyDrive: !this.config.sharedDriveId,
      fields:
        'nextPageToken, newStartPageToken, changes(fileId, time, removed, file(id, name, mimeType, modifiedTime, parents, size, md5Checksum, driveId, version)))',
    });

    return {
      changes: data.changes ?? [],
      nextPageToken: data.nextPageToken ?? undefined,
      newStartPageToken: data.newStartPageToken ?? undefined,
    };
  }

  async downloadFileBinary(fileId: string, mimeType?: string): Promise<{ content: Buffer; mimeType: string }>
  {
    const response = await this.api.files.get(
      {
        fileId,
        alt: 'media',
        supportsAllDrives: true,
      },
      { responseType: 'arraybuffer' }
    );

    const contentType =
      mimeType ?? (Array.isArray(response.headers['content-type']) ? response.headers['content-type'][0] : response.headers['content-type']);

    return {
      content: Buffer.from(response.data as ArrayBuffer),
      mimeType: contentType ?? 'application/octet-stream',
    };
  }

  async exportGoogleDoc(fileId: string, targetMimeType: string): Promise<{ content: Buffer; mimeType: string }>
  {
    const response = await this.api.files.export(
      {
        fileId,
        mimeType: targetMimeType,
      },
      { responseType: 'arraybuffer' }
    );

    const contentType =
      Array.isArray(response.headers['content-type']) ? response.headers['content-type'][0] : response.headers['content-type'];

    return {
      content: Buffer.from(response.data as ArrayBuffer),
      mimeType: contentType ?? targetMimeType,
    };
  }
}

export function parseServiceAccountKey(value: string | undefined): ServiceAccountCredentials {
  if (!value) {
    throw new Error('GDRIVE_SERVICE_ACCOUNT_KEY is required for Google Drive ingestion.');
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error('GDRIVE_SERVICE_ACCOUNT_KEY must be a valid JSON string for the service account.');
  }

  const clientEmail = typeof parsed.client_email === 'string' ? parsed.client_email : undefined;
  const privateKey = typeof parsed.private_key === 'string' ? parsed.private_key : undefined;

  if (!clientEmail || !privateKey) {
    throw new Error('Service account JSON must include client_email and private_key');
  }

  return { clientEmail, privateKey };
}

export function buildConfigFromEnv(): GoogleDriveConfig {
  const folderId = process.env.GDRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error('GDRIVE_FOLDER_ID must be configured for Google Drive ingestion.');
  }

  const sharedDriveId = process.env.GDRIVE_SHARED_DRIVE_ID || undefined;
  const serviceAccountEmail = process.env.GDRIVE_SERVICE_ACCOUNT_EMAIL;
  if (!serviceAccountEmail) {
    throw new Error('GDRIVE_SERVICE_ACCOUNT_EMAIL must be provided.');
  }

  const credentials = parseServiceAccountKey(process.env.GDRIVE_SERVICE_ACCOUNT_KEY);
  if (credentials.clientEmail !== serviceAccountEmail) {
    // Warn but continue – helps catch mismatched secrets.
    console.warn(
      JSON.stringify({
        level: 'warn',
        msg: 'gdrive.service_account_email_mismatch',
        expected: serviceAccountEmail,
        actual: credentials.clientEmail,
      })
    );
  }

  return {
    folderId,
    sharedDriveId,
    serviceAccount: credentials,
  };
}

export async function buildClientFromEnv(): Promise<GoogleDriveClient> {
  const [config, settings] = await Promise.all([Promise.resolve(buildConfigFromEnv()), getGoogleDriveSettings()]);
  return GoogleDriveClient.fromConfig(config, settings.oauthScopes);
}
