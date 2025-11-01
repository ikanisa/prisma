/// <reference lib="WebWorker" />

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute, setCatchHandler } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST?: Array<{ url: string; revision: string }>;
};

const OFFLINE_FALLBACK = '/offline.html';

clientsClaim();
self.skipWaiting();
cleanupOutdatedCaches();

const precacheManifest = self.__WB_MANIFEST ?? [];
precacheAndRoute([...precacheManifest, { url: OFFLINE_FALLBACK, revision: '1' }]);

registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'admin-html-cache',
    networkTimeoutSeconds: 10,
    plugins: [new ExpirationPlugin({ maxEntries: 80 })],
  }),
);

registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'script',
  new StaleWhileRevalidate({
    cacheName: 'admin-static-assets',
  }),
);

registerRoute(
  ({ request }) => request.destination === 'image' || request.destination === 'font',
  new CacheFirst({
    cacheName: 'admin-media',
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 14 })],
  }),
);

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'admin-api',
    networkTimeoutSeconds: 6,
  }),
);

setCatchHandler(async ({ event }) => {
  if (event.request.destination === 'document') {
    const cache = await caches.open('admin-html-cache');
    const cachedResponse = await cache.match(OFFLINE_FALLBACK);

    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response(
      '<!doctype html><title>Offline</title><body><h1>Offline mode</h1><p>We will sync once you are online.</p></body>',
      {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      },
    );
  }

  return Response.error();
});

self.addEventListener('message', (event) => {
  if (event.data && typeof event.data === 'object' && 'type' in event.data) {
    if ((event.data as { type: string }).type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  }
});
