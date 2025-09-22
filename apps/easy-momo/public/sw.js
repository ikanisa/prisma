
const CACHE_NAME = 'wavepay-v1.0.1';
const STATIC_CACHE = 'wavepay-static-v1.0.1';
const DYNAMIC_CACHE = 'wavepay-dynamic-v1.0.1';
const SCANNER_CACHE = 'wavepay-scanner-v1.0.1';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/get-paid',
  '/pay',
  '/manifest.json',
  '/favicon.ico'
];

// Scanner-specific assets to prioritize
const SCANNER_ASSETS = [
  '/pay',
  '/src/components/PayScreen.tsx',
  '/src/components/PayScreen/SmartQRScanner.tsx',
  '/src/hooks/useQRScanner.ts',
  '/src/hooks/useAIProcessing.ts',
  '/src/hooks/useAmbientLightSensor.ts'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\//,
  /supabase\.co/
];

// Install event - cache static assets with scanner priority
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker with scanner optimizations...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Pre-cache scanner assets for instant loading
      caches.open(SCANNER_CACHE).then((cache) => {
        console.log('[SW] Pre-caching scanner assets');
        return cache.addAll(SCANNER_ASSETS.filter(asset => !asset.startsWith('/src')));
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
              cacheName !== DYNAMIC_CACHE &&
              cacheName !== SCANNER_CACHE
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

// Fetch event - serve from cache with network fallback and scanner optimizations
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') return;

  // Scanner route optimization - prioritize cache for instant loading
  if (url.pathname === '/pay') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[SW] Serving scanner page from cache for instant load');
          // Update cache in background
          fetch(request).then(response => {
            if (response && response.status === 200) {
              caches.open(SCANNER_CACHE).then(cache => {
                cache.put(request, response.clone());
              });
            }
          }).catch(() => {}); // Silent fail for background update
          return cachedResponse;
        }
        
        // Fallback to network
        return fetch(request).then(response => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(SCANNER_CACHE).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        }).catch(() => {
          // Return cached home page as fallback
          return caches.match('/');
        });
      })
    );
    return;
  }

  // Standard caching strategy for other requests
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
  } else if (event.tag === 'qr-scan-sync') {
    event.waitUntil(syncOfflineQRScans());
  }
});

// Enhanced sync for QR scan data
async function syncOfflineQRScans() {
  try {
    const db = await openIndexedDB();
    const offlineScans = await getOfflineScans(db);
    
    for (const scan of offlineScans) {
      try {
        // Attempt to sync scan data with server
        await fetch('/api/qr-scans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scan.data)
        });
        
        // Remove from offline storage on success
        await removeOfflineScan(db, scan.id);
        console.log('[SW] Synced offline scan:', scan.id);
      } catch (error) {
        console.log('[SW] Failed to sync scan:', scan.id, error);
      }
    }
  } catch (error) {
    console.log('[SW] QR scan sync failed:', error);
  }
}

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

// Enhanced IndexedDB helpers for offline storage
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('WavePayOffline', 2);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Payment requests store
      if (!db.objectStoreNames.contains('paymentRequests')) {
        db.createObjectStore('paymentRequests', { keyPath: 'id' });
      }
      
      // QR scans store for offline caching
      if (!db.objectStoreNames.contains('qrScans')) {
        const scanStore = db.createObjectStore('qrScans', { keyPath: 'id' });
        scanStore.createIndex('timestamp', 'timestamp');
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

function getOfflineScans(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['qrScans'], 'readonly');
    const store = transaction.objectStore('qrScans');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function removeOfflineScan(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['qrScans'], 'readwrite');
    const store = transaction.objectStore('qrScans');
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Camera resource management message handling
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CAMERA_CLEANUP') {
    console.log('[SW] Received camera cleanup signal');
    // Perform any necessary cleanup operations
    // This can be extended for specific camera resource management
  }
});
