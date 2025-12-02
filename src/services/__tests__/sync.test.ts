import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OfflineSyncService } from '../sync';

// Mock useTauri
vi.mock('../../hooks/useTauri', () => ({
  default: () => ({
    invoke: vi.fn(),
    listen: vi.fn(),
    emit: vi.fn(),
    isTauri: true,
  }),
}));

describe('OfflineSyncService', () => {
  let service: OfflineSyncService;

  beforeEach(() => {
    service = OfflineSyncService.getInstance();
    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = OfflineSyncService.getInstance();
      const instance2 = OfflineSyncService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('syncToLocal', () => {
    it('should return offline status when not online', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const result = await service.syncToLocal();

      expect(result.status).toBe('offline');
    });

    it('should return success when sync completes', async () => {
      const result = await service.syncToLocal();

      expect(result.status).toBe('success');
    });

    it('should return error when already syncing', async () => {
      // Start a sync (don't await)
      const promise1 = service.syncToLocal();

      // Try to start another sync
      const result2 = await service.syncToLocal();

      expect(result2.status).toBe('error');
      expect(result2.error).toContain('already in progress');

      // Clean up
      await promise1;
    });
  });

  describe('syncFromLocal', () => {
    it('should return offline status when not online', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const result = await service.syncFromLocal();

      expect(result.status).toBe('offline');
    });

    it('should return error when already syncing', async () => {
      // Start a sync (don't await)
      const promise1 = service.syncFromLocal();

      // Try to start another sync
      const result2 = await service.syncFromLocal();

      expect(result2.status).toBe('error');
      expect(result2.error).toContain('already in progress');

      // Clean up
      await promise1;
    });
  });

  describe('getSyncStatus', () => {
    it('should return sync status', async () => {
      const status = await service.getSyncStatus();

      expect(status).toHaveProperty('last_sync_at');
      expect(status).toHaveProperty('last_sync_status');
    });

    it('should return unknown status on error', async () => {
      // Mock invoke to throw error
      vi.mock('../../hooks/useTauri', () => ({
        default: () => ({
          invoke: vi.fn().mockRejectedValue(new Error('Test error')),
        }),
      }));

      const status = await service.getSyncStatus();

      expect(status.last_sync_status).toBe('unknown');
    });
  });
});
