import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  OFFLINE_QUEUE_STORAGE_KEY,
  OFFLINE_QUEUE_UPDATED_EVENT,
  getOfflineQueueSnapshot,
  processQueuedActions,
  queueAction,
  resetOfflineQueue,
} from '@/utils/pwa';
import * as apiClient from '@/lib/apiClient';
import { deleteIndexedDb } from '@/lib/storage/indexed-db';

const clearQueue = async () => {
  await resetOfflineQueue();
  localStorage.removeItem(OFFLINE_QUEUE_STORAGE_KEY);
};

describe('offline action queue', () => {
  beforeEach(async () => {
    await clearQueue();
  });

  afterEach(async () => {
    await clearQueue();
    vi.restoreAllMocks();
  });

  it('persists queued actions to localStorage and notifies listeners', async () => {
    const listener = vi.fn();
    window.addEventListener(OFFLINE_QUEUE_UPDATED_EVENT, listener);

    const entry = await queueAction('/v1/tasks', { path: '/v1/tasks', method: 'POST', body: { name: 'Demo' } });

    expect(entry.action).toBe('/v1/tasks');
    const stored = window.localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toHaveLength(1);
    const snapshot = await getOfflineQueueSnapshot();
    expect(snapshot).toHaveLength(1);
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener(OFFLINE_QUEUE_UPDATED_EVENT, listener);
  });

  it('replays queued actions through the API client and clears them on success', async () => {
    const callApiSpy = vi.spyOn(apiClient, 'callApi').mockResolvedValueOnce({ ok: true } as any);

    await queueAction('POST /v1/tasks', { path: '/v1/tasks', method: 'POST', body: { name: 'Queued' } });

    const result = await processQueuedActions();

    expect(result.processed).toBe(1);
    expect(result.remaining).toBe(0);
    expect(callApiSpy).toHaveBeenCalledTimes(1);
    expect(callApiSpy).toHaveBeenCalledWith({
      path: '/v1/tasks',
      method: 'POST',
      body: { name: 'Queued' },
      headers: undefined,
      query: undefined,
    });
    expect(await getOfflineQueueSnapshot()).toHaveLength(0);
  });

  it('retries failed API calls before eventually succeeding', async () => {
    const callApiSpy = vi
      .spyOn(apiClient, 'callApi')
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ ok: true } as any);

    await queueAction('/v1/tasks', { path: '/v1/tasks', method: 'POST', body: { attempt: 1 } });

    const result = await processQueuedActions();
    expect(result.processed).toBe(1);
    expect(result.remaining).toBe(0);
    expect(callApiSpy).toHaveBeenCalledTimes(2);
    expect(callApiSpy).toHaveBeenNthCalledWith(1, {
      path: '/v1/tasks',
      method: 'POST',
      body: { attempt: 1 },
      headers: undefined,
      query: undefined,
    });
    expect(callApiSpy).toHaveBeenNthCalledWith(2, {
      path: '/v1/tasks',
      method: 'POST',
      body: { attempt: 1 },
      headers: undefined,
      query: undefined,
    });
    expect(await getOfflineQueueSnapshot()).toHaveLength(0);
  });

  it('normalises legacy queue entries missing retry metadata before processing', async () => {
    const callApiSpy = vi.spyOn(apiClient, 'callApi').mockResolvedValueOnce({ ok: true } as any);

    await deleteIndexedDb();

    const legacyEntry = {
      id: 'legacy-1',
      action: 'POST /v1/tasks',
      data: { path: '/v1/tasks', method: 'POST', body: { note: 'legacy' } },
      timestamp: Date.now(),
    };

    window.localStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify([legacyEntry]));

    const result = await processQueuedActions();

    expect(result.processed).toBe(1);
    expect(result.remaining).toBe(0);
    expect(callApiSpy).toHaveBeenCalledTimes(1);
    expect(callApiSpy).toHaveBeenCalledWith({
      path: '/v1/tasks',
      method: 'POST',
      body: { note: 'legacy' },
      headers: undefined,
      query: undefined,
    });
    expect(await getOfflineQueueSnapshot()).toHaveLength(0);
  });
});
