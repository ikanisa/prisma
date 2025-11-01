import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

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
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@prisma-glow/logger': path.resolve(__dirname, './packages/logger/src/index.ts'),
        '@prisma-glow/logging': path.resolve(__dirname, './packages/logging/src/index.ts'),
        '@prisma-glow/otel': path.resolve(__dirname, './services/otel/src/index.ts'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1500,
    },
  };
});
