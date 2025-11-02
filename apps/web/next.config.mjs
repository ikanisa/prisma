import bundleAnalyzer from '@next/bundle-analyzer';
import nextPWA from 'next-pwa';

const withPWA = nextPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/],
});

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
  analyzerMode: 'static',
  reportFilename: 'analyze/client.html',
  statsFilename: 'analyze/client-stats.json',
  generateStatsFile: true,
  serverAnalyzerConfig: {
    analyzerMode: 'static',
    reportFilename: 'analyze/nodejs.html',
    openAnalyzer: false,
  },
  browserAnalyzerConfig: {
    analyzerMode: 'static',
    reportFilename: 'analyze/client.html',
    openAnalyzer: false,
  },
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
