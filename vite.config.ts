import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(
    Boolean
  ),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Ensure service worker and manifest are copied to build output
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
      },
      output: {
        assetFileNames: (assetInfo) => {
          let extType = assetInfo.name.split(".").at(1);
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            extType = "img";
          }
          return `assets/${extType}/[name]-[hash][extname]`;
        },
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        // Ensure proper MIME types
        format: "es",
      },
    },
    // Generate source maps for better debugging
    sourcemap: mode === "development",
    // Optimize for PWA - use esbuild instead of terser to avoid dependency issues
    target: "esnext",
    minify: mode === "production" ? "esbuild" : false,
    assetsDir: "assets",
    // Ensure assets are properly referenced
    assetsInlineLimit: 0,
  },
  // Configure base for deployment - use absolute paths
  base: "/",
  publicDir: "public",
}));
