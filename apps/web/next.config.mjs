import withPWAInit from '@ducanh2912/next-pwa';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
  workboxOptions: {
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'supabase-api',
          expiration: { maxEntries: 64, maxAgeSeconds: 3600 },
          networkTimeoutSeconds: 10,
        },
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'images',
          expiration: { maxEntries: 100, maxAgeSeconds: 2592000 },
        },
      },
      {
        urlPattern: /\.(?:woff|woff2|ttf|otf|eot)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'fonts',
          expiration: { maxEntries: 50, maxAgeSeconds: 31536000 },
        },
      },
      {
        urlPattern: /^https:\/\/.*\/api\/.*/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'api-cache',
          expiration: { maxEntries: 50, maxAgeSeconds: 300 },
        },
      },
      {
        urlPattern: /^https:\/\/.*\/_next\/static\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'next-static',
          expiration: { maxEntries: 200, maxAgeSeconds: 31536000 },
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // For Tauri desktop builds, use 'export'. For Cloudflare Pages, use default (no output specified).
  // @cloudflare/next-on-pages does NOT support 'standalone' mode.
  ...(process.env.TAURI_BUILD ? { output: 'export', distDir: 'out', assetPrefix: './' } : {}),
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
  // Skip type checking during builds (run separately via `pnpm typecheck`)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Skip ESLint during builds (run separately via `pnpm lint`)
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
  webpack: (config, { isServer }) => {
    // Ensure webpack resolves the @ alias
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': __dirname,
    };
    return config;
  },
  // Disable experimental features that slow down builds
  experimental: {
    // optimizeCss can be slow, disable for faster builds
    optimizeCss: false,
  },
  // Reduce bundle size by excluding server components from client bundle
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
    '@radix-ui/react-icons': {
      transform: '@radix-ui/react-icons/dist/{{member}}',
    },
  },
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Performance headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
