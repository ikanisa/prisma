const CACHE_NAME = 'prismaglow-cache-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

const BACKGROUND_SYNC_TAG = 'background-sync';
const OFFLINE_DB_NAME = 'prismaglow-bg-sync';
const OFFLINE_DB_VERSION = 1;
const OFFLINE_STORE_NAME = 'offline-actions';
const MAX_JOB_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 30 * 1000;
const MAX_RETRY_BACKOFF_MS = 12 * 60 * 60 * 1000; // 12 hours

function generateJobId() {
  if (self.crypto && typeof self.crypto.randomUUID === 'function') {
    return self.crypto.randomUUID();
  }
  return `offline-job-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeHeaders(headers) {
  if (!headers || typeof headers !== 'object') {
    return null;
  }

  const normalized = {};
  for (const key of Object.keys(headers)) {
    const value = headers[key];
    if (typeof value === 'string') {
      normalized[key] = value;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

function normalizeJobRecord(record) {
  if (!record || typeof record !== 'object') {
    return null;
  }

  const id = typeof record.id === 'string' && record.id.length > 0 ? record.id : generateJobId();
  const endpoint = typeof record.endpoint === 'string' && record.endpoint.length > 0 ? record.endpoint : null;
  let method = typeof record.method === 'string' && record.method.length > 0 ? record.method.toUpperCase() : null;
  if (!method && endpoint) {
    method = 'POST';
  }

  const retries = Number.isFinite(record.retries) ? record.retries : Number.parseInt(record.retries, 10);
  const timestamp = Number.isFinite(record.timestamp) ? record.timestamp : Number.parseInt(record.timestamp, 10);
  const nextAttemptAt = Number.isFinite(record.nextAttemptAt)
    ? record.nextAttemptAt
    : Number.parseInt(record.nextAttemptAt, 10);

  return {
    id,
    action: typeof record.action === 'string' ? record.action : 'unknown',
    data: 'data' in record ? record.data : null,
    timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
    retries: Number.isFinite(retries) && retries >= 0 ? retries : 0,
    endpoint,
    method,
    headers: normalizeHeaders(record.headers),
    lastError: typeof record.lastError === 'string' ? record.lastError : null,
    nextAttemptAt: Number.isFinite(nextAttemptAt) ? nextAttemptAt : null,
  };
}

function openQueueDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OFFLINE_STORE_NAME)) {
        db.createObjectStore(OFFLINE_STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

function attachTxHandlers(db, tx, { onResolve, onReject }) {
  let settled = false;
  const resolve = (value) => {
    if (settled) return;
    settled = true;
    db.close();
    if (onResolve) {
      onResolve(value);
    }
  };
  const reject = (error) => {
    if (settled) return;
    settled = true;
    db.close();
    if (onReject) {
      onReject(error);
    }
  };

  tx.oncomplete = () => resolve();
  tx.onabort = () => reject(tx.error || new Error('transaction aborted'));
  tx.onerror = () => reject(tx.error || new Error('transaction error'));
}

async function putOfflineJob(job) {
  const normalized = normalizeJobRecord(job);
  if (!normalized) {
    throw new Error('invalid_offline_job');
  }
  const db = await openQueueDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE_NAME, 'readwrite');
    attachTxHandlers(db, tx, { onResolve: () => resolve(), onReject: reject });
    const store = tx.objectStore(OFFLINE_STORE_NAME);
    const request = store.put(normalized);
    request.onerror = () => reject(request.error || new Error('failed to persist offline job'));
  });
}

async function deleteOfflineJob(id) {
  const db = await openQueueDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE_NAME, 'readwrite');
    attachTxHandlers(db, tx, { onResolve: () => resolve(), onReject: reject });
    const store = tx.objectStore(OFFLINE_STORE_NAME);
    const request = store.delete(id);
    request.onerror = () => reject(request.error || new Error('failed to delete offline job'));
  });
}

async function clearOfflineJobs() {
  const db = await openQueueDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE_NAME, 'readwrite');
    attachTxHandlers(db, tx, { onResolve: () => resolve(), onReject: reject });
    const store = tx.objectStore(OFFLINE_STORE_NAME);
    const request = store.clear();
    request.onerror = () => reject(request.error || new Error('failed to clear offline jobs'));
  });
}

async function getAllOfflineJobs() {
  const db = await openQueueDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE_NAME, 'readonly');
    const store = tx.objectStore(OFFLINE_STORE_NAME);
    let settled = false;

    const done = (value, error) => {
      if (settled) return;
      settled = true;
      db.close();
      if (error) {
        reject(error);
      } else {
        resolve(value);
      }
    };

    tx.oncomplete = () => {
      if (!settled) {
        done([]);
      }
    };
    tx.onabort = () => done([], tx.error || new Error('transaction aborted'));
    tx.onerror = () => done([], tx.error || new Error('transaction error'));

    const request = store.getAll();
    request.onsuccess = () => {
      if (Array.isArray(request.result)) {
        const normalized = request.result
          .map((record) => normalizeJobRecord(record))
          .filter((item) => Boolean(item));
        done(normalized);
        return;
      }
      done([]);
    };
    request.onerror = () => {
      done([], request.error || new Error('failed to read offline jobs'));
    };
  });
}

function computeNextAttemptAt(retries) {
  const delay = Math.min(RETRY_BASE_DELAY_MS * 2 ** Math.max(0, retries - 1), MAX_RETRY_BACKOFF_MS);
  return Date.now() + delay;
}

async function broadcastMessage(message) {
  try {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage(message);
    }
  } catch (error) {
    console.error('service_worker.broadcast_failed', error);
  }
}

async function processOfflineJobs(trigger) {
  const summary = { processed: 0, failed: 0, remaining: 0 };
  let allJobs;
  try {
    allJobs = await getAllOfflineJobs();
  } catch (error) {
    console.error('service_worker.queue_read_failed', error);
    return summary;
  }

  if (!Array.isArray(allJobs) || allJobs.length === 0) {
    return summary;
  }

  const now = Date.now();
  const eligible = allJobs
    .filter((job) => job && (!job.nextAttemptAt || job.nextAttemptAt <= now))
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  if (eligible.length === 0) {
    summary.remaining = allJobs.length;
    return summary;
  }

  for (const job of eligible) {
    if (!job || !job.id) {
      continue;
    }

    try {
      if (!job.endpoint) {
        throw new Error('missing_endpoint');
      }

      const headers = new Headers(job.headers || {});
      const method = job.method || 'POST';
      if (method !== 'GET' && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }

      const response = await fetch(job.endpoint, {
        method,
        headers,
        body: method === 'GET' ? undefined : JSON.stringify({ id: job.id, action: job.action, data: job.data }),
        credentials: 'include',
        keepalive: true,
      });

      if (!response.ok) {
        throw new Error(`request_failed_${response.status}`);
      }

      await deleteOfflineJob(job.id);
      summary.processed += 1;
      await broadcastMessage({
        type: 'OFFLINE_QUEUE_JOB_COMPLETED',
        payload: { id: job.id, action: job.action, trigger: trigger || 'background-sync' },
      });
    } catch (error) {
      const retries = (job.retries || 0) + 1;
      summary.failed += 1;

      if (retries >= MAX_JOB_RETRIES) {
        await deleteOfflineJob(job.id);
        await broadcastMessage({
          type: 'OFFLINE_QUEUE_JOB_FAILED',
          payload: {
            id: job.id,
            action: job.action,
            error: error instanceof Error ? error.message : String(error),
            retries,
            final: true,
            trigger: trigger || 'background-sync',
          },
        });
        continue;
      }

      const updatedJob = {
        ...job,
        retries,
        lastError: error instanceof Error ? error.message : String(error),
        nextAttemptAt: computeNextAttemptAt(retries),
      };

      await putOfflineJob(updatedJob);
      await broadcastMessage({
        type: 'OFFLINE_QUEUE_JOB_FAILED',
        payload: {
          id: job.id,
          action: job.action,
          error: error instanceof Error ? error.message : String(error),
          retries,
          nextAttemptAt: updatedJob.nextAttemptAt || null,
          trigger: trigger || 'background-sync',
        },
      });

      if (self.registration?.sync) {
        try {
          await self.registration.sync.register(BACKGROUND_SYNC_TAG);
        } catch (syncError) {
          console.error('service_worker.sync_register_failed', syncError);
        }
      }
    }
  }

  try {
    const remainingJobs = await getAllOfflineJobs();
    if (Array.isArray(remainingJobs)) {
      summary.remaining = remainingJobs.length;
    }
  } catch (error) {
    console.error('service_worker.queue_refresh_failed', error);
  }

  return summary;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return undefined;
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  const { data, ports } = event;
  if (!data || typeof data !== 'object') {
    return;
  }

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  const reply = (message) => {
    const port = ports && ports[0];
    if (port) {
      port.postMessage(message);
    } else if (event.source && 'postMessage' in event.source) {
      event.source.postMessage(message);
    }
  };

  if (data.type === 'OFFLINE_QUEUE_ENQUEUE') {
    const payload = data.payload || {};
    const job = normalizeJobRecord(payload);
    if (!job) {
      console.error('service_worker.queue_enqueue_invalid', payload);
      return;
    }

    event.waitUntil(
      putOfflineJob(job)
        .then(async () => {
          if (self.registration?.sync) {
            try {
              await self.registration.sync.register(BACKGROUND_SYNC_TAG);
            } catch (error) {
              console.error('service_worker.sync_register_failed', error);
            }
          }
        })
        .catch((error) => {
          console.error('service_worker.queue_enqueue_failed', error);
        }),
    );
    return;
  }

  if (data.type === 'OFFLINE_QUEUE_UPDATE') {
    const payload = data.payload || {};
    const job = normalizeJobRecord(payload);
    if (!job) {
      console.error('service_worker.queue_update_invalid', payload);
      return;
    }

    event.waitUntil(
      putOfflineJob(job).catch((error) => {
        console.error('service_worker.queue_update_failed', error);
      }),
    );
    return;
  }

  if (data.type === 'OFFLINE_QUEUE_REMOVE') {
    const id = data.payload?.id;
    if (!id) {
      return;
    }
    event.waitUntil(
      deleteOfflineJob(id).catch((error) => {
        console.error('service_worker.queue_remove_failed', error);
      }),
    );
    return;
  }

  if (data.type === 'OFFLINE_QUEUE_CLEAR') {
    event.waitUntil(
      clearOfflineJobs().catch((error) => {
        console.error('service_worker.queue_clear_failed', error);
      }),
    );
    return;
  }

  if (data.type === 'OFFLINE_QUEUE_PROCESS_NOW') {
    event.waitUntil(
      processOfflineJobs('client-request')
        .then((result) => {
          reply({ type: 'OFFLINE_QUEUE_PROCESS_RESULT', payload: result });
        })
        .catch((error) => {
          console.error('service_worker.queue_process_now_failed', error);
          reply({
            type: 'OFFLINE_QUEUE_PROCESS_RESULT',
            error: error instanceof Error ? error.message : String(error),
          });
        }),
    );
    return;
  }

  if (data.type === 'OFFLINE_QUEUE_REQUEST_SNAPSHOT') {
    event.waitUntil(
      getAllOfflineJobs()
        .then((jobs) => {
          reply({ type: 'OFFLINE_QUEUE_SNAPSHOT', payload: { jobs } });
        })
        .catch((error) => {
          console.error('service_worker.queue_snapshot_failed', error);
          reply({ type: 'OFFLINE_QUEUE_SNAPSHOT', error: error instanceof Error ? error.message : String(error) });
        }),
    );
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === BACKGROUND_SYNC_TAG) {
    event.waitUntil(processOfflineJobs('background-sync'));
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});
