import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { componentTagger } from 'lovable-tagger';

// https://vitejs.dev/config/
const enablePwa = process.env.VITE_ENABLE_PWA !== 'false';

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
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
}));
