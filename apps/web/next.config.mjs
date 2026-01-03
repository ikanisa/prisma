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
  // Use 'standalone' for faster builds, 'export' for Tauri
  output: process.env.TAURI_BUILD ? 'export' : 'standalone',
  distDir: process.env.TAURI_BUILD ? 'out' : '.next',
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
  assetPrefix: process.env.TAURI_BUILD ? './' : '',
  // Skip type checking in CI to speed up builds (run separately in CI pipeline)
  typescript: {
    ignoreBuildErrors: process.env.CI === 'true' || process.env.SKIP_TYPE_CHECK === 'true',
  },
  // Skip ESLint during builds (run separately via `pnpm lint`)
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://prisma-glow.pages.dev',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
  },
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default withPWA(nextConfig);
