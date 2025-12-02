/**
 * Offline Sync Service
 * Manages offline data synchronization for desktop app
 */

import { invoke } from '@tauri-apps/api/core';
import { isDesktop } from '../lib/platform';

export interface SyncResult {
  status: 'success' | 'error' | 'offline';
  synced_count?: number;
  pending_count?: number;
  error?: string;
}

export interface SyncChange {
  id: number;
  table_name: string;
  operation: 'insert' | 'update' | 'delete';
  record_id: string;
  data: string;
  created_at: number;
  synced: boolean;
}

export interface QueueChangeRequest {
  table_name: string;
  operation: 'insert' | 'update' | 'delete';
  record_id: string;
  data: string;
}

export class OfflineSyncService {
  private static instance: OfflineSyncService;
  private isSyncing = false;
  private syncInterval: number | null = null;

  private constructor() {
    if (isDesktop()) {
      this.startAutoSync();
    }
  }

  public static getInstance(): OfflineSyncService {
    if (!OfflineSyncService.instance) {
      OfflineSyncService.instance = new OfflineSyncService();
    }
    return OfflineSyncService.instance;
  }

  /**
   * Start automatic background sync
   */
  public startAutoSync(intervalMs: number = 5 * 60 * 1000) {
    if (!isDesktop()) return;

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Initial sync after 2 seconds
    setTimeout(() => this.syncToServer(), 2000);

    // Periodic sync
    this.syncInterval = window.setInterval(() => {
      this.syncToServer();
    }, intervalMs);

    console.log(`✅ Auto-sync started (interval: ${intervalMs / 1000}s)`);
  }

  /**
   * Stop automatic sync
   */
  public stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Queue a change for later sync
   */
  public async queueChange(request: QueueChangeRequest): Promise<number> {
    if (!isDesktop()) {
      throw new Error('Offline sync only available in desktop app');
    }

    try {
      const id = await invoke<number>('queue_change', { request });
      console.log(`Queued: ${request.operation} on ${request.table_name}#${request.record_id}`);
      return id;
    } catch (error) {
      console.error('Failed to queue change:', error);
      throw error;
    }
  }

  /**
   * Get pending changes
   */
  public async getPendingChanges(): Promise<SyncChange[]> {
    if (!isDesktop()) return [];

    try {
      return await invoke<SyncChange[]>('get_pending_changes');
    } catch (error) {
      console.error('Failed to get pending changes:', error);
      return [];
    }
  }

  /**
   * Sync to server
   */
  public async syncToServer(): Promise<SyncResult> {
    if (!isDesktop()) {
      return { status: 'error', error: 'Not in desktop app' };
    }

    if (this.isSyncing) {
      return { status: 'error', error: 'Sync already in progress' };
    }

    if (!navigator.onLine) {
      const pending = await this.getPendingChanges();
      return {
        status: 'offline',
        pending_count: pending.length,
      };
    }

    this.isSyncing = true;

    try {
      const result = await invoke<{
        success: boolean;
        synced_count: number;
        pending_count: number;
        error?: string;
      }>('sync_to_server');

      if (result.success) {
        return {
          status: 'success',
          synced_count: result.synced_count,
          pending_count: result.pending_count,
        };
      } else {
        return {
          status: 'error',
          error: result.error,
          pending_count: result.pending_count,
        };
      }
    } catch (error) {
      console.error('Sync error:', error);
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Legacy method - sync to local
   */
  public async syncToLocal(): Promise<SyncResult> {
    return this.syncToServer();
  }

  /**
   * Legacy method - sync from local
   */
  public async syncFromLocal(): Promise<SyncResult> {
    return this.syncToServer();
  }

  /**
   * Cache entity locally
   */
  public async cacheEntity(table: string, id: string, data: any): Promise<void> {
    if (!isDesktop()) return;

    try {
      await invoke('cache_entity', {
        table,
        id,
        data: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Failed to cache entity:', error);
    }
  }

  /**
   * Get cached entity
   */
  public async getCachedEntity<T>(table: string, id: string): Promise<T | null> {
    if (!isDesktop()) return null;

    try {
      const data = await invoke<string | null>('get_cached_entity', { table, id });
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get cached entity:', error);
      return null;
    }
  }

  /**
   * Cleanup old synced changes
   */
  public async cleanupOldChanges(): Promise<number> {
    if (!isDesktop()) return 0;

    try {
      const deleted = await invoke<number>('cleanup_sync_queue');
      console.log(`🧹 Cleaned up ${deleted} old synced changes`);
      return deleted;
    } catch (error) {
      console.error('Failed to cleanup:', error);
      return 0;
    }
  }

  /**
   * Get sync status
   */
  public async getSyncStatus(): Promise<{ last_sync_at: number; last_sync_status: string }> {
    if (!isDesktop()) {
      return { last_sync_at: 0, last_sync_status: 'web' };
    }

    try {
      return await invoke('get_sync_status');
    } catch (error) {
      console.error('Failed to get sync status:', error);
      return { last_sync_at: 0, last_sync_status: 'unknown' };
    }
  }
}

export const syncService = OfflineSyncService.getInstance();
