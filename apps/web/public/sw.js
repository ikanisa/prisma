const PRECACHE = 'prisma-precache-v2';
const RUNTIME = 'prisma-runtime';

const PRECACHE_URLS = [
  '/',
  '/dashboard',
  '/offline.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => ![PRECACHE, RUNTIME].includes(cacheName))
          .map((cacheName) => caches.delete(cacheName))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const { request } = event;
  const url = new URL(request.url);

  if (PRECACHE_URLS.includes(url.pathname)) {
    event.respondWith(caches.match(request));
    return;
  }

  if (url.origin === location.origin && url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.open(RUNTIME).then((cache) =>
      fetch(request)
        .then((response) => {
          cache.put(request, response.clone());
          return response;
        })
        .catch(async () => (await cache.match(request)) ?? caches.match('/offline.html'))
    )
  );
});
