import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/client-events', () => ({
  recordClientError: vi.fn(),
  recordClientEvent: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { logger } from '@/lib/logger';
import { recordClientError } from '@/lib/client-events';
import * as storage from '@/lib/storage/indexed-db';
import {
  OFFLINE_QUEUE_STORAGE_KEY,
  getOfflineQueueSnapshot,
  queueAction,
  resetOfflineQueue,
} from '../pwa';

describe('offline queue IndexedDB storage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await resetOfflineQueue();
  });

  afterEach(async () => {
    await resetOfflineQueue();
  });

  it('persists large payloads without data loss', async () => {
    const largePayload = 'x'.repeat(1024 * 1024 * 3);

    const entry = await queueAction('upload-large-payload', { payload: largePayload });
    expect(entry.action).toBe('upload-large-payload');

    const snapshot = await getOfflineQueueSnapshot();
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0]?.data).toEqual({ payload: largePayload });
    expect(recordClientError).not.toHaveBeenCalled();
  });

  it('records quota errors and leaves queue unchanged when persistence fails', async () => {
    const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
    const setSpy = vi.spyOn(storage, 'setInIndexedDb').mockRejectedValue(quotaError);

    await expect(queueAction('quota-test', { value: 'example' })).rejects.toBe(quotaError);

    expect(logger.error).toHaveBeenCalledWith('pwa.offline_queue_quota_exceeded', quotaError);
    expect(recordClientError).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'pwa:offlineQueueQuotaExceeded' }),
    );

    const snapshot = await getOfflineQueueSnapshot();
    expect(snapshot).toHaveLength(0);

    setSpy.mockRestore();
  });

  it('clears local storage mirrors when IndexedDB reset fails', async () => {
    await queueAction('persist-local', { value: 'cached' });
    expect(window.localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY)).not.toBeNull();

    const resetError = new Error('reset-failed');
    const setSpy = vi.spyOn(storage, 'setInIndexedDb').mockRejectedValue(resetError);

    await expect(resetOfflineQueue()).resolves.toBeUndefined();

    expect(window.localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY)).toBeNull();
    expect(await getOfflineQueueSnapshot()).toEqual([]);

    setSpy.mockRestore();
  });
});
