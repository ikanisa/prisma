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

    const length = await queueAction('upload-large-payload', { payload: largePayload });
    expect(length).toBe(1);

    const snapshot = await getOfflineQueueSnapshot();
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0]?.data).toEqual({ payload: largePayload });
    expect(recordClientError).not.toHaveBeenCalled();
  });

  it('records quota errors and leaves queue unchanged when persistence fails', async () => {
    const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
    const setSpy = vi.spyOn(storage, 'setInIndexedDb').mockRejectedValue(quotaError);

    const length = await queueAction('quota-test', { value: 'example' });
    expect(length).toBe(0);

    expect(logger.error).toHaveBeenCalledWith('pwa.offline_queue_quota_exceeded', quotaError);
    expect(recordClientError).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'pwa:offlineQueueQuotaExceeded' }),
    );

    const snapshot = await getOfflineQueueSnapshot();
    expect(snapshot).toHaveLength(0);

    setSpy.mockRestore();
  });
});
