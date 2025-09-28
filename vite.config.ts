import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { componentTagger } from 'lovable-tagger';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
const enablePwa = process.env.VITE_ENABLE_PWA === 'true';

export default defineConfig(({ mode }) => ({
  define: {
    __ENABLE_PWA__: enablePwa,
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    enablePwa
      ? VitePWA({
          registerType: 'autoUpdate',
          manifest: false,
          includeAssets: ['favicon.ico', 'robots.txt', 'manifest.json'],
          devOptions: {
            enabled: mode === 'development',
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
            runtimeCaching: [
              {
                urlPattern: ({ request }) => request.mode === 'navigate',
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'pages',
                  networkTimeoutSeconds: 5,
                  expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 },
                },
              },
              {
                urlPattern: ({ request }) =>
                  request.destination === 'style' ||
                  request.destination === 'script' ||
                  request.destination === 'worker',
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'assets',
                  expiration: { maxEntries: 60, maxAgeSeconds: 24 * 60 * 60 },
                },
              },
              {
                urlPattern: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith('/v1/'),
                handler: 'NetworkFirst',
                method: 'GET',
                options: {
                  cacheName: 'api-cache',
                  networkTimeoutSeconds: 5,
                  expiration: { maxEntries: 50, maxAgeSeconds: 60 },
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
            ],
          },
        })
      : null,
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      ...(enablePwa
        ? {}
        : {
            'virtual:pwa-register': path.resolve(
              __dirname,
              './src/utils/pwa-register-stub.ts',
            ),
          }),
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
}));
