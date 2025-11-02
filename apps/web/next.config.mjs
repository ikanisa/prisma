import bundleAnalyzer from '@next/bundle-analyzer';
import nextPWA from 'next-pwa';

const withPWA = nextPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/],
});

const analyzerMode = process.env.ANALYZE_MODE === 'json' ? 'json' : 'static';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
  analyzerMode,
});

const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
];

export default withBundleAnalyzer(
  withPWA({
    reactStrictMode: true,
    output: 'standalone',
    images: {
      unoptimized: true,
      remotePatterns: [
        { protocol: 'https', hostname: 'images.prismaglow.test' },
        { protocol: 'https', hostname: 'cdn.prismaglow.test' },
      ],
    },
    typescript: {
      ignoreBuildErrors: process.env.ANALYZE === 'true',
    },
    eslint: {
      ignoreDuringBuilds: process.env.ANALYZE === 'true',
    },
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: securityHeaders,
        },
      ];
    },
  }),
);
