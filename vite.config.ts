import path from 'path';
import { createRequire } from 'module';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
const enablePwa = process.env.VITE_ENABLE_PWA !== 'false';

const require = createRequire(import.meta.url);
const loadLovableTagger = () => {
  try {
    const { componentTagger } = require('lovable-tagger');
    return componentTagger as () => unknown;
  } catch {
    return undefined;
  }
};

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
    mode === 'development' && loadLovableTagger()?.(),
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
