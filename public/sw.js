
const CACHE_NAME = 'wavepay-v1.0.0';
const STATIC_CACHE = 'wavepay-static-v1.0.0';
const DYNAMIC_CACHE = 'wavepay-dynamic-v1.0.0';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/get-paid',
  '/pay',
  '/manifest.json',
  '/favicon.ico'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\//,
  /supabase\.co/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => 
              cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE
            )
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      self.clients.claim()
    ])
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Return cached version if available
      if (cachedResponse) {
        console.log('[SW] Serving from cache:', request.url);
        return cachedResponse;
      }

      // Fetch from network
      return fetch(request).then((response) => {
        // Only cache successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone response for caching
        const responseToCache = response.clone();

        // Determine cache strategy
        const shouldCacheDynamic = 
          STATIC_ASSETS.includes(url.pathname) ||
          API_CACHE_PATTERNS.some(pattern => pattern.test(request.url)) ||
          request.url.includes('supabase.co');

        if (shouldCacheDynamic) {
          caches.open(DYNAMIC_CACHE).then((cache) => {
            console.log('[SW] Caching dynamic asset:', request.url);
            cache.put(request, responseToCache);
          });
        }

        return response;
      }).catch((error) => {
        console.log('[SW] Network fetch failed:', error);
        
        // Serve offline fallback for navigation requests
        if (request.destination === 'document') {
          return caches.match('/');
        }
        
        // Return error for other requests
        throw error;
      });
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'payment-request-sync') {
    event.waitUntil(syncOfflinePaymentRequests());
  }
});

// Sync offline payment requests when back online
async function syncOfflinePaymentRequests() {
  try {
    const db = await openIndexedDB();
    const offlineRequests = await getOfflineRequests(db);
    
    for (const request of offlineRequests) {
      try {
        // Attempt to sync with server
        await fetch('/api/payment-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request.data)
        });
        
        // Remove from offline storage on success
        await removeOfflineRequest(db, request.id);
        console.log('[SW] Synced offline request:', request.id);
      } catch (error) {
        console.log('[SW] Failed to sync request:', request.id, error);
      }
    }
  } catch (error) {
    console.log('[SW] Background sync failed:', error);
  }
}

// IndexedDB helpers for offline storage
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('WavePayOffline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('paymentRequests')) {
        db.createObjectStore('paymentRequests', { keyPath: 'id' });
      }
    };
  });
}

function getOfflineRequests(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['paymentRequests'], 'readonly');
    const store = transaction.objectStore('paymentRequests');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function removeOfflineRequest(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['paymentRequests'], 'readwrite');
    const store = transaction.objectStore('paymentRequests');
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
