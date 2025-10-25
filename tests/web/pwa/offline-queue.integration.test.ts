import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  OFFLINE_QUEUE_STORAGE_KEY,
  OFFLINE_QUEUE_UPDATED_EVENT,
  getOfflineQueueSnapshot,
  processQueuedActions,
  queueAction,
} from '@/utils/pwa';
import * as apiClient from '@/lib/apiClient';

const clearQueue = () => {
  localStorage.removeItem(OFFLINE_QUEUE_STORAGE_KEY);
};

describe('offline action queue', () => {
  beforeEach(() => {
    clearQueue();
  });

  afterEach(() => {
    clearQueue();
    vi.restoreAllMocks();
  });

  it('persists queued actions to localStorage and notifies listeners', () => {
    const listener = vi.fn();
    window.addEventListener(OFFLINE_QUEUE_UPDATED_EVENT, listener);

    const length = queueAction('/v1/tasks', { path: '/v1/tasks', method: 'POST', body: { name: 'Demo' } });

    expect(length).toBe(1);
    const stored = window.localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toHaveLength(1);
    expect(getOfflineQueueSnapshot()).toHaveLength(1);
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener(OFFLINE_QUEUE_UPDATED_EVENT, listener);
  });

  it('replays queued actions through the API client and clears them on success', async () => {
    const callApiSpy = vi.spyOn(apiClient, 'callApi').mockResolvedValueOnce({ ok: true } as any);

    queueAction('POST /v1/tasks', { path: '/v1/tasks', method: 'POST', body: { name: 'Queued' } });

    const processed = await processQueuedActions();

    expect(processed).toBe(1);
    expect(callApiSpy).toHaveBeenCalledTimes(1);
    expect(callApiSpy).toHaveBeenCalledWith({
      path: '/v1/tasks',
      method: 'POST',
      body: { name: 'Queued' },
      headers: undefined,
      query: undefined,
    });
    expect(getOfflineQueueSnapshot()).toHaveLength(0);
  });

  it('retries failed API calls before eventually succeeding', async () => {
    const callApiSpy = vi
      .spyOn(apiClient, 'callApi')
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ ok: true } as any);

    queueAction('/v1/tasks', { path: '/v1/tasks', method: 'POST', body: { attempt: 1 } });

    const processed = await processQueuedActions();
    expect(processed).toBe(1);
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
    expect(getOfflineQueueSnapshot()).toHaveLength(0);
  });

  it('normalises legacy queue entries missing retry metadata before processing', async () => {
    const callApiSpy = vi.spyOn(apiClient, 'callApi').mockResolvedValueOnce({ ok: true } as any);

    const legacyEntry = {
      id: 'legacy-1',
      action: 'POST /v1/tasks',
      data: { path: '/v1/tasks', method: 'POST', body: { note: 'legacy' } },
      timestamp: Date.now(),
    };

    window.localStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify([legacyEntry]));

    const processed = await processQueuedActions();

    expect(processed).toBe(1);
    expect(callApiSpy).toHaveBeenCalledTimes(1);
    expect(callApiSpy).toHaveBeenCalledWith({
      path: '/v1/tasks',
      method: 'POST',
      body: { note: 'legacy' },
      headers: undefined,
      query: undefined,
    });
    expect(getOfflineQueueSnapshot()).toHaveLength(0);
  });
});
