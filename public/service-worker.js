
const CACHE_VERSION = 'mmpwa-v1';
const CACHE_ASSETS = [
  '/',
  '/index.html',
  '/main.css',
  '/app.js',
  '/favicon.ico',
  // add generated assets, icons, banners below as needed:
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // fallback banners
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(CACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() =>
        // fallback shell: show cached home page or default offline html
        caches.match('/index.html')
      );
    })
  );
});
