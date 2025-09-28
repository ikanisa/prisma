import type { SupabaseClient } from '@supabase/supabase-js';

export interface DriveSource {
  id: string;
  corpusId: string;
  sourceUri: string;
}

export interface DriveChange {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  downloadUrl: string;
}

export interface PlaceholderDriveConfig {
  /** Optional label so users know which Drive source this represents. */
  label: string;
  /** Folder or shared drive identifier. */
  folderId: string;
  /** Access scope notes shown in the UI. */
  scopeNotes?: string;
}

/**
 * Placeholder registry for Google Drive connectors. We store configuration in knowledge_sources
 * but defer OAuth + API wiring until credentials are available. These helpers provide deterministic
 * mocked responses so the rest of the pipeline can be exercised end-to-end.
 */
export class GoogleDrivePlaceholder {
  constructor(private readonly supabase: SupabaseClient) {}

  /** Returns metadata describing the connection requirements for the UI. */
  getConnectorMetadata(): PlaceholderDriveConfig {
    return {
      label: 'Google Drive (placeholder)',
      folderId: 'drive-folder-id-to-configure',
      scopeNotes: 'Pending OAuth setup. Please supply folder ID once Google Drive access is ready.',
    };
  }

  /**
   * Fetches Drive documents that should be ingested. For now this returns a small mocked payload so
   * the ingestion pipeline can be validated while we wait for real Drive credentials.
   */
  async listDocuments(_source: DriveSource): Promise<DriveChange[]> {
    return [
      {
        id: 'placeholder-doc-1',
        name: 'IFRS_15_Revenue_Overview.pdf',
        mimeType: 'application/pdf',
        modifiedTime: new Date().toISOString(),
        downloadUrl: 'https://example.com/placeholder/IFRS_15_Revenue_Overview.pdf',
      },
    ];
  }

  /**
   * Records that we processed the mocked change log. When real credentials are wired in this method
   * will update knowledge_sources.state with the Drive change token to support incremental syncs.
   */
  async markSyncComplete(source: DriveSource): Promise<void> {
    await this.supabase
      .from('knowledge_sources')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', source.id);
  }
}
