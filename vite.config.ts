import path from 'path';
import { createRequire } from 'module';
import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
const enablePwa = process.env.VITE_ENABLE_PWA !== 'false';

const require = createRequire(import.meta.url);
const loadLovableTagger = (): PluginOption | null => {
  try {
    const { componentTagger } = require('lovable-tagger') as { componentTagger?: () => PluginOption };
    return typeof componentTagger === 'function' ? componentTagger() : null;
  } catch {
    return null;
  }
};

export default defineConfig(({ mode }) => {
  const plugins: PluginOption[] = [react()];
  if (mode === 'development') {
    const tagger = loadLovableTagger();
    if (tagger) {
      plugins.push(tagger);
    }
  }

  return {
    define: {
      __ENABLE_PWA__: enablePwa,
    },
    server: {
      host: '::',
      port: 8080,
    },
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@prisma-glow/logger': path.resolve(__dirname, './packages/logger/src/index.ts'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1500,
    },
  };
});
