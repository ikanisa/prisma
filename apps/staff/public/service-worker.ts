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
    cacheName: 'staff-html-cache',
    networkTimeoutSeconds: 10,
    plugins: [new ExpirationPlugin({ maxEntries: 50 })],
  }),
);

registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'script',
  new StaleWhileRevalidate({
    cacheName: 'staff-static-assets',
  }),
);

registerRoute(
  ({ request }) => request.destination === 'image' || request.destination === 'font',
  new CacheFirst({
    cacheName: 'staff-media',
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  }),
);

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'staff-api',
    networkTimeoutSeconds: 5,
  }),
);

setCatchHandler(async ({ event }) => {
  if (event.request.destination === 'document') {
    const cache = await caches.open('staff-html-cache');
    const cachedResponse = await cache.match(OFFLINE_FALLBACK);

    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response(
      '<!doctype html><title>Offline</title><body><h1>You are offline</h1><p>Reconnect to sync your work.</p></body>',
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
