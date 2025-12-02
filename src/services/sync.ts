import { useTauri } from '../hooks/useTauri';

export interface SyncResult {
  status: 'success' | 'error' | 'offline';
  synced_count?: number;
  error?: string;
}

export class OfflineSyncService {
  private static instance: OfflineSyncService;
  private isSyncing = false;

  private constructor() {}

  public static getInstance(): OfflineSyncService {
    if (!OfflineSyncService.instance) {
      OfflineSyncService.instance = new OfflineSyncService();
    }
    return OfflineSyncService.instance;
  }

  public async syncToLocal(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { status: 'error', error: 'Sync already in progress' };
    }

    if (!navigator.onLine) {
      return { status: 'offline' };
    }

    this.isSyncing = true;
    try {
      // In a real app, we would probably pass the last sync timestamp
      // to only fetch new/updated records.
      const { invoke } = useTauri();
      await invoke('sync_to_local');
      return { status: 'success' };
    } catch (error) {
      console.error('Sync to local failed:', error);
      return { status: 'error', error: String(error) };
    } finally {
      this.isSyncing = false;
    }
  }

  public async syncFromLocal(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { status: 'error', error: 'Sync already in progress' };
    }

    if (!navigator.onLine) {
      return { status: 'offline' };
    }

    this.isSyncing = true;
    try {
      const { invoke } = useTauri();
      const count = await invoke<number>('sync_from_local');
      return { status: 'success', synced_count: count };
    } catch (error) {
      console.error('Sync from local failed:', error);
      return { status: 'error', error: String(error) };
    } finally {
      this.isSyncing = false;
    }
  }

  public async getSyncStatus(): Promise<{ last_sync_at: number; last_sync_status: string }> {
    try {
      const { invoke } = useTauri();
      return await invoke('get_sync_status');
    } catch (error) {
      console.error('Failed to get sync status:', error);
      return { last_sync_at: 0, last_sync_status: 'unknown' };
    }
  }
}

export const syncService = OfflineSyncService.getInstance();
