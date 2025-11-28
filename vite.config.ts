import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
const enablePwa = process.env.VITE_ENABLE_PWA !== 'false';

export default defineConfig(({ mode }) => {
  return {
    define: {
      __ENABLE_PWA__: enablePwa,
    },
    server: {
      host: '::',
      port: 8080,
    },
    plugins: [
      react(),
      // Bundle analyzer - generates stats.html after build
      mode === 'analyze' && visualizer({
        filename: './dist/stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap',
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@services': path.resolve(__dirname, './services'),
        '@prisma-glow/logger': path.resolve(__dirname, './packages/logger/src/index.ts'),
        '@prisma-glow/logging': path.resolve(__dirname, './packages/logging/src/index.ts'),
        '@prisma-glow/otel': path.resolve(__dirname, './services/otel/src/index.ts'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks for better caching
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
            'query-vendor': ['@tanstack/react-query'],
            'chart-vendor': ['recharts'],
          },
        },
      },
    },
  };
});
